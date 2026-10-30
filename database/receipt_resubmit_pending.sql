-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Reenviar / reemplazar comprobante pendiente
-- Ejecutar en Supabase SQL Editor.
--
-- Si ya hay un pending, lo actualiza (misma fila) en vez de
-- bloquear con "Ya tienes un comprobante pendiente".
-- No guarda imágenes: cero uso de Storage.
-- ============================================================

-- Obligatorio: el return type cambió (ahora incluye `replaced`).
DROP FUNCTION IF EXISTS public.submit_payment_receipt(text, text);

CREATE OR REPLACE FUNCTION public.submit_payment_receipt(
  p_email_referencia text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE (
  receipt_id uuid,
  provisional_access_until timestamptz,
  replaced boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_receipt_id uuid;
  v_provisional_until timestamptz;
  v_replaced boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
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

  -- Acceso provisional: una vez cada 25 días, y no si uno anterior fue rechazado.
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
$$;

REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text, text) TO authenticated;
