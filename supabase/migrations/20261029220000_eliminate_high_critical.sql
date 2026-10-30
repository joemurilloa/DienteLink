-- Cierra hallazgos CRÍTICOS y ALTOS restantes (auditoría vibecoding / seguridad).
-- 1) Elimina bypass GUC de privilegios de perfil
-- 2) Endurece redeem_team_invitation (anti-hijack de owners)
-- 3) get_my_clinic_id() consistente + RLS multi-tenant estricto
-- 4) INSERT público de reservas acotado
-- 5) Policies TO authenticated (no PUBLIC) + FORCE RLS
-- 6) Storage payment-receipts privado
-- 7) Vault: no reinsertar publishable key en git

-- ============================================================
-- 1. get_my_clinic_id: dueño = su id; staff = clinic_id
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT coalesce(clinic_id, id)
    FROM public.profiles
   WHERE id = auth.uid();
$function$;

REVOKE ALL ON FUNCTION public.get_my_clinic_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_clinic_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_clinic_id() TO service_role;

-- ============================================================
-- 2. protect_profile_privileges: sin GUC spoofable
-- ============================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo el dueño de funciones SECURITY DEFINER (postgres/supabase_admin)
  -- o service_role pueden mutar role/clinic_id. set_config ya no abre el candado.
  IF current_user IN ('postgres', 'supabase_admin', 'supabase_storage_admin')
     OR coalesce(current_setting('role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'owner';
    NEW.clinic_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id THEN
    RAISE EXCEPTION 'No puedes cambiar tu rol ni tu clínica';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM anon;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM authenticated;

-- Defensa en profundidad: authenticated no puede UPDATE de role/clinic_id
DO $$
BEGIN
  BEGIN
    REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC;
    REVOKE UPDATE ON TABLE public.profiles FROM anon;
    REVOKE UPDATE (role, clinic_id) ON TABLE public.profiles FROM authenticated;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudieron ajustar grants de profiles: %', SQLERRM;
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
    RAISE WARNING 'Grant de columnas profiles: %', SQLERRM;
  END;
END $$;

-- ============================================================
-- 3. redeem_team_invitation: anti-hijack
-- ============================================================

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

  -- Dueños con clínica real (datos) no pueden ser absorbidos por otra clínica.
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
    RAISE EXCEPTION 'Ya tienes una clínica configurada; no puedes aceptar esta invitación';
  END IF;

  IF EXISTS (SELECT 1 FROM public.patients p WHERE p.doctor_id = v_uid LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.doctor_id = v_uid LIMIT 1)
     OR EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.clinic_id = v_uid AND s.status IN ('active', 'trial') LIMIT 1)
  THEN
    RAISE EXCEPTION 'Ya tienes datos de clínica; no puedes unirte a otro equipo con esta cuenta';
  END IF;

  SELECT *
    INTO v_invite
    FROM public.team_invitations
   WHERE lower(email) = v_email
     AND status = 'pending'
     AND role IN ('admin', 'assistant', 'receptionist')
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

-- Alinear guard de appointment_requests con tenant estricto
CREATE OR REPLACE FUNCTION public.guard_appointment_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.doctor_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.doctor_id) THEN
      RAISE EXCEPTION 'Este consultorio no está recibiendo citas por ahora';
    END IF;
    NEW.status := 'pending';
    NEW.responded_at := NULL;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF OLD.doctor_id IS DISTINCT FROM public.get_my_clinic_id() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN NEW;
END;
$function$;

-- Bloquear invitaciones a dueños con datos clínicos
CREATE OR REPLACE FUNCTION public.guard_team_invitation_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM auth.users u
      JOIN public.profiles p ON p.id = u.id
     WHERE lower(u.email) = lower(NEW.email)
       AND (p.clinic_id IS NULL OR p.clinic_id = p.id)
       AND lower(coalesce(p.role, 'owner')) = 'owner'
       AND (
         coalesce(p.has_completed_onboarding, false)
         OR EXISTS (SELECT 1 FROM public.patients pt WHERE pt.doctor_id = p.id LIMIT 1)
         OR EXISTS (SELECT 1 FROM public.appointments a WHERE a.doctor_id = p.id LIMIT 1)
       )
  ) THEN
    RAISE EXCEPTION 'Ese correo ya tiene una clínica activa; no se puede invitar';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_team_invitation_insert ON public.team_invitations;
CREATE TRIGGER trg_guard_team_invitation_insert
  BEFORE INSERT ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_team_invitation_insert();

