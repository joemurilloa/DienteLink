-- =============================================================
-- DienteLink: Complete Database Schema
-- Supabase (PostgreSQL) – 12 tables
-- Run these CREATE TABLE statements in Supabase SQL Editor
-- BEFORE applying supabase_rls.sql
-- =============================================================

-- =============================================================
-- 1. profiles
-- Extends auth.users with doctor/clinic metadata
-- =============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'doctor',
  clinic_name   TEXT    NOT NULL DEFAULT '',
  phone         TEXT,
  currency      TEXT    NOT NULL DEFAULT 'HNL',
  locale        TEXT    NOT NULL DEFAULT 'es-HN',
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 2. patients
-- Core patient records with clinical data in JSONB columns
-- =============================================================
CREATE TABLE IF NOT EXISTS patients (
  id                  TEXT PRIMARY KEY,
  doctor_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  birth_date          DATE,
  gender              TEXT,
  address             TEXT,
  phone               TEXT,
  email               TEXT,
  occupation          TEXT,
  allergies           JSONB DEFAULT '[]'::jsonb,
  medications         TEXT,
  previous_diseases   TEXT,
  family_history      TEXT,
  motive_of_consult   TEXT,
  consent_signed      BOOLEAN DEFAULT FALSE,
  -- Odontogram: array of 32 teeth, each with surface conditions
  -- Structure: [{ id: 1..32, surfaces: [{ surface, condition }] }]
  odontogram          JSONB DEFAULT '[]'::jsonb,
  -- Historical snapshots: [{ id, date, teeth: [...] }]
  odontogram_history  JSONB DEFAULT '[]'::jsonb,
  -- Periodontogram: { teeth: [{ toothId, buccal: [3 sites], lingual: [3 sites], mobility, furcation }] }
  periodontogram      JSONB DEFAULT '{}'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_id);

-- =============================================================
-- 3. appointments
-- Scheduled and historical appointments (soft-deletable)
-- =============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id               TEXT PRIMARY KEY,
  doctor_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id       TEXT REFERENCES patients(id) ON DELETE SET NULL,
  patient_name     TEXT NOT NULL,
  phone_number     TEXT,
  date             TEXT NOT NULL,           -- YYYY-MM-DD
  time             TEXT NOT NULL,           -- HH:MM
  type             TEXT NOT NULL,           -- Consulta | Seguimiento | Cirugía | Revisión
  status           TEXT NOT NULL DEFAULT 'Programada',  -- Programada | Completada | Retrasada | Eliminada
  reminder_status  TEXT NOT NULL DEFAULT 'not_sent',    -- not_sent | sending | sent | error
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);

-- =============================================================
-- 4. evolution_notes
-- Clinical progress notes per patient
-- =============================================================
CREATE TABLE IF NOT EXISTS evolution_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,     -- YYYY-MM-DD
  content     TEXT NOT NULL,
  procedure   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_notes_patient ON evolution_notes(doctor_id, patient_id);

-- =============================================================
-- 5. clinical_events
-- Timestamped clinical events (treatments, diagnoses, etc.)
-- =============================================================
CREATE TABLE IF NOT EXISTS clinical_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,    -- YYYY-MM-DD
  type         TEXT NOT NULL,    -- treatment | extraction | cleaning | diagnose | other
  description  TEXT NOT NULL,
  tooth_id     INTEGER,          -- 1-32
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_events_patient ON clinical_events(doctor_id, patient_id);

-- =============================================================
-- 6. budget_items
-- Treatment budget line items
-- =============================================================
CREATE TABLE IF NOT EXISTS budget_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  treatment   TEXT NOT NULL,
  tooth_id    INTEGER,           -- 1-32 (optional)
  unit_cost   NUMERIC NOT NULL DEFAULT 0,
  quantity    INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_patient ON budget_items(doctor_id, patient_id);

-- =============================================================
-- 7. payments
-- Payment transactions per patient
-- =============================================================
CREATE TABLE IF NOT EXISTS payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      NUMERIC NOT NULL DEFAULT 0,
  method      TEXT NOT NULL,    -- cash | card | transfer | other
  note        TEXT,
  date        TEXT NOT NULL     -- YYYY-MM-DD
);

CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(doctor_id, patient_id);

