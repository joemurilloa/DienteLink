-- Endurecimiento de seguridad (post-baseline).
-- No reescribe el baseline. Solo cierra huecos vivos en producción.
-- Aplicar con: npx supabase db push

-- ============================================================
-- 1. activate_subscription: solo admin de plataforma
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_clinic_id uuid,
  p_months integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_months IS NULL OR p_months < 1 OR p_months > 36 THEN
    RAISE EXCEPTION 'Meses fuera de rango';
  END IF;

  UPDATE public.subscriptions
  SET
    status               = 'active',
    current_period_start = now(),
    current_period_end   = now() + (p_months || ' months')::interval,
    last_payment_at      = now(),
    updated_at           = now()
  WHERE clinic_id = p_clinic_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.activate_subscription(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_subscription(uuid, integer) FROM anon;
REVOKE ALL ON FUNCTION public.activate_subscription(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid, integer) TO service_role;

-- ============================================================
-- 2. expire_overdue_subscriptions: solo cron / service_role
-- ============================================================

REVOKE ALL ON FUNCTION public.expire_overdue_subscriptions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_overdue_subscriptions() FROM anon;
REVOKE ALL ON FUNCTION public.expire_overdue_subscriptions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO service_role;

-- ============================================================
-- 3. submit_payment_receipt: 3 días solo en el primer envío
-- ============================================================

CREATE OR REPLACE FUNCTION public.submit_payment_receipt(
  p_email_referencia text,
  p_notes text DEFAULT NULL::text
)
RETURNS TABLE(
  receipt_id uuid,
  provisional_access_until timestamp with time zone,
  replaced boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_receipt_id uuid;
  v_provisional_until timestamptz;
  v_replaced boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Solo el dueño de la clínica (clinic_id = su uid) puede pedir acceso provisional.
  IF EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = v_user_id
       AND p.clinic_id IS NOT NULL
       AND p.clinic_id IS DISTINCT FROM p.id
  ) THEN
    RAISE EXCEPTION 'Solo el propietario puede enviar el comprobante';
  END IF;

  SELECT r.id, r.provisional_access_until
    INTO v_receipt_id, v_provisional_until
    FROM public.payment_receipts r
   WHERE r.clinic_id = v_user_id
     AND r.status = 'pending'
   ORDER BY r.created_at DESC
   LIMIT 1;

  IF v_receipt_id IS NOT NULL THEN
    -- Reenvío: actualiza datos del comprobante, NO alarga el plazo.
    UPDATE public.payment_receipts
       SET email_referencia = coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
           notes = nullif(trim(p_notes), ''),
           created_at = now()
     WHERE id = v_receipt_id;
    v_replaced := true;
    RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
    RETURN;
  END IF;

  v_provisional_until := now() + interval '3 days';

  INSERT INTO public.payment_receipts (
    clinic_id,
    email_referencia,
    notes,
    status,
    provisional_access_until
  ) VALUES (
    v_user_id,
    coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
    nullif(trim(p_notes), ''),
    'pending',
    v_provisional_until
  )
  RETURNING id INTO v_receipt_id;

  RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text, text) TO service_role;

-- ============================================================
-- 4. Recepcionista no puede pisar el expediente clínico en patients
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_patient_clinical_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text := lower(btrim(coalesce(public.get_my_role(), '')));
BEGIN
  IF v_role IS DISTINCT FROM 'receptionist' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.allergies := OLD.allergies;
    NEW.medications := OLD.medications;
    NEW.previous_diseases := OLD.previous_diseases;
    NEW.family_history := OLD.family_history;
    NEW.motive_of_consult := OLD.motive_of_consult;
    NEW.blood_type := OLD.blood_type;
    NEW.smoker := OLD.smoker;
    NEW.pregnant := OLD.pregnant;
    NEW.habits := OLD.habits;
    NEW.observations := OLD.observations;
    NEW.consent_signed := OLD.consent_signed;
    NEW.odontogram := OLD.odontogram;
    NEW.odontogram_history := OLD.odontogram_history;
    NEW.periodontogram := OLD.periodontogram;
    NEW.deleted_at := OLD.deleted_at;
    RETURN NEW;
  END IF;

  -- Alta: la recepcionista solo deja identificación, sin expediente clínico.
  NEW.allergies := '{}'::text[];
  NEW.medications := '';
  NEW.previous_diseases := '';
  NEW.family_history := '';
  NEW.motive_of_consult := '';
  NEW.blood_type := NULL;
  NEW.smoker := false;
  NEW.pregnant := false;
  NEW.habits := NULL;
  NEW.observations := NULL;
  NEW.consent_signed := false;
  NEW.odontogram := '[]'::jsonb;
  NEW.odontogram_history := '[]'::jsonb;
  NEW.periodontogram := '[]'::jsonb;
  NEW.deleted_at := NULL;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_patient_clinical_fields ON public.patients;
