-- ARCHIVO HISTÓRICO. NO EJECUTAR EN PRODUCCIÓN.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- DienteLink - Security fixes. Pegar TODO en Supabase SQL Editor y ejecutar (Run).
-- Este archivo es solo ASCII a proposito (sin acentos) para evitar errores de pegado.

-- ---------------------------------------------------------------------------
-- 1) Comprobantes: solo permitir subir a la carpeta de la propia clinica
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir a doctores subir comprobantes" ON storage.objects;
CREATE POLICY "Permitir a doctores subir comprobantes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_my_clinic_id()::text
  )
);

-- ---------------------------------------------------------------------------
-- 2) CRITICO: un visitante anonimo podia leer appointments, appointment_requests,
--    doctor_availability y booking_settings, y listar los comprobantes.
--    La pagina publica de reservas usa funciones RPC, no necesita leer estas tablas.
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;

-- Elimina politicas abiertas (condicion = true) que no sean de INSERT
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('appointments','appointment_requests','doctor_availability','booking_settings')
      AND cmd <> 'INSERT'
      AND trim(both '() ' from coalesce(qual, '')) = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    RAISE NOTICE 'Politica eliminada: %.%', r.tablename, r.policyname;
  END LOOP;
END $$;

-- El rol anonimo solo debe poder ENVIAR solicitudes de cita
REVOKE ALL ON public.appointments FROM anon;
REVOKE ALL ON public.doctor_availability FROM anon;
REVOKE ALL ON public.booking_settings FROM anon;
REVOKE SELECT, UPDATE, DELETE ON public.appointment_requests FROM anon;

-- Comprobantes: quitar el listado publico (los links directos siguen funcionando)
DROP POLICY IF EXISTS "Permitir a cualquiera ver comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Doctores ven sus comprobantes" ON storage.objects;
CREATE POLICY "Doctores ven sus comprobantes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_my_clinic_id()::text
  )
);

-- ---------------------------------------------------------------------------
-- 3) Despues de correrlo, prueba:
--    a) iniciar sesion y ver tus citas
--    b) abrir tu link publico /p/<tu-id> y pedir una cita
--    c) aprobarla desde Solicitudes
--
-- Diagnostico opcional (solo lectura), correr aparte:
--    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;
--    SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
--
-- lab_works: si rowsecurity = false, usar este molde (no habilitar sin politicas):
--    ALTER TABLE public.lab_works ENABLE ROW LEVEL SECURITY;
--    CREATE POLICY "Clinic staff manage lab_works" ON public.lab_works FOR ALL
--      USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
--      WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
-- ---------------------------------------------------------------------------
