-- 7 días de gracia para seguir trabajando después del vencimiento.
-- La lectura del propio consultorio sigue permitida aunque la gracia ya haya pasado,
-- para que el dentista pueda bajar su copia. Escribir sigue exigiendo plan o gracia.
-- No se toca ninguna política de lectura. Esas siguen exigiendo
-- doctor_id = get_my_clinic_id() o user_id = auth.uid().

DO $$
DECLARE
  leak text;
BEGIN
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ')
    INTO leak
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = ANY (ARRAY[
       'appointment_requests', 'appointments', 'budget_items', 'clinical_events',
       'consent_forms', 'evolution_notes', 'lab_works', 'patients', 'payments',
       'prescriptions', 'price_catalogs', 'user_notifications', 'patient_clinical'
     ])
     AND cmd = 'SELECT'
     AND COALESCE(qual, '') !~ '(get_my_clinic_id|auth\.uid[[:space:]]*\()';

  IF leak IS NOT NULL THEN
    RAISE EXCEPTION 'Migración detenida. Hay lectura sin filtro de consultorio: %', leak;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.clinic_has_paid_access(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1
        FROM public.subscriptions s
       WHERE s.clinic_id = p_clinic_id
         AND s.status IN ('active', 'trial', 'expired')
         AND s.current_period_end IS NOT NULL
         AND s.current_period_end + interval '7 days' > now()
    )
    OR EXISTS (
      SELECT 1
        FROM public.payment_receipts r
       WHERE r.clinic_id = p_clinic_id
         AND r.status = 'pending'
         AND r.provisional_access_until > now()
    );
$$;

CREATE OR REPLACE VIEW public.subscription_status WITH (security_invoker = true) AS
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
    WHEN s.current_period_end IS NOT NULL
      AND s.status IN ('active', 'trial', 'expired')
      AND s.current_period_end + interval '7 days' > now() THEN true
    WHEN grace.provisional_access_until > now() THEN true
    ELSE false
  END AS is_active,
  CASE WHEN s.status = 'trial' THEN true ELSE false END AS is_trial,
  CASE
    WHEN grace.provisional_access_until > now() THEN false
    WHEN s.current_period_end IS NOT NULL
      AND s.status IN ('active', 'trial', 'expired')
      AND s.current_period_end + interval '7 days' > now() THEN false
    WHEN s.status = 'expired' THEN true
    WHEN s.current_period_end <= now() THEN true
    ELSE false
  END AS is_expired,
  CASE
    WHEN s.status IN ('active', 'trial') AND s.current_period_end > now() THEN
      GREATEST(0, ceil(extract(epoch FROM s.current_period_end - now()) / 86400))::integer
    WHEN s.current_period_end IS NOT NULL
      AND s.status IN ('active', 'trial', 'expired')
      AND s.current_period_end + interval '7 days' > now() THEN
      GREATEST(0, ceil(extract(epoch FROM s.current_period_end + interval '7 days' - now()) / 86400))::integer
    WHEN grace.provisional_access_until > now() THEN
      GREATEST(0, ceil(extract(epoch FROM grace.provisional_access_until - now()) / 86400))::integer
    ELSE 0
  END AS days_left,
  CASE
    WHEN s.status IN ('active', 'trial')
      AND s.current_period_end > now()
      AND s.current_period_end <= now() + interval '4 days' THEN true
    ELSE false
  END AS expires_soon,
  grace.provisional_access_until > now()
    AND grace.provisional_access_until > COALESCE(s.current_period_end, '-infinity'::timestamptz) AS is_provisional,
  grace.provisional_access_until
FROM public.subscriptions s
LEFT JOIN LATERAL (
  SELECT max(r.provisional_access_until) AS provisional_access_until
    FROM public.payment_receipts r
   WHERE r.clinic_id = s.clinic_id
     AND r.status = 'pending'
) grace ON true
WHERE s.clinic_id = COALESCE(public.get_my_clinic_id(), auth.uid());

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'appointment_requests',
    'appointments',
    'budget_items',
    'clinical_events',
    'consent_forms',
    'evolution_notes',
    'lab_works',
    'patients',
    'payments',
    'prescriptions',
    'price_catalogs',
    'user_notifications',
    'patient_clinical'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Expediente requiere plan vigente" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Catalogo requiere plan vigente" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Avisos requieren plan vigente" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Expediente clínico requiere plan" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Escribir requiere plan vigente" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Actualizar requiere plan vigente" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Borrar requiere plan vigente" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "Escribir requiere plan vigente" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.current_clinic_has_paid_access())',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Actualizar requiere plan vigente" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.current_clinic_has_paid_access()) WITH CHECK (public.current_clinic_has_paid_access())',
      t
    );
    EXECUTE format(
      'CREATE POLICY "Borrar requiere plan vigente" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.current_clinic_has_paid_access())',
      t
    );
  END LOOP;
END $$;
