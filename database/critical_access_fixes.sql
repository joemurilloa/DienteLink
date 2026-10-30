-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Acceso crítico
-- Pegar TODO en el SQL Editor de Supabase y ejecutar (Run).
--
-- 1) Nadie cambia su rol ni su clínica desde el cliente.
-- 2) Pacientes, citas, pagos y el resto del expediente solo
--    se leen o se escriben si el plan de ESA clínica sigue vivo.
-- 3) Sin fila de suscripción ya no significa acceso eterno:
--    solo cuentan los 14 días desde que se creó la cuenta.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rol y clínica
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('dientelink.profile_privilege', true), '') = 'on' THEN
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
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

-- Aunque alguien vuelva a dar permisos de fila, estas dos columnas
-- no se pueden escribir con la clave del navegador.
REVOKE UPDATE (role, clinic_id) ON TABLE public.profiles FROM PUBLIC;
REVOKE UPDATE (role, clinic_id) ON TABLE public.profiles FROM anon;
REVOKE UPDATE (role, clinic_id) ON TABLE public.profiles FROM authenticated;

-- ------------------------------------------------------------
-- 2. ¿Esta clínica puede abrir el expediente?
--    14 días = lib/billing.ts (trialDays).
-- ------------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

ALTER TABLE public.payment_receipts
  ADD COLUMN IF NOT EXISTS provisional_access_until timestamptz;

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.clinic_has_paid_access(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
        FROM public.subscriptions s
       WHERE s.clinic_id = p_clinic_id
         AND s.status IN ('active', 'trial')
         AND s.current_period_end > now()
    )
    OR EXISTS (
      SELECT 1
        FROM public.payment_receipts r
       WHERE r.clinic_id = p_clinic_id
         AND r.status = 'pending'
         AND r.provisional_access_until > now()
    );
$$;

REVOKE ALL ON FUNCTION public.clinic_has_paid_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_has_paid_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.clinic_has_paid_access(uuid) FROM authenticated;

-- Hasta cuándo sigue abierto el plan. Solo la propia clínica puede preguntarlo.
CREATE OR REPLACE FUNCTION public.clinic_access_until(p_clinic_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_clinic_id IS DISTINCT FROM auth.uid()
     AND p_clinic_id IS DISTINCT FROM public.get_my_clinic_id() THEN
    RETURN NULL;
  END IF;

  SELECT max(until_at)
    INTO v_until
    FROM (
      SELECT s.current_period_end AS until_at
        FROM public.subscriptions s
       WHERE s.clinic_id = p_clinic_id
         AND s.status IN ('active', 'trial')
         AND s.current_period_end > now()
      UNION ALL
      SELECT r.provisional_access_until
        FROM public.payment_receipts r
       WHERE r.clinic_id = p_clinic_id
         AND r.status = 'pending'
         AND r.provisional_access_until > now()
    ) ends;

  RETURN v_until;
END;
$$;

REVOKE ALL ON FUNCTION public.clinic_access_until(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_access_until(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.clinic_access_until(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.current_clinic_has_paid_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.clinic_has_paid_access(coalesce(public.get_my_clinic_id(), auth.uid()));
$$;

REVOKE ALL ON FUNCTION public.current_clinic_has_paid_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_clinic_has_paid_access() FROM anon;
GRANT EXECUTE ON FUNCTION public.current_clinic_has_paid_access() TO authenticated;

-- El equipo ve el plan del consultorio, no un trial propio.
DROP POLICY IF EXISTS "Clinics read own subscription" ON public.subscriptions;
CREATE POLICY "Clinics read own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    clinic_id = auth.uid()
    OR clinic_id = public.get_my_clinic_id()
  );

DROP POLICY IF EXISTS "Doctors can view own receipts" ON public.payment_receipts;
DROP POLICY IF EXISTS "Clinic can view receipts" ON public.payment_receipts;
CREATE POLICY "Clinic can view receipts"
  ON public.payment_receipts
  FOR SELECT
  TO authenticated
  USING (
    clinic_id = auth.uid()
    OR clinic_id = public.get_my_clinic_id()
  );

-- La vista sigue el mismo consultorio que el perfil.
DROP VIEW IF EXISTS public.subscription_status;
CREATE VIEW public.subscription_status WITH (security_invoker = true) AS
  SELECT
    s.clinic_id,
    s.status,
    s.plan,
    s.amount,
    s.currency,
    s.trial_started_at,
    s.current_period_start,
    s.current_period_end,
    s.last_payment_at,
    CASE
      WHEN s.status IN ('active', 'trial') AND s.current_period_end > now() THEN true
      WHEN grace.provisional_access_until > now() THEN true
      ELSE false
    END AS is_active,
    CASE WHEN s.status = 'trial' THEN true ELSE false END AS is_trial,
    CASE
      WHEN grace.provisional_access_until > now() THEN false
      WHEN s.status = 'expired' THEN true
      WHEN s.current_period_end <= now() THEN true
      ELSE false
    END AS is_expired,
    GREATEST(
      0,
      CEIL(EXTRACT(EPOCH FROM (
        GREATEST(
          coalesce(s.current_period_end, '-infinity'::timestamptz),
          coalesce(grace.provisional_access_until, '-infinity'::timestamptz)
        ) - now()
      )) / 86400)
    )::int AS days_left,
    CASE
      WHEN GREATEST(
        coalesce(s.current_period_end, '-infinity'::timestamptz),
        coalesce(grace.provisional_access_until, '-infinity'::timestamptz)
      ) BETWEEN now() AND now() + interval '4 days' THEN true
      ELSE false
    END AS expires_soon,
    (
      grace.provisional_access_until > now()
      AND grace.provisional_access_until > coalesce(s.current_period_end, '-infinity'::timestamptz)
    ) AS is_provisional,
    grace.provisional_access_until
  FROM public.subscriptions s
  LEFT JOIN LATERAL (
    SELECT max(r.provisional_access_until) AS provisional_access_until
      FROM public.payment_receipts r
     WHERE r.clinic_id = s.clinic_id
       AND r.status = 'pending'
  ) grace ON true
  WHERE s.clinic_id = coalesce(public.get_my_clinic_id(), auth.uid());

GRANT SELECT ON public.subscription_status TO authenticated;

-- Políticas restrictivas: se suman a las que ya existen.
-- Un visitante anónimo sigue pudiendo pedir cita; el trigger de abajo lo frena si el plan venció.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'patients',
    'appointments',
    'evolution_notes',
    'clinical_events',
    'budget_items',
    'payments',
    'consent_forms',
    'prescriptions',
    'appointment_requests'
  ];
BEGIN
  IF to_regclass('public.lab_works') IS NOT NULL THEN
    tables := array_append(tables, 'lab_works');
  END IF;

  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'DROP POLICY IF EXISTS "Expediente requiere plan vigente" ON public.%I',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Expediente requiere plan vigente" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.current_clinic_has_paid_access()) WITH CHECK (public.current_clinic_has_paid_access())',
      t
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3. Enlace público: sin plan vigente no hay horarios ni huecos
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

REVOKE ALL ON FUNCTION public.get_public_appointment_requests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_appointment_requests(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.block_bookings_if_unpaid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.clinic_has_paid_access(NEW.doctor_id) THEN
    RAISE EXCEPTION 'Este consultorio no está recibiendo citas por ahora';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_bookings_if_unpaid ON public.appointment_requests;
CREATE TRIGGER trg_block_bookings_if_unpaid
  BEFORE INSERT ON public.appointment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.block_bookings_if_unpaid();
