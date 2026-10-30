-- Alto: admin/asistente/recepcionista no veían al dueño ni al resto del equipo.
-- get_my_clinic_id() es SECURITY DEFINER; no hay recursión de RLS.

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Clinic members can view clinic profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Clinic members can view clinic profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Dueño: ve perfiles con clinic_id = su uid
    clinic_id = auth.uid()
    -- Cualquier miembro: ve al dueño (id de la clínica)
    OR id = public.get_my_clinic_id()
    -- Miembros de la misma clínica se ven entre sí
    OR (
      clinic_id IS NOT NULL
      AND clinic_id = public.get_my_clinic_id()
    )
  );