REVOKE ALL ON FUNCTION public.guard_team_invitation_insert() FROM PUBLIC;

-- Quitar set_config de remove/set role (ya no hace falta)
CREATE OR REPLACE FUNCTION public.remove_team_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_clinic uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_member_id IS NULL OR p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes quitarte a ti mismo';
  END IF;

  SELECT clinic_id INTO v_clinic
    FROM public.profiles
   WHERE id = p_member_id;

  IF v_clinic IS NULL OR p_member_id = v_clinic THEN
    RAISE EXCEPTION 'No puedes quitar al propietario';
  END IF;
  IF NOT public.is_clinic_manager(v_clinic) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.profiles
     SET clinic_id = NULL,
         role = 'owner',
         updated_at = now()
   WHERE id = p_member_id
     AND clinic_id = v_clinic;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_team_member_role(p_member_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_clinic uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_member_id IS NULL OR p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol';
  END IF;
  IF p_role NOT IN ('admin', 'assistant', 'receptionist') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;

  SELECT clinic_id INTO v_clinic
    FROM public.profiles
   WHERE id = p_member_id;

  IF v_clinic IS NULL OR p_member_id = v_clinic THEN
    RAISE EXCEPTION 'No puedes cambiar el rol del propietario';
  END IF;
  IF NOT public.is_clinic_manager(v_clinic) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.profiles
     SET role = p_role,
         updated_at = now()
   WHERE id = p_member_id
     AND clinic_id = v_clinic;
END;
$function$;

-- ============================================================
-- 4. INSERT público de reservas: solo clínicas con booking activo + plan
-- ============================================================

CREATE OR REPLACE FUNCTION public.public_can_book(p_doctor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.clinic_has_paid_access(p_doctor_id)
     AND EXISTS (
       SELECT 1
         FROM public.booking_settings b
        WHERE b.doctor_id = p_doctor_id
          AND b.is_active = true
     );
$function$;

REVOKE ALL ON FUNCTION public.public_can_book(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_can_book(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.public_can_book(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.public_can_book(uuid) TO service_role;

DROP POLICY IF EXISTS "Public can insert appointment_requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can create requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can submit appointment requests" ON public.appointment_requests;

CREATE POLICY "Public can insert appointment_requests"
  ON public.appointment_requests
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (public.public_can_book(doctor_id));

GRANT INSERT ON TABLE public.appointment_requests TO anon;

-- ============================================================
-- 5. Recrear policies clínicas: TO authenticated + tenant estricto
-- ============================================================

-- Helper expression: doctor_id = get_my_clinic_id()
-- (tras el fix, owners y staff apuntan al mismo tenant id)

-- appointments
DROP POLICY IF EXISTS "Doctors can manage their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors see own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors update own appointments" ON public.appointments;
DROP POLICY IF EXISTS "RBAC: Select appointments" ON public.appointments;
DROP POLICY IF EXISTS "RBAC: Insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "RBAC: Update appointments" ON public.appointments;
DROP POLICY IF EXISTS "RBAC: Delete appointments" ON public.appointments;

CREATE POLICY "RBAC: Select appointments" ON public.appointments
  FOR SELECT TO authenticated
  USING (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert appointments" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Delete appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- appointment_requests (staff)
DROP POLICY IF EXISTS "Clinic staff can delete requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic staff can update requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic staff can view requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors can manage their own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors see own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors update own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "RBAC: Select appointment_requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "RBAC: Update appointment_requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "RBAC: Delete appointment_requests" ON public.appointment_requests;

CREATE POLICY "RBAC: Select appointment_requests" ON public.appointment_requests
  FOR SELECT TO authenticated
  USING (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Update appointment_requests" ON public.appointment_requests
  FOR UPDATE TO authenticated
  USING (doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Delete appointment_requests" ON public.appointment_requests
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- patients
DROP POLICY IF EXISTS "Doctors delete own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors see own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors update own patients" ON public.patients;
DROP POLICY IF EXISTS "RBAC: Select patients" ON public.patients;
DROP POLICY IF EXISTS "RBAC: Insert patients" ON public.patients;
DROP POLICY IF EXISTS "RBAC: Update patients" ON public.patients;
DROP POLICY IF EXISTS "RBAC: Delete patients" ON public.patients;

CREATE POLICY "RBAC: Select patients" ON public.patients
  FOR SELECT TO authenticated
  USING (doctor_id = public.get_my_clinic_id() AND deleted_at IS NULL);
CREATE POLICY "RBAC: Insert patients" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Update patients" ON public.patients
  FOR UPDATE TO authenticated
  USING (doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Delete patients" ON public.patients
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- patient_clinical
DROP POLICY IF EXISTS "RBAC: Select patient_clinical" ON public.patient_clinical;
DROP POLICY IF EXISTS "RBAC: Insert patient_clinical" ON public.patient_clinical;
DROP POLICY IF EXISTS "RBAC: Update patient_clinical" ON public.patient_clinical;
DROP POLICY IF EXISTS "RBAC: Delete patient_clinical" ON public.patient_clinical;

CREATE POLICY "RBAC: Select patient_clinical" ON public.patient_clinical
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.can_view_clinical_chart()
  );
CREATE POLICY "RBAC: Insert patient_clinical" ON public.patient_clinical
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.can_view_clinical_chart()
  );
CREATE POLICY "RBAC: Update patient_clinical" ON public.patient_clinical
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.can_view_clinical_chart()
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.can_view_clinical_chart()
  );
CREATE POLICY "RBAC: Delete patient_clinical" ON public.patient_clinical
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- lab_works
DROP POLICY IF EXISTS "Doctors can delete their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can insert their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can update their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can view their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Select lab_works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Insert lab_works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Update lab_works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Delete lab_works" ON public.lab_works;

CREATE POLICY "RBAC: Select lab_works" ON public.lab_works
  FOR SELECT TO authenticated
  USING (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert lab_works" ON public.lab_works
  FOR INSERT TO authenticated
  WITH CHECK (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Update lab_works" ON public.lab_works
  FOR UPDATE TO authenticated
  USING (doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Delete lab_works" ON public.lab_works
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- clinical_events
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propios eventos" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propios eventos" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctors delete own events" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctors insert own events" ON public.clinical_events;
DROP POLICY IF EXISTS "Owner Access" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can view clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "RBAC: Select clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "RBAC: Insert clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "RBAC: Update clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "RBAC: Delete clinical_events" ON public.clinical_events;

CREATE POLICY "RBAC: Select clinical_events" ON public.clinical_events
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Insert clinical_events" ON public.clinical_events
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Update clinical_events" ON public.clinical_events
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Delete clinical_events" ON public.clinical_events
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- consent_forms
DROP POLICY IF EXISTS "Owner Access" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can view consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "RBAC: Select consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "RBAC: Insert consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "RBAC: Update consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "RBAC: Delete consent_forms" ON public.consent_forms;

CREATE POLICY "RBAC: Select consent_forms" ON public.consent_forms
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Insert consent_forms" ON public.consent_forms
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Update consent_forms" ON public.consent_forms
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Delete consent_forms" ON public.consent_forms
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- evolution_notes
DROP POLICY IF EXISTS "Doctors delete own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors insert own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors update own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propias notas" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propias notas" ON public.evolution_notes;
DROP POLICY IF EXISTS "Owner Access" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can view evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "RBAC: Select evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "RBAC: Insert evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "RBAC: Update evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "RBAC: Delete evolution_notes" ON public.evolution_notes;

CREATE POLICY "RBAC: Select evolution_notes" ON public.evolution_notes
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Insert evolution_notes" ON public.evolution_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Update evolution_notes" ON public.evolution_notes
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Delete evolution_notes" ON public.evolution_notes
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- prescriptions
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propias recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propias recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Owner Access" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "RBAC: Select prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "RBAC: Insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "RBAC: Update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "RBAC: Delete prescriptions" ON public.prescriptions;

CREATE POLICY "RBAC: Select prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Insert prescriptions" ON public.prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Update prescriptions" ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );
CREATE POLICY "RBAC: Delete prescriptions" ON public.prescriptions
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- budget_items
DROP POLICY IF EXISTS "Owner Access" ON public.budget_items;
DROP POLICY IF EXISTS "Clinic staff can view budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Select budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Insert budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Update budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Delete budget_items" ON public.budget_items;

CREATE POLICY "RBAC: Select budget_items" ON public.budget_items
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(public.get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Insert budget_items" ON public.budget_items
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text])
  );
CREATE POLICY "RBAC: Update budget_items" ON public.budget_items
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text])
  );
CREATE POLICY "RBAC: Delete budget_items" ON public.budget_items
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- payments
DROP POLICY IF EXISTS "Owner Access" ON public.payments;
DROP POLICY IF EXISTS "Clinic staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Select payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Insert payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Update payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Delete payments" ON public.payments;

CREATE POLICY "RBAC: Select payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(public.get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Insert payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text])
  );
CREATE POLICY "RBAC: Update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text])
  );
CREATE POLICY "RBAC: Delete payments" ON public.payments
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- booking_settings / doctor_availability / price_catalogs
DROP POLICY IF EXISTS "Doctors manage own settings" ON public.booking_settings;
DROP POLICY IF EXISTS "RBAC: Select booking_settings" ON public.booking_settings;
DROP POLICY IF EXISTS "RBAC: Insert booking_settings" ON public.booking_settings;
DROP POLICY IF EXISTS "RBAC: Update booking_settings" ON public.booking_settings;
DROP POLICY IF EXISTS "RBAC: Delete booking_settings" ON public.booking_settings;

CREATE POLICY "RBAC: Select booking_settings" ON public.booking_settings
  FOR SELECT TO authenticated
  USING (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert booking_settings" ON public.booking_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Update booking_settings" ON public.booking_settings
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Delete booking_settings" ON public.booking_settings
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

DROP POLICY IF EXISTS "Doctors manage own availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "RBAC: Select doctor_availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "RBAC: Insert doctor_availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "RBAC: Update doctor_availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "RBAC: Delete doctor_availability" ON public.doctor_availability;

CREATE POLICY "RBAC: Select doctor_availability" ON public.doctor_availability
  FOR SELECT TO authenticated
  USING (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert doctor_availability" ON public.doctor_availability
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Update doctor_availability" ON public.doctor_availability
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Delete doctor_availability" ON public.doctor_availability
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

DROP POLICY IF EXISTS "Clinic admins can delete price catalog" ON public.price_catalogs;
DROP POLICY IF EXISTS "Clinic admins can insert price catalog" ON public.price_catalogs;
DROP POLICY IF EXISTS "Clinic admins can update price catalog" ON public.price_catalogs;
DROP POLICY IF EXISTS "Clinic staff can view price catalog" ON public.price_catalogs;

CREATE POLICY "RBAC: Select price_catalogs" ON public.price_catalogs
  FOR SELECT TO authenticated
  USING (doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert price_catalogs" ON public.price_catalogs
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(public.get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Update price_catalogs" ON public.price_catalogs
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(public.get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text])
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(public.get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Delete price_catalogs" ON public.price_catalogs
  FOR DELETE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(public.get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- payment_receipts / subscriptions / notifications / profiles
DROP POLICY IF EXISTS "Clinic can view receipts" ON public.payment_receipts;
CREATE POLICY "Clinic can view receipts" ON public.payment_receipts
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinics read own subscription" ON public.subscriptions;
CREATE POLICY "Clinics read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (clinic_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Users delete own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users insert own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.user_notifications;

CREATE POLICY "Users read own notifications" ON public.user_notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own notifications" ON public.user_notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.user_notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own notifications" ON public.user_notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Visibilidad de equipo (alineada con get_my_clinic_id coalesce)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Clinic members can view clinic profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Clinic members can view clinic profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = public.get_my_clinic_id()
    OR clinic_id = public.get_my_clinic_id()
  );

-- ============================================================
-- 6. FORCE ROW LEVEL SECURITY
-- ============================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointment_requests', 'appointments', 'booking_settings', 'budget_items',
    'clinical_events', 'consent_forms', 'doctor_availability', 'evolution_notes',
    'lab_works', 'patients', 'patient_clinical', 'payment_receipts', 'payments',
    'prescriptions', 'price_catalogs', 'profiles', 'subscriptions',
    'team_invitations', 'user_notifications', 'platform_admins'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 7. Storage: bucket payment-receipts privado
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

DROP POLICY IF EXISTS "Permitir a doctores subir comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a cualquiera ver comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores modificar sus comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores eliminar sus comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Doctores ven sus comprobantes" ON storage.objects;

-- ============================================================
-- 8. Vault: no meter publishable key en migraciones
-- ============================================================
-- Si falta el secreto, solo avisa. Créalo en Dashboard / ops (rotar la key
-- que estuvo en git: sb_publishable_…).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets s WHERE s.name = 'supabase_publishable_key'
  ) THEN
    RAISE WARNING 'Vault: falta supabase_publishable_key. Créala fuera de git y rota la clave publishable expuesta.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'No se pudo verificar Vault supabase_publishable_key: %', SQLERRM;
END $$;
