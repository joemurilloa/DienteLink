-- =============================================================
-- DienteLink: STRICT Row Level Security (RLS) Policies (RBAC)
-- Run this in Supabase SQL Editor (app.supabase.com)
-- =============================================================

-- =============================================================
-- 1. Helper Functions (STABLE, SECURITY DEFINER)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- =============================================================
-- 2. Clean up Old Loose Policies
-- =============================================================

DROP POLICY IF EXISTS "Clinic staff can view patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can update patients" ON public.patients;
DROP POLICY IF EXISTS "Clinic staff can delete patients" ON public.patients;

DROP POLICY IF EXISTS "Clinic staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic staff can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic staff can update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Clinic staff can delete appointments" ON public.appointments;

DROP POLICY IF EXISTS "Clinic staff can view evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can insert evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can update evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can delete evolution_notes" ON public.evolution_notes;

DROP POLICY IF EXISTS "Clinic staff can view clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can insert clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can update clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can delete clinical_events" ON public.clinical_events;

DROP POLICY IF EXISTS "Clinic staff can view budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "Clinic staff can insert budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "Clinic staff can update budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "Clinic staff can delete budget_items" ON public.budget_items;

DROP POLICY IF EXISTS "Clinic staff can view payments" ON public.payments;
DROP POLICY IF EXISTS "Clinic staff can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Clinic staff can update payments" ON public.payments;
DROP POLICY IF EXISTS "Clinic staff can delete payments" ON public.payments;

DROP POLICY IF EXISTS "Clinic staff can view consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can insert consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can update consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can delete consent_forms" ON public.consent_forms;

DROP POLICY IF EXISTS "Clinic staff can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can update prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can delete prescriptions" ON public.prescriptions;

DROP POLICY IF EXISTS "Clinic staff can view availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Clinic staff can insert availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Clinic staff can update availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Clinic staff can delete availability" ON public.doctor_availability;

DROP POLICY IF EXISTS "Clinic staff can manage booking_settings" ON public.booking_settings;

-- =============================================================
-- 3. APPLY STRICT ROLE-BASED POLICIES
-- Roles: 'owner', 'admin', 'assistant', 'receptionist'
-- =============================================================

-- -------------------------------------------------------------
-- PATIENTS (All roles can Read, Insert, Update. ONLY Owner/Admin can Delete)
-- -------------------------------------------------------------
CREATE POLICY "RBAC: Select patients" ON public.patients FOR SELECT 
USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

CREATE POLICY "RBAC: Insert patients" ON public.patients FOR INSERT 
WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

CREATE POLICY "RBAC: Update patients" ON public.patients FOR UPDATE 
USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) 
WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

CREATE POLICY "RBAC: Delete patients" ON public.patients FOR DELETE 
USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- -------------------------------------------------------------
-- APPOINTMENTS (All roles can Read, Insert, Update. ONLY Owner/Admin can Delete)
-- -------------------------------------------------------------
CREATE POLICY "RBAC: Select appointments" ON public.appointments FOR SELECT 
USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

CREATE POLICY "RBAC: Insert appointments" ON public.appointments FOR INSERT 
WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

CREATE POLICY "RBAC: Update appointments" ON public.appointments FOR UPDATE 
USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) 
WITH CHECK (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());

CREATE POLICY "RBAC: Delete appointments" ON public.appointments FOR DELETE 
USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- -------------------------------------------------------------
-- CLINICAL DATA (Evolution Notes, Clinical Events/Odontogram, Consent Forms, Prescriptions)
-- ONLY Owner, Admin, Assistant can Insert/Update. Receptionist is Read-Only.
-- -------------------------------------------------------------
-- Evolution Notes
CREATE POLICY "RBAC: Select evolution_notes" ON public.evolution_notes FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert evolution_notes" ON public.evolution_notes FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Update evolution_notes" ON public.evolution_notes FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Delete evolution_notes" ON public.evolution_notes FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- Clinical Events
CREATE POLICY "RBAC: Select clinical_events" ON public.clinical_events FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert clinical_events" ON public.clinical_events FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Update clinical_events" ON public.clinical_events FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Delete clinical_events" ON public.clinical_events FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- Consent Forms
CREATE POLICY "RBAC: Select consent_forms" ON public.consent_forms FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert consent_forms" ON public.consent_forms FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Update consent_forms" ON public.consent_forms FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Delete consent_forms" ON public.consent_forms FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- Prescriptions
CREATE POLICY "RBAC: Select prescriptions" ON public.prescriptions FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert prescriptions" ON public.prescriptions FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Update prescriptions" ON public.prescriptions FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'assistant'));
CREATE POLICY "RBAC: Delete prescriptions" ON public.prescriptions FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- -------------------------------------------------------------
-- FINANCIAL DATA (Budget Items, Payments)
-- ONLY Owner, Admin, Receptionist can Insert/Update. Assistant is Read-Only.
-- -------------------------------------------------------------
-- Budget Items
CREATE POLICY "RBAC: Select budget_items" ON public.budget_items FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert budget_items" ON public.budget_items FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'receptionist'));
CREATE POLICY "RBAC: Update budget_items" ON public.budget_items FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'receptionist'));
CREATE POLICY "RBAC: Delete budget_items" ON public.budget_items FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- Payments
CREATE POLICY "RBAC: Select payments" ON public.payments FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert payments" ON public.payments FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'receptionist'));
CREATE POLICY "RBAC: Update payments" ON public.payments FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin', 'receptionist'));
CREATE POLICY "RBAC: Delete payments" ON public.payments FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- -------------------------------------------------------------
-- SETTINGS (Booking Settings, Doctor Availability)
-- ONLY Owner and Admin can Insert/Update/Delete. Others Read-Only.
-- -------------------------------------------------------------
-- Booking Settings
CREATE POLICY "RBAC: Select booking_settings" ON public.booking_settings FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert booking_settings" ON public.booking_settings FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));
CREATE POLICY "RBAC: Update booking_settings" ON public.booking_settings FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));
CREATE POLICY "RBAC: Delete booking_settings" ON public.booking_settings FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- Doctor Availability
CREATE POLICY "RBAC: Select doctor_availability" ON public.doctor_availability FOR SELECT USING (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id());
CREATE POLICY "RBAC: Insert doctor_availability" ON public.doctor_availability FOR INSERT WITH CHECK ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));
CREATE POLICY "RBAC: Update doctor_availability" ON public.doctor_availability FOR UPDATE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));
CREATE POLICY "RBAC: Delete doctor_availability" ON public.doctor_availability FOR DELETE USING ((doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id()) AND public.get_my_role() IN ('owner', 'admin'));

-- =============================================================
-- DONE. STRICT MULTI-TENANT RBAC SECURED.
-- =============================================================
