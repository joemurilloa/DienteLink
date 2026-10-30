-- Hotfix críticos post-auditoría (29 oct 2026).
-- 1) Restaura INSERT público de reservas (se borró la política sin recrearla).
-- 2) Restaura tope de 30 días en acceso provisional al crear un comprobante nuevo.

-- ============================================================
-- 1. Reservas públicas
-- ============================================================

DROP POLICY IF EXISTS "Public can insert appointment_requests" ON public.appointment_requests;
CREATE POLICY "Public can insert appointment_requests"
  ON public.appointment_requests
  AS PERMISSIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Los triggers siguen: plan vigente, doctor existe, fecha no pasada, antispam.
GRANT INSERT ON TABLE public.appointment_requests TO anon;

-- ============================================================
-- 2. Comprobante: 3 días solo en el primer ciclo; no tras rechazo reciente
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
  v_last_provisional timestamptz;
  v_replaced boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

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
    UPDATE public.payment_receipts
       SET email_referencia = coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
           notes = nullif(trim(p_notes), ''),
           created_at = now()
     WHERE id = v_receipt_id;
    v_replaced := true;
    RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
    RETURN;
  END IF;

  SELECT max(r.provisional_access_until)
    INTO v_last_provisional
    FROM public.payment_receipts r
   WHERE r.clinic_id = v_user_id;

  -- Si ya hubo acceso provisional en los últimos 30 días, no regalar otros 3.
  IF v_last_provisional IS NOT NULL AND v_last_provisional > (now() - interval '30 days') THEN
    v_provisional_until := NULL;
  ELSE
    v_provisional_until := now() + interval '3 days';
  END IF;

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
