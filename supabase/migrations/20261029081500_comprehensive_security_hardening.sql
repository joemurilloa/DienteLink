-- ==============================================================================
-- DienteLink — Migración de Endurecimiento Integral de Seguridad
-- Archivo: supabase/migrations/20261029081500_comprehensive_security_hardening.sql
--
-- Resuelve todas las vulnerabilidades críticas, altas y medias de la auditoría:
-- 1. activate_subscription: exige is_platform_admin() y revoca acceso a anon y PUBLIC.
-- 2. expire_overdue_subscriptions: revoca acceso a anon y authenticated (solo service_role).
-- 3. submit_payment_receipt: elimina el bucle infinito de 3 días de acceso provisional.
-- 4. trigger_check_appointment_request_spam: activa el disparador anti-spam en reservas.
-- 5. Limpieza de 25+ políticas permisivas superpuestas (elimina evaluación OR permisiva).
-- 6. trigger_check_patient_clinical_update: bloquea a recepcionistas de editar datos médicos en patients.
-- 7. Revoca TRUNCATE y permisos excesivos a anon en todas las tablas (defensa en profundidad).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BLINDAJE DE FUNCIONES CRÍTICAS (activate_subscription y expire_overdue_subscriptions)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_subscription(p_clinic_id uuid, p_months integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo el administrador de la plataforma puede activar suscripciones directamente
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de la plataforma puede activar suscripciones';
  END IF;

  IF p_months < 1 OR p_months > 36 THEN
    RAISE EXCEPTION 'Plazo inválido: debe ser entre 1 y 36 meses';
  END IF;

  UPDATE public.subscriptions
  SET
    status               = 'active',
    current_period_start = now(),
    current_period_end   = now() + (p_months || ' months')::interval,
    last_payment_at      = now(),
    updated_at           = now()
  WHERE clinic_id = p_clinic_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.activate_subscription(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_subscription(uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid, integer) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.expire_overdue_subscriptions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_overdue_subscriptions() FROM anon;
REVOKE ALL ON FUNCTION public.expire_overdue_subscriptions() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO service_role;

-- ------------------------------------------------------------------------------
-- 2. BLINDAJE DE COMPROBANTES DE PAGO (submit_payment_receipt)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.submit_payment_receipt(p_email_referencia text, p_notes text DEFAULT NULL::text)
RETURNS TABLE(receipt_id uuid, provisional_access_until timestamp with time zone, replaced boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_receipt_id uuid;
  v_provisional_until timestamptz;
  v_last_provisional timestamptz;
  v_replaced boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Buscar si ya existe un comprobante pendiente
  SELECT r.id, r.provisional_access_until
    INTO v_receipt_id, v_provisional_until
    FROM public.payment_receipts r
   WHERE r.clinic_id = v_user_id
     AND r.status = 'pending'
   ORDER BY r.created_at DESC
   LIMIT 1;

  IF v_receipt_id IS NOT NULL THEN
    -- Al reenviar información sobre un comprobante que ya está en revisión:
    -- NO se extiende la fecha provisional: se mantiene la que ya tenía asignada.
    UPDATE public.payment_receipts
       SET email_referencia = coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
           notes = nullif(trim(p_notes), '')
     WHERE id = v_receipt_id;
    v_replaced := true;
    RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
    RETURN;
  END IF;

  -- Comprobar si ya se le otorgó acceso provisional recientemente (en los últimos 30 días).
  -- Esto evita el bucle de llamar la función repetidamente cada 3 días para tener el servicio gratis.
  SELECT max(r.provisional_access_until)
    INTO v_last_provisional
    FROM public.payment_receipts r
   WHERE r.clinic_id = v_user_id;

  IF v_last_provisional IS NOT NULL AND v_last_provisional > (now() - interval '30 days') THEN
    -- Ya consumió su plazo provisional para este ciclo; no se renueva automáticamente.
    v_provisional_until := v_last_provisional;
  ELSE
    v_provisional_until := now() + interval '3 days';
  END IF;

  INSERT INTO public.payment_receipts (
    clinic_id,
    email_referencia,
    notes,
    status,
    provisional_access_until
  ) VALUES (
    v_user_id,
    coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
    nullif(trim(p_notes), ''),
    'pending',
    v_provisional_until
  )
  RETURNING id INTO v_receipt_id;

  RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text, text) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. ACTIVACIÓN DEL DISPARADOR ANTI-SPAM EN CITAS PÚBLICAS
-- ------------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_check_appointment_request_spam ON public.appointment_requests;
CREATE TRIGGER trigger_check_appointment_request_spam
BEFORE INSERT ON public.appointment_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_appointment_request_spam();

-- ------------------------------------------------------------------------------
-- 4. PROTECCIÓN DE DATOS MÉDICOS EN TABLA PATIENTS CONTRA ROL RECEPCIONISTA
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_patient_clinical_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := lower(coalesce(btrim(public.get_my_role()), ''));
  
  -- Si el usuario es recepcionista, prohibir alteraciones a campos clínicos
  IF v_role = 'receptionist' THEN
    IF NEW.odontogram IS DISTINCT FROM OLD.odontogram
       OR NEW.odontogram_history IS DISTINCT FROM OLD.odontogram_history
       OR NEW.periodontogram IS DISTINCT FROM OLD.periodontogram
       OR NEW.allergies IS DISTINCT FROM OLD.allergies
       OR NEW.medications IS DISTINCT FROM OLD.medications
       OR NEW.previous_diseases IS DISTINCT FROM OLD.previous_diseases
       OR NEW.family_history IS DISTINCT FROM OLD.family_history
       OR NEW.blood_type IS DISTINCT FROM OLD.blood_type
       OR NEW.pregnant IS DISTINCT FROM OLD.pregnant
       OR NEW.smoker IS DISTINCT FROM OLD.smoker
       OR NEW.habits IS DISTINCT FROM OLD.habits
       OR NEW.observations IS DISTINCT FROM OLD.observations THEN
      RAISE EXCEPTION 'Acceso denegado: El rol recepcionista solo puede modificar datos demográficos y de contacto del paciente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_check_patient_clinical_update ON public.patients;
CREATE TRIGGER trigger_check_patient_clinical_update
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.check_patient_clinical_update();

-- ------------------------------------------------------------------------------
-- 5. LIMPIEZA DE POLÍTICAS RLS SUPERPUESTAS / PERMISIVAS OBSOLETAS
-- ------------------------------------------------------------------------------

-- appointment_requests
DROP POLICY IF EXISTS "Public can create requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Public can submit appointment requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors can manage their own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors see own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Doctors update own requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic staff can delete requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic staff can update requests" ON public.appointment_requests;
DROP POLICY IF EXISTS "Clinic staff can view requests" ON public.appointment_requests;

-- Asegurar políticas canónicas y limpias para appointment_requests
DROP POLICY IF EXISTS "RBAC: Select appointment_requests" ON public.appointment_requests;
CREATE POLICY "RBAC: Select appointment_requests" ON public.appointment_requests
  FOR SELECT TO authenticated
  USING ((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()));

DROP POLICY IF EXISTS "RBAC: Update appointment_requests" ON public.appointment_requests;
CREATE POLICY "RBAC: Update appointment_requests" ON public.appointment_requests
  FOR UPDATE TO authenticated
  USING ((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()))
  WITH CHECK ((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()));

DROP POLICY IF EXISTS "RBAC: Delete appointment_requests" ON public.appointment_requests;
CREATE POLICY "RBAC: Delete appointment_requests" ON public.appointment_requests
  FOR DELETE TO authenticated
  USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])));