-- =============================================================
-- 8. consent_forms
-- Informed consent documents with digital signatures
-- =============================================================
CREATE TABLE IF NOT EXISTS consent_forms (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  signature_data  TEXT,          -- Base64 PNG from canvas
  signed_at       TEXT,          -- ISO 8601 timestamp
  witness_name    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_forms_patient ON consent_forms(doctor_id, patient_id);

-- =============================================================
-- 9. prescriptions
-- Medical prescriptions with JSONB medications array
-- =============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,         -- YYYY-MM-DD
  diagnosis   TEXT,
  -- Medications array:
  -- [{ name, dosage, frequency, duration, instructions }]
  medications JSONB DEFAULT '[]'::jsonb,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(doctor_id, patient_id);

-- =============================================================
-- 10. doctor_availability
-- Weekly scheduling configuration for each doctor
-- =============================================================
CREATE TABLE IF NOT EXISTS doctor_availability (
  doctor_id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  -- Weekly schedule: 7 entries, one per day of week
  -- [{ dayOfWeek: 0..6, enabled: bool, timeSlots: [{ start, end }] }]
  weekly_schedule      JSONB DEFAULT '[
    {"dayOfWeek":0,"enabled":false,"timeSlots":[]},
    {"dayOfWeek":1,"enabled":true,"timeSlots":[{"start":"09:00","end":"12:00"},{"start":"14:00","end":"17:00"}]},
    {"dayOfWeek":2,"enabled":true,"timeSlots":[{"start":"09:00","end":"12:00"},{"start":"14:00","end":"17:00"}]},
    {"dayOfWeek":3,"enabled":true,"timeSlots":[{"start":"09:00","end":"12:00"},{"start":"14:00","end":"17:00"}]},
    {"dayOfWeek":4,"enabled":true,"timeSlots":[{"start":"09:00","end":"12:00"},{"start":"14:00","end":"17:00"}]},
    {"dayOfWeek":5,"enabled":true,"timeSlots":[{"start":"09:00","end":"12:00"}]},
    {"dayOfWeek":6,"enabled":false,"timeSlots":[]}
  ]'::jsonb,
  slot_duration        INTEGER NOT NULL DEFAULT 30,   -- minutes (15/30/45/60)
  buffer_time          INTEGER NOT NULL DEFAULT 15,   -- minutes between slots
  advance_booking_days INTEGER NOT NULL DEFAULT 30,   -- max days ahead for public booking
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 11. booking_settings
-- Public booking page configuration per doctor
-- =============================================================
CREATE TABLE IF NOT EXISTS booking_settings (
  doctor_id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_name           TEXT NOT NULL DEFAULT '',
  clinic_name           TEXT NOT NULL DEFAULT 'DienteLink Clínica',
  description           TEXT DEFAULT '',
  -- Available appointment types: ["Consulta", "Seguimiento", "Cirugía", "Revisión"]
  available_types       JSONB DEFAULT '["Consulta","Seguimiento","Revisión"]'::jsonb,
  require_phone         BOOLEAN NOT NULL DEFAULT TRUE,
  require_message       BOOLEAN NOT NULL DEFAULT FALSE,
  confirmation_message  TEXT DEFAULT '',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================================
-- 12. appointment_requests
-- Public booking requests before doctor approval
-- =============================================================
CREATE TABLE IF NOT EXISTS appointment_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  patient_name      TEXT NOT NULL,
  patient_email     TEXT NOT NULL,
  patient_phone     TEXT,
  requested_date    TEXT NOT NULL,   -- YYYY-MM-DD
  requested_time    TEXT NOT NULL,   -- HH:MM
  appointment_type  TEXT NOT NULL,   -- Consulta | Seguimiento | Cirugía | Revisión
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  responded_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointment_requests_doctor ON appointment_requests(doctor_id, status);

-- =============================================================
-- JSONB Column Reference
-- =============================================================
--
-- patients.odontogram (Array of 32 teeth):
--   [
--     {
--       "id": 1,
--       "surfaces": [
--         {
--           "surface": "oclusal|incisal|vestibular|lingual|mesial|distal",
--           "condition": "healthy|caries|obturado|fractura|extraccion_indicada|
--                         tratamiento_conducto|corona_indicada|protesis_implante|
--                         ausente|implante_presente|corona_presente|en_observacion"
--         }
--       ]
--     }
--   ]
--
-- patients.odontogram_history (Snapshots over time):
--   [
--     { "id": "uuid", "date": "YYYY-MM-DD", "teeth": [ ...same as odontogram ] }
--   ]
--
-- patients.periodontogram (Periodontal chart):
--   {
--     "teeth": [
--       {
--         "toothId": 1,
--         "buccal": [
--           { "depth": 3, "recession": 0, "bleeding": false },  -- Mesial
--           { "depth": 3, "recession": 0, "bleeding": false },  -- Central
--           { "depth": 3, "recession": 0, "bleeding": false }   -- Distal
--         ],
--         "lingual": [ /* same 3-site structure */ ],
--         "mobility": 0,    -- 0|1|2|3
--         "furcation": 0    -- 0|1|2|3
--       }
--     ]
--   }
--
-- prescriptions.medications (Array of meds):
--   [
--     {
--       "name": "Amoxicilina",
--       "dosage": "500mg",
--       "frequency": "Cada 8 horas",
--       "duration": "7 días",
--       "instructions": "Tomar con alimentos"
--     }
--   ]
--
-- doctor_availability.weekly_schedule (7-day array):
--   [
--     {
--       "dayOfWeek": 0,     -- 0=Domingo .. 6=Sábado
--       "enabled": false,
--       "timeSlots": [
--         { "start": "09:00", "end": "12:00" }
--       ]
--     }
--   ]
--
-- booking_settings.available_types (String array):
--   ["Consulta", "Seguimiento", "Cirugía", "Revisión"]
--
-- =============================================================
-- Entity Relationships
-- =============================================================
--
--   auth.users
--       │
--       └── profiles (1:1)
--             │
--             ├── patients (1:N)
--             │     ├── appointments (1:N)
--             │     ├── evolution_notes (1:N)
--             │     ├── clinical_events (1:N)
--             │     ├── budget_items (1:N)
--             │     ├── payments (1:N)
--             │     ├── consent_forms (1:N)
--             │     └── prescriptions (1:N)
--             │
--             ├── doctor_availability (1:1)
--             ├── booking_settings (1:1)
--             └── appointment_requests (1:N)
--
-- =============================================================
-- Notes
-- =============================================================
-- • All patient-related tables cascade on patient delete
-- • Multi-tenant isolation via doctor_id + RLS (see supabase_rls.sql)
-- • Public booking tables allow anon SELECT (availability, settings)
--   and anon INSERT (appointment_requests)
-- • Soft delete on appointments (deleted_at column)
-- • JSONB columns store complex clinical data inline to avoid
--   excessive joins on frequently-accessed patient records
-- =============================================================
