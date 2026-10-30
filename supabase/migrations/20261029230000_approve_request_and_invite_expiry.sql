-- Atomizar aprobación de reservas + caducidad de invitaciones.
-- doctor_id siempre desde get_my_clinic_id(); el cliente no elige tenant.
--
-- Invitaciones ya pendientes: expires_at = created_at + 14 días
-- (NO now()+14: eso reviviría invitaciones viejas).

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- ============================================================
-- 0a. is_clinic_manager: SECURITY DEFINER (usada en policies RLS)
-- ============================================================
-- Hoy solo lee la fila del llamador (p.id = auth.uid()), así que INVOKER
-- suele funcionar. DEFINER + search_path evita recursión/vacío si alguien
-- mete esta helper en una policy de profiles más adelante.

CREATE OR REPLACE FUNCTION public.is_clinic_manager(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND (
         p.id = p_clinic_id
         OR (p.clinic_id = p_clinic_id AND p.role IN ('owner', 'admin'))
       )
  );
$function$;

REVOKE ALL ON FUNCTION public.is_clinic_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_clinic_manager(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_clinic_manager(uuid) TO service_role;

-- ============================================================
-- 0. profiles: REVOKE UPDATE de tabla + GRANT por columnas
-- ============================================================

DO $$
BEGIN
  BEGIN
    REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC;
    REVOKE UPDATE ON TABLE public.profiles FROM anon;
    REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'REVOKE UPDATE profiles: %', SQLERRM;
  END;

  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'theme_color'
    ) THEN
      GRANT UPDATE (
        full_name, clinic_name, phone, currency, locale, theme_color,
        has_completed_onboarding, updated_at
      ) ON TABLE public.profiles TO authenticated;
    ELSE
      GRANT UPDATE (
        full_name, clinic_name, phone, currency, locale,
        has_completed_onboarding, updated_at
      ) ON TABLE public.profiles TO authenticated;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'GRANT columnas profiles: %', SQLERRM;
  END;
END $$;

-- ============================================================
-- 1. Invitaciones: expires_at (14 días desde created_at)
-- ============================================================

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.team_invitations
   SET expires_at = coalesce(created_at, now()) + interval '14 days'
 WHERE expires_at IS NULL;

ALTER TABLE public.team_invitations
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '14 days');

CREATE OR REPLACE FUNCTION public.redeem_team_invitation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.team_invitations%ROWTYPE;
  v_updated int;
  v_onboarded boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT lower(u.email)
    INTO v_email
    FROM auth.users u
   WHERE u.id = v_uid
     AND u.email_confirmed_at IS NOT NULL
     AND (
       auth.jwt() ->> 'email' IS NULL
       OR lower(auth.jwt() ->> 'email') = lower(u.email)
     );

  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  SELECT coalesce(p.has_completed_onboarding, false)
    INTO v_onboarded
    FROM public.profiles p
   WHERE p.id = v_uid
     AND p.clinic_id IS NULL
     AND lower(coalesce(p.role, 'owner')) = 'owner';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_onboarded THEN
    RAISE EXCEPTION 'Ya tienes una clínica configurada; no puedes aceptar esta invitación. Usa otra cuenta o contacta soporte.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.patients p WHERE p.doctor_id = v_uid LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.doctor_id = v_uid LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.clinic_id = v_uid AND s.status IN ('active', 'trial') LIMIT 1)
  THEN
    RAISE EXCEPTION 'Esta cuenta ya tiene pacientes, citas o suscripción propia. No puede unirse a otra clínica. Regístrate con un correo nuevo o contacta soporte.';
  END IF;

  SELECT *
    INTO v_invite
    FROM public.team_invitations
   WHERE lower(email) = v_email
     AND status = 'pending'
     AND role IN ('admin', 'assistant', 'receptionist')
     AND (expires_at IS NULL OR expires_at > now())
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
     SET clinic_id = v_invite.clinic_id,
         role = v_invite.role,
         updated_at = now()
   WHERE id = v_uid
     AND clinic_id IS NULL
     AND lower(coalesce(role, 'owner')) = 'owner';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.team_invitations
     SET status = 'accepted'
   WHERE id = v_invite.id
     AND status = 'pending';

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_team_invitation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_team_invitation() FROM anon;
GRANT EXECUTE ON FUNCTION public.redeem_team_invitation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_team_invitation() TO service_role;

