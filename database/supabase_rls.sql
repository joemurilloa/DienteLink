-- =============================================================
-- DienteLink: Row Level Security (RLS) Policies
-- Run this ONCE in Supabase SQL Editor (app.supabase.com)
-- =============================================================

-- Sprint 1, Item 1: Currency columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'HNL';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'es-HN';

-- Agregar soporte para equipos (Team Invitations)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clinic_id UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner';

-- =============================================================
-- Enable RLS on all tables
-- =============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE evolution_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- profiles: Users can read/update their own profile, 
-- or owners can view profiles of their clinic_id (Team Settings)
-- =============================================================

DROP POLICY IF EXISTS "Users can view relevant profiles" ON profiles;
CREATE POLICY "Users can view relevant profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id OR 
    clinic_id = auth.uid() -- Allows owner to see team members
  );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================
-- Funciones Auxiliares para Políticas RLS
-- =============================================================
-- Para evitar código duplicado y mejorar la eficiencia de las consultas,
-- creamos una función STABLE que cachea el clinic_id del usuario actual.
-- Esto previene el problema de rendimiento N+1 en las reglas RLS.

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$;

-- =============================================================
-- patients: Clinic staff can manage patients
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view patients" ON patients;
CREATE POLICY "Clinic staff can view patients"
  ON patients FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert patients" ON patients;
CREATE POLICY "Clinic staff can insert patients"
  ON patients FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update patients" ON patients;
CREATE POLICY "Clinic staff can update patients"
  ON patients FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete patients" ON patients;
CREATE POLICY "Clinic staff can delete patients"
  ON patients FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- appointments
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view appointments" ON appointments;
CREATE POLICY "Clinic staff can view appointments"
  ON appointments FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert appointments" ON appointments;
CREATE POLICY "Clinic staff can insert appointments"
  ON appointments FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update appointments" ON appointments;
CREATE POLICY "Clinic staff can update appointments"
  ON appointments FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete appointments" ON appointments;
CREATE POLICY "Clinic staff can delete appointments"
  ON appointments FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- evolution_notes
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view evolution_notes" ON evolution_notes;
CREATE POLICY "Clinic staff can view evolution_notes"
  ON evolution_notes FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert evolution_notes" ON evolution_notes;
CREATE POLICY "Clinic staff can insert evolution_notes"
  ON evolution_notes FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update evolution_notes" ON evolution_notes;
CREATE POLICY "Clinic staff can update evolution_notes"
  ON evolution_notes FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete evolution_notes" ON evolution_notes;
CREATE POLICY "Clinic staff can delete evolution_notes"
  ON evolution_notes FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- clinical_events
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view clinical_events" ON clinical_events;
CREATE POLICY "Clinic staff can view clinical_events"
  ON clinical_events FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert clinical_events" ON clinical_events;
CREATE POLICY "Clinic staff can insert clinical_events"
  ON clinical_events FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update clinical_events" ON clinical_events;
CREATE POLICY "Clinic staff can update clinical_events"
  ON clinical_events FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete clinical_events" ON clinical_events;
CREATE POLICY "Clinic staff can delete clinical_events"
  ON clinical_events FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- budget_items
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view budget_items" ON budget_items;
CREATE POLICY "Clinic staff can view budget_items"
  ON budget_items FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert budget_items" ON budget_items;
CREATE POLICY "Clinic staff can insert budget_items"
  ON budget_items FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update budget_items" ON budget_items;
CREATE POLICY "Clinic staff can update budget_items"
  ON budget_items FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete budget_items" ON budget_items;
CREATE POLICY "Clinic staff can delete budget_items"
  ON budget_items FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- payments
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view payments" ON payments;
CREATE POLICY "Clinic staff can view payments"
  ON payments FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert payments" ON payments;
CREATE POLICY "Clinic staff can insert payments"
  ON payments FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update payments" ON payments;
CREATE POLICY "Clinic staff can update payments"
  ON payments FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete payments" ON payments;
CREATE POLICY "Clinic staff can delete payments"
  ON payments FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- consent_forms
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view consent_forms" ON consent_forms;
CREATE POLICY "Clinic staff can view consent_forms"
  ON consent_forms FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert consent_forms" ON consent_forms;
CREATE POLICY "Clinic staff can insert consent_forms"
  ON consent_forms FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update consent_forms" ON consent_forms;
CREATE POLICY "Clinic staff can update consent_forms"
  ON consent_forms FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete consent_forms" ON consent_forms;
CREATE POLICY "Clinic staff can delete consent_forms"
  ON consent_forms FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- prescriptions
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view prescriptions" ON prescriptions;
CREATE POLICY "Clinic staff can view prescriptions"
  ON prescriptions FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert prescriptions" ON prescriptions;
CREATE POLICY "Clinic staff can insert prescriptions"
  ON prescriptions FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update prescriptions" ON prescriptions;
CREATE POLICY "Clinic staff can update prescriptions"
  ON prescriptions FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete prescriptions" ON prescriptions;
CREATE POLICY "Clinic staff can delete prescriptions"
  ON prescriptions FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- =============================================================
-- doctor_availability
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view availability" ON doctor_availability;
CREATE POLICY "Clinic staff can view availability"
  ON doctor_availability FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can insert availability" ON doctor_availability;
CREATE POLICY "Clinic staff can insert availability"
  ON doctor_availability FOR INSERT
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update availability" ON doctor_availability;
CREATE POLICY "Clinic staff can update availability"
  ON doctor_availability FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete availability" ON doctor_availability;
CREATE POLICY "Clinic staff can delete availability"
  ON doctor_availability FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- NOTE: Public access to doctor_availability has been removed to prevent data leakage.
-- Public booking page now uses the get_public_doctor_availability() RPC function.

-- =============================================================
-- booking_settings
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can manage booking_settings" ON booking_settings;
CREATE POLICY "Clinic staff can manage booking_settings"
  ON booking_settings FOR ALL
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- NOTE: Public access to booking_settings has been removed.
-- Public booking page now uses the get_public_booking_settings() RPC function.

-- =============================================================
-- appointment_requests
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view requests" ON appointment_requests;
CREATE POLICY "Clinic staff can view requests"
  ON appointment_requests FOR SELECT
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can update requests" ON appointment_requests;
CREATE POLICY "Clinic staff can update requests"
  ON appointment_requests FOR UPDATE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

DROP POLICY IF EXISTS "Clinic staff can delete requests" ON appointment_requests;
CREATE POLICY "Clinic staff can delete requests"
  ON appointment_requests FOR DELETE
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- Public: anyone can INSERT a request (public booking page, anon users)
DROP POLICY IF EXISTS "Public can submit appointment requests" ON appointment_requests;
CREATE POLICY "Public can submit appointment requests"
  ON appointment_requests FOR INSERT
  WITH CHECK (true);

-- =============================================================
-- Done! All tables are now protected with Multi-Tenant RLS.
-- Clinic owners and their staff can securely access their data.
-- =============================================================
