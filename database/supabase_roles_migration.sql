-- =============================================================
-- DienteLink: REPAIR SCRIPT — Restaurar acceso completo
-- Ejecuta esto en Supabase SQL Editor si tienes errores 403
-- =============================================================

-- ── PASO 1: Recrear función helper (SECURITY DEFINER evita loops) ──
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$;

-- ── PASO 2: Limpiar y recrear políticas de PROFILES ──────────────
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Ver tu propio perfil, o ver miembros de tu clínica
CREATE POLICY "Users can view relevant profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR clinic_id = auth.uid()
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ── PASO 3: Asegurar que el resto de tablas tienen sus políticas ──

-- patients
DROP POLICY IF EXISTS "Clinic staff can view patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can update patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can delete patients" ON public.patients;

CREATE POLICY "Clinic staff can view patients"   ON public.patients FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert patients" ON public.patients FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update patients" ON public.patients FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete patients" ON public.patients FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- appointments
DROP POLICY IF EXISTS "Clinic staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic staff can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic staff can delete appointments" ON public.appointments;

CREATE POLICY "Clinic staff can view appointments"   ON public.appointments FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert appointments" ON public.appointments FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update appointments" ON public.appointments FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete appointments" ON public.appointments FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- evolution_notes
DROP POLICY IF EXISTS "Clinic staff can view evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can insert evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can update evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can delete evolution_notes" ON public.evolution_notes;

CREATE POLICY "Clinic staff can view evolution_notes"   ON public.evolution_notes FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert evolution_notes" ON public.evolution_notes FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update evolution_notes" ON public.evolution_notes FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete evolution_notes" ON public.evolution_notes FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- clinical_events
DROP POLICY IF EXISTS "Clinic staff can view clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can insert clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can update clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can delete clinical_events" ON public.clinical_events;

CREATE POLICY "Clinic staff can view clinical_events"   ON public.clinical_events FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert clinical_events" ON public.clinical_events FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update clinical_events" ON public.clinical_events FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete clinical_events" ON public.clinical_events FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- budget_items
DROP POLICY IF EXISTS "Clinic staff can view budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "Clinic staff can insert budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "Clinic staff can update budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "Clinic staff can delete budget_items" ON public.budget_items;

CREATE POLICY "Clinic staff can view budget_items"   ON public.budget_items FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert budget_items" ON public.budget_items FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update budget_items" ON public.budget_items FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete budget_items" ON public.budget_items FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- payments
DROP POLICY IF EXISTS "Clinic staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Clinic staff can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Clinic staff can update payments" ON public.payments;
DROP POLICY IF EXISTS "Clinic staff can delete payments" ON public.payments;

CREATE POLICY "Clinic staff can view payments"   ON public.payments FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert payments" ON public.payments FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update payments" ON public.payments FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete payments" ON public.payments FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- consent_forms
DROP POLICY IF EXISTS "Clinic staff can view consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can insert consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can update consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can delete consent_forms" ON public.consent_forms;

CREATE POLICY "Clinic staff can view consent_forms"   ON public.consent_forms FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert consent_forms" ON public.consent_forms FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update consent_forms" ON public.consent_forms FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete consent_forms" ON public.consent_forms FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- prescriptions
DROP POLICY IF EXISTS "Clinic staff can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can delete prescriptions" ON public.prescriptions;

CREATE POLICY "Clinic staff can view prescriptions"   ON public.prescriptions FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update prescriptions" ON public.prescriptions FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete prescriptions" ON public.prescriptions FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- doctor_availability
DROP POLICY IF EXISTS "Clinic staff can view availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Clinic staff can insert availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Clinic staff can update availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Clinic staff can delete availability" ON public.doctor_availability;

CREATE POLICY "Clinic staff can view availability"   ON public.doctor_availability FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can insert availability" ON public.doctor_availability FOR INSERT WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update availability" ON public.doctor_availability FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete availability" ON public.doctor_availability FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- booking_settings
DROP POLICY IF EXISTS "Clinic staff can manage booking_settings" ON public.booking_settings;
CREATE POLICY "Clinic staff can manage booking_settings"
  ON public.booking_settings FOR ALL
  USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
  WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

-- appointment_requests
DROP POLICY IF EXISTS "Clinic staff can view requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic staff can update requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic staff can delete requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can submit appointment requests" ON public.appointment_requests;

CREATE POLICY "Clinic staff can view requests"   ON public.appointment_requests FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can update requests" ON public.appointment_requests FOR UPDATE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Clinic staff can delete requests" ON public.appointment_requests FOR DELETE USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "Public can submit appointment requests" ON public.appointment_requests FOR INSERT WITH CHECK (true);

-- ── PASO 4: Columnas de profiles y equipo ─────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'owner';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

UPDATE public.profiles SET role = 'owner' WHERE role IS NULL OR role = '' OR role = 'doctor';

-- ── PASO 5: team_invitations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_invitations (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clinic_id  UUID NOT NULL,
    email      TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'receptionist',
    status     TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view team invitations for their clinic" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can insert team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.team_invitations;

CREATE POLICY "Users can view team invitations for their clinic"
    ON public.team_invitations FOR SELECT
    USING (
        team_invitations.clinic_id = auth.uid()
        OR public.get_my_clinic_id() = team_invitations.clinic_id
        OR team_invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

CREATE POLICY "Admins can insert team invitations"
    ON public.team_invitations FOR INSERT
    WITH CHECK (
        team_invitations.clinic_id = auth.uid()
        OR public.get_my_clinic_id() = team_invitations.clinic_id
    );

CREATE POLICY "Users can update their own invitations"
    ON public.team_invitations FOR UPDATE
    USING (
        team_invitations.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR team_invitations.clinic_id = auth.uid()
        OR public.get_my_clinic_id() = team_invitations.clinic_id
    );

CREATE POLICY "Admins can delete invitations"
    ON public.team_invitations FOR DELETE
    USING (
        team_invitations.clinic_id = auth.uid()
        OR public.get_my_clinic_id() = team_invitations.clinic_id
    );

-- Índices
CREATE INDEX IF NOT EXISTS idx_team_invitations_email  ON public.team_invitations(email, status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_clinic ON public.team_invitations(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id      ON public.profiles(clinic_id);

-- ✅ Script de reparación completo