-- appointments
DROP POLICY IF EXISTS "Doctors can manage their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors see own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Doctors update own appointments" ON public.appointments;

-- clinical_events
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propios eventos" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propios eventos" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctors delete own events" ON public.clinical_events;
DROP POLICY IF EXISTS "Doctors insert own events" ON public.clinical_events;
DROP POLICY IF EXISTS "Owner Access" ON public.clinical_events;
DROP POLICY IF EXISTS "Clinic staff can view clinical_events" ON public.clinical_events;

-- consent_forms
DROP POLICY IF EXISTS "Owner Access" ON public.consent_forms;
DROP POLICY IF EXISTS "Clinic staff can view consent_forms" ON public.consent_forms;

-- prescriptions
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propias recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propias recetas" ON public.prescriptions;
DROP POLICY IF EXISTS "Owner Access" ON public.prescriptions;
DROP POLICY IF EXISTS "Clinic staff can view prescriptions" ON public.prescriptions;

-- evolution_notes
DROP POLICY IF EXISTS "Doctores pueden actualizar sus propias notas" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctores pueden insertar sus propias notas" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors delete own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Doctors insert own notes" ON public.evolution_notes;
DROP POLICY IF EXISTS "Owner Access" ON public.evolution_notes;
DROP POLICY IF EXISTS "Clinic staff can view evolution_notes" ON public.evolution_notes;