-- ============================================================
-- 1b. set_team_member_role: endurecer validaciones (misma clínica)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_team_member_role(p_member_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_my_clinic uuid;
  v_target_clinic uuid;
  v_target_role text;
  v_updated int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: no autenticado' USING ERRCODE = 'DL403';
  END IF;
  IF p_member_id IS NULL OR p_member_id = v_caller THEN
    RAISE EXCEPTION 'FORBIDDEN: no puedes cambiar tu propio rol' USING ERRCODE = 'DL403';
  END IF;
  IF p_role NOT IN ('admin', 'assistant', 'receptionist') THEN
    RAISE EXCEPTION 'FORBIDDEN: rol no permitido' USING ERRCODE = 'DL403';
  END IF;

  v_my_clinic := public.get_my_clinic_id();
  v_caller_role := lower(btrim(coalesce(public.get_my_role(), '')));

  IF v_my_clinic IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: sin clínica' USING ERRCODE = 'DL403';
  END IF;

  IF NOT public.is_clinic_manager(v_my_clinic) THEN
    RAISE EXCEPTION 'FORBIDDEN: no autorizado' USING ERRCODE = 'DL403';
  END IF;

  SELECT p.clinic_id, lower(btrim(p.role))
    INTO v_target_clinic, v_target_role
    FROM public.profiles p
   WHERE p.id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: miembro no encontrado' USING ERRCODE = 'DL404';
  END IF;

  IF p_member_id = v_my_clinic OR v_target_clinic IS NULL OR v_target_role = 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN: no puedes cambiar el rol del propietario' USING ERRCODE = 'DL403';
  END IF;

  IF v_target_clinic IS DISTINCT FROM v_my_clinic THEN
    RAISE EXCEPTION 'FORBIDDEN: el miembro no pertenece a tu clínica' USING ERRCODE = 'DL403';
  END IF;

  -- Solo el owner gestiona admins (ascender a admin o modificar un admin).
  -- Un admin solo puede asignar assistant/receptionist a no-admins.
  IF v_caller_role = 'admin' THEN
    IF p_role = 'admin' OR v_target_role = 'admin' THEN
      RAISE EXCEPTION 'FORBIDDEN: solo el propietario gestiona administradores'
        USING ERRCODE = 'DL403';
    END IF;
  ELSIF v_caller_role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'FORBIDDEN: no autorizado' USING ERRCODE = 'DL403';
  END IF;

  UPDATE public.profiles
     SET role = p_role,
         updated_at = now()
   WHERE id = p_member_id
     AND clinic_id = v_my_clinic
     AND lower(btrim(role)) IS DISTINCT FROM 'owner';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'NOT_FOUND: no se pudo actualizar el rol' USING ERRCODE = 'DL404';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_team_member_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_team_member_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid, text) TO service_role;

-- ============================================================
-- 2. Helpers + columnas de trazabilidad
-- ============================================================

ALTER TABLE public.appointment_requests
  ADD COLUMN IF NOT EXISTS approved_patient_id uuid,
  ADD COLUMN IF NOT EXISTS approved_appointment_id uuid,
  ADD COLUMN IF NOT EXISTS possible_duplicates boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_candidate_ids uuid[] DEFAULT '{}'::uuid[];

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS needs_duplicate_review boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS duplicate_candidate_ids uuid[] DEFAULT '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.normalize_person_name(p_name text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT lower(btrim(regexp_replace(
    extensions.unaccent(coalesce(p_name, '')),
    '\s+', ' ', 'g'
  )));
$function$;

