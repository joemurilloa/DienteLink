-- Altas de la auditoría: dinero alineado con quien puede leerlo,
-- filas con deleted_at ocultas en el SELECT, y borrar un paciente
-- solo lo pueden hacer owner/admin (el UPDATE ya no sirve de atajo).

-- ============================================================
-- 1. Pacientes: un miembro que no administra no marca deleted_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_patient_deleted_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN
    RETURN NEW;
  END IF;

  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF lower(btrim(coalesce(public.get_my_role(), ''))) IN ('owner', 'admin') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No autorizado para borrar o restaurar el paciente'
    USING ERRCODE = '42501';
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_patient_deleted_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_patient_deleted_at() FROM anon;
REVOKE ALL ON FUNCTION public.guard_patient_deleted_at() FROM authenticated;

DROP TRIGGER IF EXISTS trg_guard_patient_deleted_at ON public.patients;
CREATE TRIGGER trg_guard_patient_deleted_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_patient_deleted_at();

DROP POLICY IF EXISTS "RBAC: Update patients" ON public.patients;
CREATE POLICY "RBAC: Update patients" ON public.patients
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND (
      deleted_at IS NULL
      OR lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
    )
  )
  WITH CHECK (doctor_id = public.get_my_clinic_id());

-- ============================================================
-- 2. Dinero: la recepcionista no escribe lo que no puede leer
-- ============================================================

DROP POLICY IF EXISTS "RBAC: Insert budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Update budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Select budget_items" ON public.budget_items;

CREATE POLICY "RBAC: Select budget_items" ON public.budget_items
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
    AND deleted_at IS NULL
  );
CREATE POLICY "RBAC: Insert budget_items" ON public.budget_items
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Update budget_items" ON public.budget_items
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
  );

DROP POLICY IF EXISTS "RBAC: Insert payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Update payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Select payments" ON public.payments;

CREATE POLICY "RBAC: Select payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
    AND deleted_at IS NULL
  );
CREATE POLICY "RBAC: Insert payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
  );
CREATE POLICY "RBAC: Update payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
  );

-- ============================================================
-- 3. Expediente: el SELECT no devuelve filas con deleted_at
--    El USING del UPDATE tampoco deja resucitarlas.
-- ============================================================

DROP POLICY IF EXISTS "RBAC: Select evolution_notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "RBAC: Update evolution_notes" ON public.evolution_notes;
CREATE POLICY "RBAC: Select evolution_notes" ON public.evolution_notes
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  );
CREATE POLICY "RBAC: Update evolution_notes" ON public.evolution_notes
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );

DROP POLICY IF EXISTS "RBAC: Select clinical_events" ON public.clinical_events;
DROP POLICY IF EXISTS "RBAC: Update clinical_events" ON public.clinical_events;
CREATE POLICY "RBAC: Select clinical_events" ON public.clinical_events
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  );
CREATE POLICY "RBAC: Update clinical_events" ON public.clinical_events
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );

DROP POLICY IF EXISTS "RBAC: Select consent_forms" ON public.consent_forms;
DROP POLICY IF EXISTS "RBAC: Update consent_forms" ON public.consent_forms;
CREATE POLICY "RBAC: Select consent_forms" ON public.consent_forms
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  );
CREATE POLICY "RBAC: Update consent_forms" ON public.consent_forms
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );

DROP POLICY IF EXISTS "RBAC: Select prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "RBAC: Update prescriptions" ON public.prescriptions;
CREATE POLICY "RBAC: Select prescriptions" ON public.prescriptions
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  );
CREATE POLICY "RBAC: Update prescriptions" ON public.prescriptions
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text])
  );

DROP POLICY IF EXISTS "RBAC: Select lab_works" ON public.lab_works;
DROP POLICY IF EXISTS "RBAC: Update lab_works" ON public.lab_works;
CREATE POLICY "RBAC: Select lab_works" ON public.lab_works
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND deleted_at IS NULL
  );
CREATE POLICY "RBAC: Update lab_works" ON public.lab_works
  FOR UPDATE TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND deleted_at IS NULL
  )
  WITH CHECK (doctor_id = public.get_my_clinic_id());
