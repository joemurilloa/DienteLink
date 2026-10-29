-- ============================================================
-- DienteLink — Fase 7
-- Pegar después de phase6_clinical_read.sql.
--
-- El fin de la prueba es current_period_end en subscriptions.
-- Un alta nueva lo escribe el trigger. Quien no tenía fila
-- recibe una, con el mismo vencimiento que ya calculaba la base
-- (created_at de auth.users + 14 días).
-- Sin fila, el plan no está activo. El navegador no inventa días.
-- ============================================================

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'trial', 'expired'));

INSERT INTO public.subscriptions (
  clinic_id,
  status,
  plan,
  amount,
  currency,
  trial_started_at,
  current_period_start,
  current_period_end,
  created_at,
  updated_at
)
SELECT
  p.id,
  CASE
    WHEN u.created_at + interval '14 days' > now() THEN 'trial'
    ELSE 'expired'
  END,
  'monthly',
  15.00,
  'USD',
  u.created_at,
  u.created_at,
  u.created_at + interval '14 days',
  now(),
  now()
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE (p.clinic_id IS NULL OR p.clinic_id = p.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.clinic_id = p.id
  );

CREATE OR REPLACE FUNCTION public.create_trial_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    clinic_id,
    status,
    plan,
    amount,
    currency,
    trial_started_at,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'trial',
    'monthly',
    15.00,
    'USD',
    now(),
    now(),
    now() + interval '14 days',
    now(),
    now()
  )
  ON CONFLICT (clinic_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_start_trial ON public.profiles;
CREATE TRIGGER on_profile_created_start_trial
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_trial_subscription();

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
