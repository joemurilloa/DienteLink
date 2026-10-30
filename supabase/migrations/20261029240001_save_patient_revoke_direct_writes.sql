-- PLACEHOLDER: el bloque REVOKE/GRANT está comentado a propósito.
-- db push a un desechable ejecuta este archivo y NO revoca nada (solo el SELECT notice).
-- Si algún día se descomenta aquí, flag OFF + legacy rompe el guardado en esa base.
--
-- Activar (descomentar) SOLO DESPUÉS del cutover: flag on + sin writes directos.
-- SELECT se mantiene (lectura vía RLS).

/*
REVOKE INSERT, UPDATE, DELETE ON TABLE public.evolution_notes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.clinical_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.budget_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.payments FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.consent_forms FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.prescriptions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.lab_works FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.patient_clinical FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.patients FROM authenticated;

-- Lectura
GRANT SELECT ON TABLE public.evolution_notes TO authenticated;
GRANT SELECT ON TABLE public.clinical_events TO authenticated;
GRANT SELECT ON TABLE public.budget_items TO authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;
GRANT SELECT ON TABLE public.consent_forms TO authenticated;
GRANT SELECT ON TABLE public.prescriptions TO authenticated;
GRANT SELECT ON TABLE public.lab_works TO authenticated;
GRANT SELECT ON TABLE public.patient_clinical TO authenticated;
GRANT SELECT ON TABLE public.patients TO authenticated;
*/

SELECT 'save_patient revoke: migración placeholder — no revoca aún' AS notice;
