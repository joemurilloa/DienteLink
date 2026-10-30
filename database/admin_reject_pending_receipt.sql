-- ARCHIVO HIST”RICO. NO EJECUTAR EN PRODUCCI”N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- Admin: rechazar comprobantes pendientes sin sumar d√≠as
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_reject_pending_receipts(
  p_clinic_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.payment_receipts
     SET status = 'rejected',
         reviewed_at = now(),
         reviewed_note = coalesce(nullif(trim(p_note), ''), 'Rechazado por el administrador'),
         provisional_access_until = NULL
   WHERE clinic_id = p_clinic_id
     AND status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'clinic_id', p_clinic_id,
    'rejected_count', v_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_pending_receipts(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_pending_receipts(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_pending_receipts(uuid, text) TO authenticated;
