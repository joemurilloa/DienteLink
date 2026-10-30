-- ARCHIVO HIST”RICO. NO EJECUTAR EN PRODUCCI”N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink ‚Äî Fase 6
-- Pegar despu√©s de phase5_public_booking_hardening.sql.
--
-- La recepcionista deja de leer notas, eventos cl√≠nicos,
-- consentimientos y recetas. Sigue viendo pacientes y citas.
-- Escribir esas tablas ya estaba limitado a owner, admin y assistant.
-- ============================================================

DROP POLICY IF EXISTS "Clinic staff can view evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors see own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "RBAC: Select evolution_notes" ON public.evolution_notes;
CREATE POLICY "RBAC: Select evolution_notes"
  ON public.evolution_notes
  FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(btrim(public.get_my_role())) IN ('owner', 'admin', 'assistant')
  );

DROP POLICY IF EXISTS "Clinic staff can view clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctors see own events" ON public.clinical_events;
DROP POLICY IF EXISTS "RBAC: Select clinical_events" ON public.clinical_events;
CREATE POLICY "RBAC: Select clinical_events"
  ON public.clinical_events
  FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(btrim(public.get_my_role())) IN ('owner', 'admin', 'assistant')
  );

DROP POLICY IF EXISTS "Clinic staff can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "RBAC: Select prescriptions" ON public.prescriptions;
CREATE POLICY "RBAC: Select prescriptions"
  ON public.prescriptions
  FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(btrim(public.get_my_role())) IN ('owner', 'admin', 'assistant')
  );

DROP POLICY IF EXISTS "Clinic staff can view consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "RBAC: Select consent_forms" ON public.consent_forms;
CREATE POLICY "RBAC: Select consent_forms"
  ON public.consent_forms
  FOR SELECT
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(btrim(public.get_my_role())) IN ('owner', 'admin', 'assistant')
  );
