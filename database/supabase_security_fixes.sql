-- =============================================================
-- DienteLink: Security & Data Integrity Fixes
-- Run this ONCE in Supabase SQL Editor (app.supabase.com)
-- =============================================================

-- =============================================================
-- FIX 1: Soft-delete para pacientes
-- Los datos clínicos de un doctor NUNCA se borran permanentemente.
-- Los pacientes "eliminados" se ocultan con deleted_at.
-- =============================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para que los filtros WHERE deleted_at IS NULL sean rápidos
CREATE INDEX IF NOT EXISTS idx_patients_not_deleted
  ON public.patients(doctor_id, deleted_at)
  WHERE deleted_at IS NULL;

-- =============================================================
-- FIX 2: Hardening de get_my_clinic_id()
-- Si clinic_id es NULL, devuelve el id del propio usuario.
-- Esto evita que un NULL cause comportamiento inesperado en RLS.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(clinic_id, id) FROM profiles WHERE id = auth.uid();
$$;

-- =============================================================
-- FIX 3: Actualizar políticas RLS de pacientes para respetar soft-delete
-- Solo el dueño/admin puede hacer hard-delete (emergencia).
-- El flujo normal usa soft-delete desde la app.
-- =============================================================

-- Reemplazar política de SELECT para filtrar deleted_at IS NULL
DROP POLICY IF EXISTS "RBAC: Select patients" ON public.patients;
CREATE POLICY "RBAC: Select patients"
  ON public.patients FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND deleted_at IS NULL
  );

-- La política de DELETE ahora es solo para el owner/admin y solo soft-delete
-- Se mantiene para emergencias reales, pero la app usará UPDATE deleted_at
DROP POLICY IF EXISTS "RBAC: Delete patients" ON public.patients;
CREATE POLICY "RBAC: Delete patients"
  ON public.patients FOR DELETE
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.get_my_role() IN ('owner', 'admin')
  );

-- =============================================================
-- FIX 4: Verificar que todas las tablas relacionadas tienen índices
-- para rendimiento con múltiples doctores
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_evolution_notes_patient_doc
  ON public.evolution_notes(patient_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_budget_items_patient_doc
  ON public.budget_items(patient_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_payments_patient_doc
  ON public.payments(patient_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_doc
  ON public.prescriptions(patient_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_consent_forms_patient_doc
  ON public.consent_forms(patient_id, doctor_id);

-- =============================================================
-- LISTO. Resumen de cambios:
--   1. patients.deleted_at: soft-delete seguro
--   2. get_my_clinic_id(): ya no retorna NULL para owners
--   3. RLS SELECT de patients: filtra deleted_at IS NULL
--   4. Índices adicionales para rendimiento multi-tenant
-- =============================================================
