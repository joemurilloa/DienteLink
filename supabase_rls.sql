-- =============================================================
-- DienteLink: Row Level Security (RLS) Policies
-- Run this ONCE in Supabase SQL Editor (app.supabase.com)
-- =============================================================

-- Sprint 1, Item 1: Currency columns on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'HNL';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'es-HN';

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
-- profiles: Users can only read/update their own profile
-- =============================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================================
-- patients: Doctors can only manage their own patients
-- =============================================================

CREATE POLICY "Doctors can view own patients"
  ON patients FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own patients"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own patients"
  ON patients FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own patients"
  ON patients FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- appointments
-- =============================================================

CREATE POLICY "Doctors can view own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own appointments"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own appointments"
  ON appointments FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- evolution_notes
-- =============================================================

CREATE POLICY "Doctors can view own evolution_notes"
  ON evolution_notes FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own evolution_notes"
  ON evolution_notes FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own evolution_notes"
  ON evolution_notes FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own evolution_notes"
  ON evolution_notes FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- clinical_events
-- =============================================================

CREATE POLICY "Doctors can view own clinical_events"
  ON clinical_events FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own clinical_events"
  ON clinical_events FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own clinical_events"
  ON clinical_events FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own clinical_events"
  ON clinical_events FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- budget_items
-- =============================================================

CREATE POLICY "Doctors can view own budget_items"
  ON budget_items FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own budget_items"
  ON budget_items FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own budget_items"
  ON budget_items FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own budget_items"
  ON budget_items FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- payments
-- =============================================================

CREATE POLICY "Doctors can view own payments"
  ON payments FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own payments"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own payments"
  ON payments FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own payments"
  ON payments FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- consent_forms
-- =============================================================

CREATE POLICY "Doctors can view own consent_forms"
  ON consent_forms FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own consent_forms"
  ON consent_forms FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own consent_forms"
  ON consent_forms FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own consent_forms"
  ON consent_forms FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- prescriptions
-- =============================================================

CREATE POLICY "Doctors can view own prescriptions"
  ON prescriptions FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own prescriptions"
  ON prescriptions FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own prescriptions"
  ON prescriptions FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own prescriptions"
  ON prescriptions FOR DELETE
  USING (auth.uid() = doctor_id);

-- =============================================================
-- doctor_availability
-- =============================================================

CREATE POLICY "Doctors can view own availability"
  ON doctor_availability FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own availability"
  ON doctor_availability FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own availability"
  ON doctor_availability FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own availability"
  ON doctor_availability FOR DELETE
  USING (auth.uid() = doctor_id);

-- Public: anyone can read a doctor's availability (for booking page)
CREATE POLICY "Public can view doctor availability"
  ON doctor_availability FOR SELECT
  USING (true);

-- =============================================================
-- booking_settings
-- =============================================================

CREATE POLICY "Doctors can manage own booking_settings"
  ON booking_settings FOR ALL
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

-- Public: anyone can read booking settings (for public booking page)
CREATE POLICY "Public can view booking_settings"
  ON booking_settings FOR SELECT
  USING (true);

-- =============================================================
-- appointment_requests
-- =============================================================

CREATE POLICY "Doctors can view own requests"
  ON appointment_requests FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own requests"
  ON appointment_requests FOR UPDATE
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own requests"
  ON appointment_requests FOR DELETE
  USING (auth.uid() = doctor_id);

-- Public: anyone can INSERT a request (public booking page, anon users)
CREATE POLICY "Public can submit appointment requests"
  ON appointment_requests FOR INSERT
  WITH CHECK (true);

-- =============================================================
-- Done! All tables are now protected with RLS.
-- Each doctor can only access their own data.
-- Public booking page can still read availability/settings
-- and submit appointment requests.
-- =============================================================
