-- ============================================================
-- DienteLink — Fase 3: Catálogo de precios en Postgres
-- Pegar en el SQL Editor de Supabase y ejecutar (Run).
-- Sincroniza las tarifas y tratamientos entre todos los
-- dispositivos y miembros del equipo de la clínica.
-- ============================================================

-- 1. Tabla de catálogos de precios por clínica
CREATE TABLE IF NOT EXISTS public.price_catalogs (
  doctor_id   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Activar Row Level Security
ALTER TABLE public.price_catalogs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acceso

-- Lectura: Cualquier miembro de la clínica (owner, admin, assistant, receptionist)
DROP POLICY IF EXISTS "Clinic staff can view price catalog" ON public.price_catalogs;
CREATE POLICY "Clinic staff can view price catalog"
  ON public.price_catalogs
  FOR SELECT
  USING (
    doctor_id = auth.uid() 
    OR doctor_id = public.get_my_clinic_id()
  );

-- Inserción: Solo owner y admin
DROP POLICY IF EXISTS "Clinic admins can insert price catalog" ON public.price_catalogs;
CREATE POLICY "Clinic admins can insert price catalog"
  ON public.price_catalogs
  FOR INSERT
  WITH CHECK (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(public.get_my_role()) IN ('owner', 'admin')
  );

-- Modificación: Solo owner y admin
DROP POLICY IF EXISTS "Clinic admins can update price catalog" ON public.price_catalogs;
CREATE POLICY "Clinic admins can update price catalog"
  ON public.price_catalogs
  FOR UPDATE
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(public.get_my_role()) IN ('owner', 'admin')
  )
  WITH CHECK (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(public.get_my_role()) IN ('owner', 'admin')
  );

-- Eliminación: Solo owner y admin
DROP POLICY IF EXISTS "Clinic admins can delete price catalog" ON public.price_catalogs;
CREATE POLICY "Clinic admins can delete price catalog"
  ON public.price_catalogs
  FOR DELETE
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(public.get_my_role()) IN ('owner', 'admin')
  );

-- 4. Candado de plan vigente (si la función existe)
DO $$
BEGIN
  IF to_regprocedure('public.current_clinic_has_paid_access()') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Catalogo requiere plan vigente" ON public.price_catalogs;
    CREATE POLICY "Catalogo requiere plan vigente"
      ON public.price_catalogs
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.current_clinic_has_paid_access())
      WITH CHECK (public.current_clinic_has_paid_access());
  END IF;
END $$;

-- 5. Otorgar permisos al rol autenticado
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_catalogs TO authenticated;
