-- ============================================================
-- DienteLink — Campos de anamnesis que la ficha ya muestra
-- Ejecutar en Supabase SQL Editor.
--
-- Sin estas columnas, embarazo / fumador / tipo de sangre /
-- hábitos / observaciones se ven en pantalla y desaparecen
-- al recargar.
-- ============================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS blood_type TEXT,
  ADD COLUMN IF NOT EXISTS smoker BOOLEAN,
  ADD COLUMN IF NOT EXISTS pregnant BOOLEAN,
  ADD COLUMN IF NOT EXISTS habits TEXT,
  ADD COLUMN IF NOT EXISTS observations TEXT;