-- budget_items
DROP POLICY IF EXISTS "Owner Access" ON public.budget_items;

-- payments
DROP POLICY IF EXISTS "Owner Access" ON public.payments;

-- doctor_availability & booking_settings
DROP POLICY IF EXISTS "Doctors manage own availability" ON public.doctor_availability;
DROP POLICY IF EXISTS "Doctors manage own settings" ON public.booking_settings;

-- lab_works
DROP POLICY IF EXISTS "Doctors can delete their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can insert their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can update their own lab works" ON public.lab_works;
DROP POLICY IF EXISTS "Doctors can view their own lab works" ON public.lab_works;

DROP POLICY IF EXISTS "RBAC: Select lab_works" ON public.lab_works;
CREATE POLICY "RBAC: Select lab_works" ON public.lab_works
  FOR SELECT TO authenticated
  USING ((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()));

DROP POLICY IF EXISTS "RBAC: Insert lab_works" ON public.lab_works;
CREATE POLICY "RBAC: Insert lab_works" ON public.lab_works
  FOR INSERT TO authenticated
  WITH CHECK ((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()));

DROP POLICY IF EXISTS "RBAC: Update lab_works" ON public.lab_works;
CREATE POLICY "RBAC: Update lab_works" ON public.lab_works
  FOR UPDATE TO authenticated
  USING ((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()))
  WITH CHECK ((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()));

DROP POLICY IF EXISTS "RBAC: Delete lab_works" ON public.lab_works;
CREATE POLICY "RBAC: Delete lab_works" ON public.lab_works
  FOR DELETE TO authenticated
  USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text])));

-- patients
DROP POLICY IF EXISTS "Doctors delete own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors insert own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors see own patients" ON public.patients;
DROP POLICY IF EXISTS "Doctors update own patients" ON public.patients;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- ------------------------------------------------------------------------------
-- 6. DEFENSA EN PROFUNDIDAD A NIVEL DE TABLAS (REVOKE A ANON Y TRUNCATE)
-- ------------------------------------------------------------------------------

-- Quitar TRUNCATE a todos los roles públicos
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Quitar permisos indebidos concedidos a anon en tablas privadas
REVOKE ALL ON TABLE public.budget_items FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.clinical_events FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.consent_forms FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.evolution_notes FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.lab_works FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.patients FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.payment_receipts FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.payments FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.prescriptions FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.price_catalogs FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.profiles FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.subscription_status FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.subscriptions FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.team_invitations FROM anon, PUBLIC;
REVOKE ALL ON TABLE public.user_notifications FROM anon, PUBLIC;

-- anon solo necesita insertar solicitudes de reserva pública
GRANT INSERT ON TABLE public.appointment_requests TO anon;
