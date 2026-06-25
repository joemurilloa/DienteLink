-- =============================================================
-- DienteLink: Control de Trabajos de Laboratorio
-- Ejecuta este script en el SQL Editor de Supabase
-- =============================================================

CREATE TABLE IF NOT EXISTS lab_works (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  lab_name        TEXT NOT NULL,
  sent_date       TEXT NOT NULL,    -- YYYY-MM-DD
  expected_date   TEXT,             -- YYYY-MM-DD
  cost            NUMERIC NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | received | completed
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_lab_works_patient ON lab_works(doctor_id, patient_id);

-- =============================================================
-- Row Level Security (RLS)
-- Asegura que un doctor solo pueda ver y modificar sus propios trabajos
-- =============================================================

ALTER TABLE lab_works ENABLE ROW LEVEL SECURITY;

-- 1. Select
DROP POLICY IF EXISTS "Doctors can view their own lab works" ON lab_works;
CREATE POLICY "Doctors can view their own lab works" 
ON lab_works FOR SELECT 
USING (auth.uid() = doctor_id);

-- 2. Insert
DROP POLICY IF EXISTS "Doctors can insert their own lab works" ON lab_works;
CREATE POLICY "Doctors can insert their own lab works" 
ON lab_works FOR INSERT 
WITH CHECK (auth.uid() = doctor_id);

-- 3. Update
DROP POLICY IF EXISTS "Doctors can update their own lab works" ON lab_works;
CREATE POLICY "Doctors can update their own lab works" 
ON lab_works FOR UPDATE 
USING (auth.uid() = doctor_id)
WITH CHECK (auth.uid() = doctor_id);

-- 4. Delete
DROP POLICY IF EXISTS "Doctors can delete their own lab works" ON lab_works;
CREATE POLICY "Doctors can delete their own lab works" 
ON lab_works FOR DELETE 
USING (auth.uid() = doctor_id);

-- Añadimos comentario en el esquema general para documentación
COMMENT ON TABLE lab_works IS 'Registro de trabajos protésicos enviados a laboratorios externos';