CREATE TRIGGER trg_guard_patient_clinical_fields
  BEFORE INSERT OR UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_patient_clinical_fields();

REVOKE ALL ON FUNCTION public.guard_patient_clinical_fields() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_patient_clinical_fields() FROM anon;
REVOKE ALL ON FUNCTION public.guard_patient_clinical_fields() FROM authenticated;

-- ============================================================
-- 5. Antispam de reservas públicas (función ya existía, faltaba el trigger)
-- ============================================================

DROP TRIGGER IF EXISTS trg_check_appointment_request_spam ON public.appointment_requests;
CREATE TRIGGER trg_check_appointment_request_spam
  BEFORE INSERT ON public.appointment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_appointment_request_spam();

REVOKE ALL ON FUNCTION public.check_appointment_request_spam() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_appointment_request_spam() FROM anon;
REVOKE ALL ON FUNCTION public.check_appointment_request_spam() FROM authenticated;

-- ============================================================
-- 6. Alta de perfil: rol canónico owner (el CHECK ya no admite Odontólogo)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Doctor'),
    'owner'
  );
  RETURN new;
END;
$function$;

-- ============================================================
-- 7. Quitar políticas viejas que se suman con OR al RBAC
-- ============================================================

-- patients
DROP POLICY IF EXISTS "Doctors delete own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors see own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors update own patients" ON public.patients;

-- clinical_events
DROP POLICY IF EXISTS "Owner Access" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propios eventos" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propios eventos" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctors delete own events" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctors insert own events" ON public.clinical_events;

-- evolution_notes
DROP POLICY IF EXISTS "Owner Access" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors delete own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors insert own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors update own notes" ON public.evolution_notes;

-- consent_forms
DROP POLICY IF EXISTS "Owner Access" ON public.consent_forms;

-- prescriptions
DROP POLICY IF EXISTS "Owner Access" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propias recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propias recetas" ON public.prescriptions;

-- budget_items / payments
DROP POLICY IF EXISTS "Owner Access" ON public.budget_items;
DROP POLICY IF EXISTS "Owner Access" ON public.payments;

-- appointments
DROP POLICY IF EXISTS "Doctors can manage their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors see own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors update own appointments" ON public.appointments;

-- appointment_requests (una sola vía pública de insert)
DROP POLICY IF EXISTS "Doctors can manage their own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors see own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors update own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can create requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can insert appointment_requests" ON public.appointment_requests;

-- booking / availability
DROP POLICY IF EXISTS "Doctors manage own settings" ON public.booking_settings;
DROP POLICY IF EXISTS "Doctors manage own availability" ON public.doctor_availability;

-- lab_works: solo existían políticas del dueño; el equipo no entraba.
DROP POLICY IF EXISTS "Doctors can delete their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can insert their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can update their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can view their own lab works" ON public.lab_works;

DROP POLICY IF EXISTS "RBAC: Delete lab_works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Insert lab_works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Select lab_works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Update lab_works" ON public.lab_works;

CREATE POLICY "RBAC: Select lab_works"
  ON public.lab_works
  FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(btrim(public.get_my_role())) IN ('owner', 'admin', 'assistant')
  );

CREATE POLICY "RBAC: Insert lab_works"
  ON public.lab_works
  FOR INSERT
  WITH CHECK (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );

CREATE POLICY "RBAC: Update lab_works"
  ON public.lab_works
  FOR UPDATE
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  )
  WITH CHECK (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );

CREATE POLICY "RBAC: Delete lab_works"
  ON public.lab_works
  FOR DELETE
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- ============================================================
-- 8. Privilegios de tabla: anon sin DML clínico; sin TRUNCATE
-- ============================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'appointment_requests',
    'appointments',
    'booking_settings',
    'budget_items',
    'clinical_events',
    'consent_forms',
    'doctor_availability',
    'evolution_notes',
    'lab_works',
    'patients',
    'payment_receipts',
    'payments',
    'prescriptions',
    'price_catalogs',
    'profiles',
    'subscriptions',
    'team_invitations',
    'user_notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, MAINTAIN ON TABLE public.%I FROM authenticated', t);
  END LOOP;
END $$;

-- Vista subscription_status (si existe como relación)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'subscription_status'
  ) THEN
    EXECUTE 'REVOKE ALL ON TABLE public.subscription_status FROM anon';
    EXECUTE 'REVOKE TRUNCATE, MAINTAIN ON TABLE public.subscription_status FROM authenticated';
  END IF;
END $$;

-- Público: solo insertar solicitudes de cita
GRANT INSERT ON TABLE public.appointment_requests TO anon;

-- Autenticados: DML normal (RLS decide fila a fila)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appointment_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.booking_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.clinical_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.consent_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.doctor_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.evolution_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lab_works TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patients TO authenticated;
GRANT SELECT ON TABLE public.payment_receipts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.prescriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.price_catalogs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.team_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_notifications TO authenticated;
