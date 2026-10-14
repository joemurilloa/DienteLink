-- ============================================================
-- DienteLink — Acceso provisional al subir un comprobante
-- Ejecutar en Supabase SQL Editor después de:
--   1. supabase_subscriptions_v2.sql
--   2. supabase_admin_billing.sql
--
-- NOTA: la función submit_payment_receipt de este archivo fue reemplazada por
-- la de receipts_email_only.sql (sin imagen). Ejecuta ese archivo después.
--
-- Da 3 días de acceso mientras se revisa el comprobante.
-- No aprueba el pago ni suma el mes contratado.
-- Una clínica solo puede recibir esta cortesía una vez cada 25 días.
-- Si un comprobante con cortesía fue rechazado, los siguientes esperan
-- revisión sin volver a conceder acceso automático.
-- ============================================================

ALTER TABLE public.payment_receipts
  ADD COLUMN IF NOT EXISTS provisional_access_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_payment_receipts_provisional_access
  ON public.payment_receipts(clinic_id, provisional_access_until DESC);

-- La inserción pasa por una función controlada para impedir que el cliente
-- elija una fecha de acceso o envíe varios comprobantes pendientes.
DROP POLICY IF EXISTS "Doctors can insert own receipts" ON public.payment_receipts;
REVOKE INSERT ON public.payment_receipts FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_payment_receipt(
  p_email_referencia text,
  p_image_url text,
  p_storage_path text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  receipt_id uuid,
  provisional_access_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_receipt_id uuid;
  v_provisional_until timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_storage_path IS NULL
     OR split_part(p_storage_path, '/', 1) <> v_user_id::text THEN
    RAISE EXCEPTION 'Ruta de comprobante inválida';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.payment_receipts r
     WHERE r.clinic_id = v_user_id
       AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya tienes un comprobante pendiente de revisión';
  END IF;

  -- Evita extender el acceso indefinidamente mediante cargas repetidas.
  IF NOT EXISTS (
    SELECT 1
      FROM public.payment_receipts r
     WHERE r.clinic_id = v_user_id
       AND r.provisional_access_until IS NOT NULL
       AND r.created_at > now() - interval '25 days'
  ) AND NOT EXISTS (
    SELECT 1
      FROM public.payment_receipts r
     WHERE r.clinic_id = v_user_id
       AND r.provisional_access_until IS NOT NULL
       AND r.status = 'rejected'
  ) THEN
    v_provisional_until := now() + interval '3 days';
  END IF;

  INSERT INTO public.payment_receipts (
    clinic_id,
    email_referencia,
    image_url,
    storage_path,
    notes,
    status,
    provisional_access_until
  ) VALUES (
    v_user_id,
    coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
    p_image_url,
    p_storage_path,
    nullif(trim(p_notes), ''),
    'pending',
    v_provisional_until
  )
  RETURNING id INTO v_receipt_id;

  RETURN QUERY SELECT v_receipt_id, v_provisional_until;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text, text, text, text) TO authenticated;

-- La vista conserva el estado real de la suscripción y expone por separado
-- el acceso provisional. SubscriptionGate acepta cualquiera de los dos.
DROP VIEW IF EXISTS public.subscription_status;

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
  WHERE s.clinic_id = auth.uid();

GRANT SELECT ON public.subscription_status TO authenticated;