CREATE OR REPLACE FUNCTION public.normalize_phone_digits(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
$function$;

CREATE OR REPLACE FUNCTION public.phones_match(a text, b text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.normalize_phone_digits(a) IS NULL
      OR public.normalize_phone_digits(b) IS NULL THEN false
    WHEN public.normalize_phone_digits(a) = public.normalize_phone_digits(b) THEN true
    WHEN length(public.normalize_phone_digits(a)) >= 8
     AND length(public.normalize_phone_digits(b)) >= 8
     AND right(public.normalize_phone_digits(a), 8) = right(public.normalize_phone_digits(b), 8) THEN true
    ELSE false
  END;
$function$;

REVOKE ALL ON FUNCTION public.normalize_person_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_phone_digits(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.phones_match(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_person_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_phone_digits(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.phones_match(text, text) TO authenticated;

-- ============================================================
-- 3. RPC atómico: approve_appointment_request
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_appointment_request(
  p_request_id uuid,
  p_force_overlap boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_clinic uuid;
  v_req public.appointment_requests%ROWTYPE;
  v_patient_id uuid;
  v_appointment_id uuid;
  v_match_count int := 0;
  v_candidate_ids uuid[] := ARRAY[]::uuid[];
  v_possible_duplicates boolean := false;
  v_matched_by text := 'created';
  v_conflict_id uuid;
  v_norm_name text;
  v_norm_email text;
  v_updated int;
  v_lock1 int;
  v_lock2 int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: no autenticado' USING ERRCODE = 'DL403';
  END IF;

  v_clinic := public.get_my_clinic_id();
  v_role := lower(btrim(coalesce(public.get_my_role(), '')));

  IF v_clinic IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: sin clínica' USING ERRCODE = 'DL403';
  END IF;

  IF v_role NOT IN ('owner', 'admin', 'receptionist') THEN
    RAISE EXCEPTION 'FORBIDDEN: tu rol no puede aprobar reservas' USING ERRCODE = 'DL403';
  END IF;

  -- Solo owner/admin pueden forzar solape
  IF coalesce(p_force_overlap, false) AND v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'FORBIDDEN: no puedes forzar solapes de agenda' USING ERRCODE = 'DL403';
  END IF;

  -- Lock de dos enteros (menos colisión que un solo hashtext)
  v_lock1 := hashtext('dientelink:approve');
  v_lock2 := hashtext(v_clinic::text);
  PERFORM pg_advisory_xact_lock(v_lock1, v_lock2);

  -- Tenant: id + doctor_id = clínica del llamador (anti cross-clinic)
  SELECT *
    INTO v_req
    FROM public.appointment_requests
   WHERE id = p_request_id
     AND doctor_id = v_clinic
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND: solicitud no encontrada' USING ERRCODE = 'DL404';
  END IF;

  -- Idempotente: ids persistidos en la solicitud
  IF v_req.status = 'approved' THEN
    RETURN jsonb_build_object(
      'request_id', v_req.id,
      'status', 'approved',
      'idempotent', true,
      'patient_id', v_req.approved_patient_id,
      'appointment_id', v_req.approved_appointment_id,
      'possible_duplicates', coalesce(v_req.possible_duplicates, false),
      'candidate_ids', to_jsonb(coalesce(v_req.duplicate_candidate_ids, ARRAY[]::uuid[])),
      'matched_by', 'existing'
    );
  END IF;

  IF v_req.status IS DISTINCT FROM 'pending' THEN
    -- DL410 = estado inválido (ya procesada / rechazada). Distinto de DL409 conflicto.
    RAISE EXCEPTION 'NOT_PENDING: la solicitud ya no está pendiente (%)', v_req.status
      USING ERRCODE = 'DL410';
  END IF;

  -- Solape por clínica (modelo actual: 1 agenda = doctor_id del tenant).
  -- Excluye Eliminada / cancelled / cancelled variants.
  IF NOT coalesce(p_force_overlap, false) THEN
    SELECT a.id
      INTO v_conflict_id
      FROM public.appointments a
     WHERE a.doctor_id = v_clinic
       AND a.date = v_req.requested_date
       AND a.time = v_req.requested_time
       AND a.deleted_at IS NULL
       AND lower(coalesce(a.status, '')) NOT IN ('eliminada', 'cancelled', 'canceled', 'rejected')
     LIMIT 1;

    IF v_conflict_id IS NOT NULL THEN
      RAISE EXCEPTION 'APPOINTMENT_CONFLICT: horario ocupado'
        USING ERRCODE = 'DL409';
    END IF;
  END IF;

  v_norm_name := public.normalize_person_name(v_req.patient_name);
  v_norm_email := nullif(lower(btrim(coalesce(v_req.patient_email, ''))), '');

  SELECT coalesce(array_agg(p.id), ARRAY[]::uuid[]), count(*)::int
    INTO v_candidate_ids, v_match_count
    FROM public.patients p
   WHERE p.doctor_id = v_clinic
     AND p.deleted_at IS NULL
     AND (
       (v_norm_email IS NOT NULL AND lower(btrim(coalesce(p.email, ''))) = v_norm_email)
       OR (
         public.phones_match(p.phone, v_req.patient_phone)
         AND public.normalize_person_name(p.full_name) = v_norm_name
         AND v_norm_name <> ''
       )
     );

  IF v_match_count = 1 THEN
    v_patient_id := v_candidate_ids[1];
    v_matched_by := 'linked';
  ELSIF v_match_count > 1 THEN
    v_possible_duplicates := true;
    v_matched_by := 'created_ambiguous';
    v_patient_id := gen_random_uuid();
    INSERT INTO public.patients (
      id, doctor_id, full_name, phone, email, gender, consent_signed,
      needs_duplicate_review, duplicate_candidate_ids
    ) VALUES (
      v_patient_id,
      v_clinic,
      btrim(v_req.patient_name),
      nullif(btrim(coalesce(v_req.patient_phone, '')), ''),
      v_norm_email,
      NULL,
      false,
      true,
      v_candidate_ids
    );
  ELSE
    v_patient_id := gen_random_uuid();
    v_matched_by := 'created';
    INSERT INTO public.patients (
      id, doctor_id, full_name, phone, email, gender, consent_signed
    ) VALUES (
      v_patient_id,
      v_clinic,
      btrim(v_req.patient_name),
      nullif(btrim(coalesce(v_req.patient_phone, '')), ''),
      v_norm_email,
      NULL,
      false
    );
  END IF;

  v_appointment_id := gen_random_uuid();
  INSERT INTO public.appointments (
    id, doctor_id, patient_id, patient_name, phone_number,
    date, time, type, status, reminder_status
  ) VALUES (
    v_appointment_id,
    v_clinic,
    v_patient_id,
    btrim(v_req.patient_name),
    nullif(btrim(coalesce(v_req.patient_phone, '')), ''),
    v_req.requested_date,
    v_req.requested_time,
    coalesce(nullif(btrim(v_req.appointment_type), ''), 'Consulta'),
    'Programada',
    'not_sent'
  );

  UPDATE public.appointment_requests
     SET status = 'approved',
         responded_at = now(),
         approved_patient_id = v_patient_id,
         approved_appointment_id = v_appointment_id,
         possible_duplicates = v_possible_duplicates,
         duplicate_candidate_ids = CASE
           WHEN v_possible_duplicates THEN v_candidate_ids
           ELSE '{}'::uuid[]
         END
   WHERE id = v_req.id
     AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'NOT_PENDING: la solicitud cambió durante la aprobación'
      USING ERRCODE = 'DL410';
  END IF;

  RETURN jsonb_build_object(
    'request_id', v_req.id,
    'status', 'approved',
    'idempotent', false,
    'patient_id', v_patient_id,
    'appointment_id', v_appointment_id,
    'possible_duplicates', v_possible_duplicates,
    'candidate_ids', to_jsonb(v_candidate_ids),
    'matched_by', v_matched_by
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.approve_appointment_request(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_appointment_request(uuid, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_appointment_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_appointment_request(uuid, boolean) TO service_role;
