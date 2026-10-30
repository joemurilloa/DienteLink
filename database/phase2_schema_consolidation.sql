-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Fase 2
-- Pegar TODO en el SQL Editor de Supabase y ejecutar (Run).
-- Después de database/phase1_access_hardening.sql.
-- No reejecutes los scripts 01–29 encima de una base que ya funciona.
--
-- 1) Las cuatro funciones públicas quedan con search_path y plan vigente.
-- 2) El rol solo puede ser owner, admin, assistant o receptionist.
-- 3) Se reafirman las lecturas de pagos y presupuestos de la Fase 1.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Reservas públicas
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_doctor_availability(p_doctor_id uuid)
RETURNS SETOF public.doctor_availability
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.*
    FROM public.doctor_availability d
   WHERE d.doctor_id = p_doctor_id
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

CREATE OR REPLACE FUNCTION public.get_public_booking_settings(p_doctor_id uuid)
RETURNS SETOF public.booking_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.*
    FROM public.booking_settings b
   WHERE b.doctor_id = p_doctor_id
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

CREATE OR REPLACE FUNCTION public.get_public_appointments(p_doctor_id uuid)
RETURNS TABLE ("date" text, "time" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.date, a.time
    FROM public.appointments a
    JOIN public.booking_settings b ON b.doctor_id = a.doctor_id
   WHERE a.doctor_id = p_doctor_id
     AND a.status = 'Programada'
     AND a.date >= to_char((now() AT TIME ZONE 'America/Tegucigalpa')::date, 'YYYY-MM-DD')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

DROP FUNCTION IF EXISTS public.get_public_appointment_requests(uuid);

CREATE FUNCTION public.get_public_appointment_requests(p_doctor_id uuid)
RETURNS TABLE (requested_date text, requested_time text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.requested_date, ar.requested_time
    FROM public.appointment_requests ar
    JOIN public.booking_settings b ON b.doctor_id = ar.doctor_id
   WHERE ar.doctor_id = p_doctor_id
     AND ar.status IN ('pending', 'approved')
     AND ar.requested_date >= to_char((now() AT TIME ZONE 'America/Tegucigalpa')::date, 'YYYY-MM-DD')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

REVOKE ALL ON FUNCTION public.get_public_appointments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_appointment_requests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_doctor_availability(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_booking_settings(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_appointments(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_appointment_requests(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_appointment_request_spam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count int;
BEGIN
  SELECT count(*) INTO pending_count
    FROM public.appointment_requests
   WHERE doctor_id = NEW.doctor_id
     AND patient_email = NEW.patient_email
     AND status = 'pending';

  IF pending_count >= 3 THEN
    RAISE EXCEPTION 'Has alcanzado el límite de solicitudes pendientes para esta clínica. Por favor espera a que te respondan.';
  END IF;

  SELECT count(*) INTO pending_count
    FROM public.appointment_requests
   WHERE doctor_id = NEW.doctor_id
     AND status = 'pending';

  IF pending_count >= 500 THEN
    RAISE EXCEPTION 'Esta clínica está saturada y no puede recibir más solicitudes en este momento.';
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- 2. Roles: un solo vocabulario
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'owner';

DO $$
BEGIN
  PERFORM set_config('dientelink.profile_privilege', 'on', true);

  UPDATE public.profiles
     SET role = 'owner'
   WHERE (clinic_id IS NULL OR clinic_id = id)
     AND (
       role IS NULL
       OR lower(btrim(role)) IN ('doctor', 'dr', 'odontologo', 'odontólogo', '')
     );

  UPDATE public.profiles
     SET role = 'assistant'
   WHERE clinic_id IS NOT NULL
     AND clinic_id <> id
     AND lower(btrim(role)) IN ('doctor', 'dr', 'odontologo', 'odontólogo');

  UPDATE public.profiles
     SET role = 'receptionist'
   WHERE clinic_id IS NOT NULL
     AND clinic_id <> id
     AND (role IS NULL OR btrim(role) = '');
END $$;

DO $$
DECLARE
  stray text;
BEGIN
  SELECT string_agg(DISTINCT role, ', ')
    INTO stray
    FROM public.profiles
   WHERE lower(btrim(role)) NOT IN ('owner', 'admin', 'assistant', 'receptionist');

  IF stray IS NOT NULL THEN
    RAISE EXCEPTION 'Hay perfiles con un rol fuera de la lista: %. No se cambian solos.', stray;
  END IF;

  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (lower(btrim(role)) IN ('owner', 'admin', 'assistant', 'receptionist'));
END $$;

-- ------------------------------------------------------------
-- 3. La Fase 1 no se afloja: pagos y presupuestos
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Clinic staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Select payments" ON public.payments;
CREATE POLICY "RBAC: Select payments"
  ON public.payments
  FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(public.get_my_role()) IN ('owner', 'admin')
  );

DROP POLICY IF EXISTS "Clinic staff can view budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Select budget_items" ON public.budget_items;
CREATE POLICY "RBAC: Select budget_items"
  ON public.budget_items
  FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(public.get_my_role()) IN ('owner', 'admin')
  );
