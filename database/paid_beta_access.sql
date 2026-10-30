-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Acceso justo mientras se revisa el pago
-- Ejecutar en Supabase SQL Editor.
--
-- 1) Si el doctor reenvía el comprobante, se le dan otros 3 días.
-- 2) Si rechazaste una foto borrosa, la siguiente sí da 3 días
--    (antes se quedaba fuera para siempre).
-- 3) Si el plan ya venció, el enlace público de citas se apaga
--    solo. Cuando pagues otra vez, se enciende sin que el doctor
--    toque nada.
-- ============================================================

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

  SELECT r.id
    INTO v_receipt_id
    FROM public.payment_receipts r
   WHERE r.clinic_id = v_user_id
     AND r.status = 'pending'
   ORDER BY r.created_at DESC
   LIMIT 1;

  -- Siempre 3 días desde este envío, también al reenviar.
  v_provisional_until := now() + interval '3 days';

  IF v_receipt_id IS NOT NULL THEN
    UPDATE public.payment_receipts
       SET email_referencia = coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
           notes = nullif(trim(p_notes), ''),
           created_at = now(),
           provisional_access_until = v_provisional_until
     WHERE id = v_receipt_id;
    v_replaced := true;
    RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
    RETURN;
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

-- El consultorio puede recibir citas públicas solo si el plan sigue vivo
-- o si hay un comprobante pendiente con cortesía.
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

CREATE OR REPLACE FUNCTION public.get_public_booking_settings(p_doctor_id uuid)
RETURNS SETOF booking_settings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.*
    FROM public.booking_settings b
   WHERE b.doctor_id = p_doctor_id
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

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
