-- Aplicable sobre producción actual (después de 292200, antes de save_patient).
-- 1) anon no hereda GRANT sobre patient_clinical.
-- 2) Quien no puede leer pagos ni presupuestos tampoco los escribe.

REVOKE ALL ON TABLE public.patient_clinical FROM PUBLIC;
REVOKE ALL ON TABLE public.patient_clinical FROM anon;
REVOKE TRUNCATE ON TABLE public.patient_clinical FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patient_clinical TO authenticated;
GRANT ALL ON TABLE public.patient_clinical TO service_role;

DROP POLICY IF EXISTS "Owner Access" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Select budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Insert budget_items" ON public.budget_items;
DROP POLICY IF EXISTS "RBAC: Update budget_items" ON public.budget_items;

CREATE POLICY "RBAC: Select budget_items" ON public.budget_items
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
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
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
  );

DROP POLICY IF EXISTS "Owner Access" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Select payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Insert payments" ON public.payments;
DROP POLICY IF EXISTS "RBAC: Update payments" ON public.payments;

CREATE POLICY "RBAC: Select payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
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
  )
  WITH CHECK (
    doctor_id = public.get_my_clinic_id()
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text])
  );
