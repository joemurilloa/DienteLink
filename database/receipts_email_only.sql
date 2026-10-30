-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Comprobantes solo por correo (sin guardar imágenes)
-- Ejecutar en Supabase SQL Editor DESPUÉS de
-- payment_receipt_provisional_access.sql
--
-- Qué hace:
--   1. Reemplaza submit_payment_receipt: ya no recibe ruta ni URL de imagen.
--      Solo registra "por revisar" y decide el acceso provisional de 3 días.
--   2. Borra de la base las referencias a imágenes ya guardadas.
--   3. Quita las políticas del bucket 'payment-receipts'.
--
-- IMPORTANTE: este script NO borra los archivos del bucket. Eso se hace
-- desde el Dashboard (Storage → payment-receipts → Empty bucket → Delete).
-- Supabase no permite borrar archivos por SQL: quedarían huérfanos ocupando espacio.
-- ============================================================

-- 1) Nueva función (dos parámetros). La versión anterior tenía cuatro.
DROP FUNCTION IF EXISTS public.submit_payment_receipt(text, text, text, text);

CREATE OR REPLACE FUNCTION public.submit_payment_receipt(
  p_email_referencia text,
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

  IF EXISTS (
    SELECT 1
      FROM public.payment_receipts r
     WHERE r.clinic_id = v_user_id
       AND r.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya tienes un comprobante pendiente de revisión';
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

  RETURN QUERY SELECT v_receipt_id, v_provisional_until;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text, text) TO authenticated;

-- 2) Quitar las referencias a imágenes ya guardadas.
UPDATE public.payment_receipts
   SET image_url = NULL,
       storage_path = NULL
 WHERE image_url IS NOT NULL
    OR storage_path IS NOT NULL;

-- 3) Políticas del bucket (ya no se usa).
DROP POLICY IF EXISTS "Permitir a doctores subir comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a cualquiera ver comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Doctores ven sus comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores modificar sus comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores eliminar sus comprobantes" ON storage.objects;
