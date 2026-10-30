-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Fase 1
-- Pegar TODO en el SQL Editor de Supabase y ejecutar (Run).
-- No reejecuta los 29 scripts anteriores.
--
-- 1) El bucket payment-receipts deja de ser público y se vacía.
-- 2) Pagos y presupuestos los leen solo owner y admin.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Comprobantes: bucket privado, sin políticas abiertas
-- ------------------------------------------------------------
UPDATE storage.buckets
   SET public = false
 WHERE id = 'payment-receipts';

DROP POLICY IF EXISTS "Permitir a doctores subir comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a cualquiera ver comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Doctores ven sus comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores modificar sus comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Permitir a doctores eliminar sus comprobantes" ON storage.objects;
-- Nota: Supabase bloquea DELETE directos en storage.objects mediante el trigger
-- storage.protect_delete(). Al poner public = false y quitar las políticas SELECT
-- de arriba, el acceso público ya queda 100% cerrado.
-- Para vaciar archivos huérfanos del disco, usa la opción "Empty bucket" en la UI de Supabase Storage.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'image_url'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'payment_receipts' AND column_name = 'storage_path'
  ) THEN
    UPDATE public.payment_receipts
       SET image_url = NULL,
           storage_path = NULL
     WHERE image_url IS NOT NULL
        OR storage_path IS NOT NULL;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Dueños que siguieron como "doctor" no pierden el dinero
--    El trigger de privilegios solo deja pasar este cambio
--    con la bandera de sesión.
-- ------------------------------------------------------------
DO $$
BEGIN
  PERFORM set_config('dientelink.profile_privilege', 'on', true);
  UPDATE public.profiles
     SET role = 'owner'
   WHERE lower(role) IN ('doctor', 'dr', 'odontologo', 'odontólogo')
     AND (clinic_id IS NULL OR clinic_id = id);
END $$;

-- ------------------------------------------------------------
-- 3. Lectura de pagos y presupuestos: owner y admin
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
