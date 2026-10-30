-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Roles, equipo y solicitudes públicas
-- Pegar TODO en el SQL Editor de Supabase y ejecutar (Run).
--
-- 1) Nadie cambia su propio rol ni su clínica desde el cliente.
-- 2) El dueño o un admin sí puede cambiar el rol de su equipo,
--    quitar a un miembro y aceptar una invitación real.
-- 3) Una solicitud pública siempre nace en "pending" y solo
--    si ese consultorio existe. Un visitante no puede aprobarla.
-- 4) Invitar queda para el dueño (su id es la clínica) o un admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_clinic_manager(p_clinic_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND (
         p.id = p_clinic_id
         OR (p.clinic_id = p_clinic_id AND p.role IN ('owner', 'admin'))
       )
  );
$$;

REVOKE ALL ON FUNCTION public.is_clinic_manager(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_clinic_manager(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Perfil: role y clinic_id solo cambian dentro de las funciones
-- de este archivo. El resto del perfil (nombre, teléfono, etc.)
-- sigue editable.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('dientelink.profile_privilege', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'owner';
    NEW.clinic_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id THEN
    RAISE EXCEPTION 'No puedes cambiar tu rol ni tu clínica';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileges();

CREATE OR REPLACE FUNCTION public.set_team_member_role(p_member_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_member_id IS NULL OR p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol';
  END IF;
  IF p_role NOT IN ('admin', 'assistant', 'receptionist') THEN
    RAISE EXCEPTION 'Rol no permitido';
  END IF;

  SELECT clinic_id INTO v_clinic
    FROM public.profiles
   WHERE id = p_member_id;

  IF v_clinic IS NULL OR p_member_id = v_clinic THEN
    RAISE EXCEPTION 'No puedes cambiar el rol del propietario';
  END IF;
  IF NOT public.is_clinic_manager(v_clinic) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  PERFORM set_config('dientelink.profile_privilege', 'on', true);

  UPDATE public.profiles
     SET role = p_role,
         updated_at = now()
   WHERE id = p_member_id
     AND clinic_id = v_clinic;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_team_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clinic uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;
  IF p_member_id IS NULL OR p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes quitarte a ti mismo';
  END IF;

  SELECT clinic_id INTO v_clinic
    FROM public.profiles
   WHERE id = p_member_id;

  IF v_clinic IS NULL OR p_member_id = v_clinic THEN
    RAISE EXCEPTION 'No puedes quitar al propietario';
  END IF;
  IF NOT public.is_clinic_manager(v_clinic) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  PERFORM set_config('dientelink.profile_privilege', 'on', true);

  UPDATE public.profiles
     SET clinic_id = NULL,
         role = 'owner',
         updated_at = now()
   WHERE id = p_member_id
     AND clinic_id = v_clinic;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_team_invitation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.team_invitations%ROWTYPE;
  v_updated int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT lower(u.email)
    INTO v_email
    FROM auth.users u
   WHERE u.id = v_uid
     AND u.email_confirmed_at IS NOT NULL
     AND (
       auth.jwt() ->> 'email' IS NULL
       OR lower(auth.jwt() ->> 'email') = lower(u.email)
     );

  IF v_email IS NULL THEN
    RETURN false;
  END IF;

  SELECT *
    INTO v_invite
    FROM public.team_invitations
   WHERE lower(email) = v_email
     AND status = 'pending'
     AND role IN ('admin', 'assistant', 'receptionist')
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM set_config('dientelink.profile_privilege', 'on', true);

  UPDATE public.profiles
     SET clinic_id = v_invite.clinic_id,
         role = v_invite.role,
         updated_at = now()
   WHERE id = v_uid
     AND clinic_id IS NULL;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN false;
  END IF;

  UPDATE public.team_invitations
     SET status = 'accepted'
   WHERE id = v_invite.id
     AND status = 'pending';

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.set_team_member_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_team_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_team_invitation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_team_member_role(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.remove_team_member(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.redeem_team_invitation() FROM anon;
GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_team_invitation() TO authenticated;

-- ------------------------------------------------------------
-- Invitaciones: el dueño (su usuario es la clínica) o un admin.
-- Un asistente o un recepcionista no invita ni cambia el rol
-- de una invitación pendiente.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view team invitations for their clinic" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can insert team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Owners and admins can insert team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Owners and admins can update team invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON public.team_invitations;
DROP POLICY IF EXISTS "Owners and admins can delete team invitations" ON public.team_invitations;

CREATE POLICY "Users can view team invitations for their clinic"
  ON public.team_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.is_clinic_manager(clinic_id)
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "Owners and admins can insert team invitations"
  ON public.team_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_clinic_manager(clinic_id)
    AND role IN ('admin', 'assistant', 'receptionist')
    AND status = 'pending'
  );

CREATE POLICY "Owners and admins can update team invitations"
  ON public.team_invitations
  FOR UPDATE
  TO authenticated
  USING (public.is_clinic_manager(clinic_id))
  WITH CHECK (
    public.is_clinic_manager(clinic_id)
    AND role IN ('admin', 'assistant', 'receptionist')
  );

CREATE POLICY "Owners and admins can delete team invitations"
  ON public.team_invitations
  FOR DELETE
  TO authenticated
  USING (public.is_clinic_manager(clinic_id));

-- ------------------------------------------------------------
-- Solicitudes públicas
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_appointment_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.doctor_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.doctor_id) THEN
      RAISE EXCEPTION 'Este consultorio no está recibiendo citas por ahora';
    END IF;
    NEW.status := 'pending';
    NEW.responded_at := NULL;
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NEW.doctor_id IS DISTINCT FROM OLD.doctor_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF NOT (
    OLD.doctor_id = auth.uid()
    OR OLD.doctor_id = public.get_my_clinic_id()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_appointment_request ON public.appointment_requests;
CREATE TRIGGER trg_guard_appointment_request
  BEFORE INSERT OR UPDATE ON public.appointment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_appointment_request();

-- El anti-spam ya existía. Aquí solo se fija search_path.
CREATE OR REPLACE FUNCTION public.check_appointment_request_spam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_count int;
BEGIN
  SELECT count(*) INTO pending_count
    FROM public.appointment_requests
   WHERE doctor_id = NEW.doctor_id
     AND lower(patient_email) = lower(coalesce(NEW.patient_email, ''))
     AND status = 'pending';

  IF pending_count >= 3 THEN
    RAISE EXCEPTION 'Has alcanzado el límite de solicitudes pendientes para esta clínica. Por favor espera a que te respondan.';
  END IF;

  SELECT count(*) INTO pending_count
    FROM public.appointment_requests
   WHERE doctor_id = NEW.doctor_id
     AND status = 'pending';

  IF pending_count >= 500 THEN
    RAISE EXCEPTION 'Esta clínica está saturada y no puede recibir más solicitudes en este momento.';
  END IF;

  RETURN NEW;
END;
$$;
