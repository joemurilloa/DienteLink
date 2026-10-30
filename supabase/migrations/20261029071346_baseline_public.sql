-- Baseline del esquema public de DienteLink.
-- Tomado del proyecto en vivo el 2026-10-29. No incluye datos de pacientes.
-- Esta version ya esta aplicada en produccion. No la vuelvas a ejecutar ahi.
-- Los scripts de database/ quedan como archivo historico.
-- El siguiente cambio de esquema es un archivo nuevo en supabase/migrations.
-- Las politicas de Storage no salen aqui: el rol de la CLI no lee ese esquema.
-- Siguen aplicadas en produccion y documentadas en database/supabase_storage_receipts.sql
-- y database/phase1_access_hardening.sql.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


-- Tablas

CREATE TABLE public.appointment_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  doctor_id uuid NOT NULL,
  patient_name text NOT NULL,
  patient_email text,
  patient_phone text,
  requested_date text NOT NULL,
  requested_time text NOT NULL,
  appointment_type text DEFAULT 'Consulta'::text NOT NULL,
  message text,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  notified_at timestamp with time zone
);

CREATE TABLE public.appointments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  doctor_id uuid NOT NULL,
  patient_id uuid,
  patient_name text NOT NULL,
  phone_number text,
  "time" text NOT NULL,
  date text NOT NULL,
  type text DEFAULT 'Consulta'::text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  reminder_status text DEFAULT 'not_sent'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  reminder_scheduled_at timestamp with time zone,
  patient_confirmation text,
  patient_replied_at timestamp with time zone,
  whatsapp_message_id text,
  telefono text,
  rejection_reason text
);

CREATE TABLE public.booking_settings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  doctor_id uuid NOT NULL,
  doctor_name text DEFAULT ''::text,
  clinic_name text DEFAULT ''::text,
  description text DEFAULT ''::text,
  available_types text[] DEFAULT ARRAY['Consulta'::text, 'Seguimiento'::text, 'Revisión'::text],
  require_phone boolean DEFAULT true,
  require_message boolean DEFAULT false,
  confirmation_message text DEFAULT ''::text,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.budget_items (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  patient_id uuid,
  doctor_id uuid,
  treatment text NOT NULL,
  tooth_id integer,
  unit_cost numeric NOT NULL,
  quantity integer NOT NULL,
  status text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.clinical_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  date text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  tooth_id integer,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.consent_forms (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  patient_id uuid,
  doctor_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  signature_data text NOT NULL,
  signed_at text NOT NULL,
  witness_name text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.doctor_availability (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  doctor_id uuid NOT NULL,
  weekly_schedule jsonb DEFAULT '[]'::jsonb NOT NULL,
  slot_duration integer DEFAULT 30,
  buffer_time integer DEFAULT 15,
  advance_booking_days integer DEFAULT 30,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.evolution_notes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  date text NOT NULL,
  content text NOT NULL,
  procedure text DEFAULT ''::text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.lab_works (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  description text NOT NULL,
  lab_name text NOT NULL,
  sent_date text NOT NULL,
  expected_date text,
  cost numeric DEFAULT 0 NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.patients (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  doctor_id uuid NOT NULL,
  full_name text NOT NULL,
  birth_date text,
  gender text,
  address text,
  phone text,
  email text,
  occupation text,
  allergies text[] DEFAULT '{}'::text[],
  medications text DEFAULT ''::text,
  previous_diseases text DEFAULT ''::text,
  family_history text DEFAULT ''::text,
  motive_of_consult text DEFAULT ''::text,
  consent_signed boolean DEFAULT false,
  odontogram jsonb DEFAULT '[]'::jsonb,
  odontogram_history jsonb DEFAULT '[]'::jsonb,
  periodontogram jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  blood_type text,
  smoker boolean,
  pregnant boolean,
  habits text,
  observations text
);

CREATE TABLE public.payment_receipts (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  clinic_id uuid NOT NULL,
  email_referencia text NOT NULL,
  amount_paid numeric(10,2),
  image_url text,
  storage_path text,
  notes text,
  status text DEFAULT 'pending'::text NOT NULL,
  reviewed_at timestamp with time zone,
  reviewed_note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  provisional_access_until timestamp with time zone
);

CREATE TABLE public.payments (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  patient_id uuid,
  doctor_id uuid,
  amount numeric NOT NULL,
  method text NOT NULL,
  note text,
  date text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.prescriptions (
  id uuid DEFAULT uuid_generate_v4() NOT NULL,
  patient_id uuid,
  doctor_id uuid,
  date text NOT NULL,
  diagnosis text NOT NULL,
  medications jsonb DEFAULT '[]'::jsonb NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.price_catalogs (
  doctor_id uuid NOT NULL,
  items jsonb DEFAULT '[]'::jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'owner'::text NOT NULL,
  clinic_name text DEFAULT 'Mi Clínica'::text,
  phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  currency text DEFAULT 'HNL'::text,
  locale text DEFAULT 'es-HN'::text,
  has_completed_onboarding boolean DEFAULT false,
  clinic_id uuid
);

CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  clinic_id uuid NOT NULL,
  status text DEFAULT 'inactive'::text NOT NULL,
  plan text DEFAULT 'monthly'::text NOT NULL,
  amount numeric(10,2) DEFAULT 15.00 NOT NULL,
  currency text DEFAULT 'USD'::text NOT NULL,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  last_payment_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  trial_started_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.team_invitations (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  clinic_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.user_notifications (
  id text NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  action_path text,
  dedupe_key text
);

-- Restricciones

ALTER TABLE public.appointment_requests ADD CONSTRAINT appointment_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.appointment_requests ADD CONSTRAINT appointment_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public.appointments ADD CONSTRAINT appointments_patient_confirmation_check CHECK ((patient_confirmation = ANY (ARRAY['confirmed'::text, 'cancelled'::text, 'reschedule'::text])));

ALTER TABLE public.appointments ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);

ALTER TABLE public.appointments ADD CONSTRAINT appointments_reminder_status_check CHECK ((reminder_status = ANY (ARRAY['not_sent'::text, 'sending'::text, 'sent'::text, 'error'::text])));

ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['Programada'::text, 'Completada'::text, 'Retrasada'::text, 'Eliminada'::text, 'pending'::text, 'confirmed'::text, 'completed'::text, 'rejected'::text, 'cancelled'::text, 'delayed'::text])));

ALTER TABLE public.booking_settings ADD CONSTRAINT booking_settings_doctor_id_key UNIQUE (doctor_id);

ALTER TABLE public.booking_settings ADD CONSTRAINT booking_settings_pkey PRIMARY KEY (id);

ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_pkey PRIMARY KEY (id);

ALTER TABLE public.clinical_events ADD CONSTRAINT clinical_events_pkey PRIMARY KEY (id);

ALTER TABLE public.clinical_events ADD CONSTRAINT clinical_events_type_check CHECK ((type = ANY (ARRAY['treatment'::text, 'extraction'::text, 'cleaning'::text, 'diagnose'::text, 'other'::text])));

ALTER TABLE public.consent_forms ADD CONSTRAINT consent_forms_pkey PRIMARY KEY (id);

ALTER TABLE public.doctor_availability ADD CONSTRAINT doctor_availability_doctor_id_key UNIQUE (doctor_id);

ALTER TABLE public.doctor_availability ADD CONSTRAINT doctor_availability_pkey PRIMARY KEY (id);

ALTER TABLE public.evolution_notes ADD CONSTRAINT evolution_notes_pkey PRIMARY KEY (id);

ALTER TABLE public.lab_works ADD CONSTRAINT lab_works_pkey PRIMARY KEY (id);

ALTER TABLE public.patients ADD CONSTRAINT patients_pkey PRIMARY KEY (id);

ALTER TABLE public.payment_receipts ADD CONSTRAINT payment_receipts_pkey PRIMARY KEY (id);

ALTER TABLE public.payment_receipts ADD CONSTRAINT payment_receipts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public.payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.price_catalogs ADD CONSTRAINT price_catalogs_pkey PRIMARY KEY (doctor_id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK ((lower(btrim(role)) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text, 'receptionist'::text])));

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_clinic_id_key UNIQUE (clinic_id);

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text, 'trial'::text, 'expired'::text])));

ALTER TABLE public.team_invitations ADD CONSTRAINT team_invitations_pkey PRIMARY KEY (id);

ALTER TABLE public.user_notifications ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.appointment_requests ADD CONSTRAINT appointment_requests_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.appointments ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.booking_settings ADD CONSTRAINT booking_settings_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.budget_items ADD CONSTRAINT budget_items_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.clinical_events ADD CONSTRAINT clinical_events_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.clinical_events ADD CONSTRAINT clinical_events_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.consent_forms ADD CONSTRAINT consent_forms_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.consent_forms ADD CONSTRAINT consent_forms_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.doctor_availability ADD CONSTRAINT doctor_availability_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.evolution_notes ADD CONSTRAINT evolution_notes_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.evolution_notes ADD CONSTRAINT evolution_notes_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.lab_works ADD CONSTRAINT lab_works_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.lab_works ADD CONSTRAINT lab_works_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.patients ADD CONSTRAINT patients_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payment_receipts ADD CONSTRAINT payment_receipts_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.payments ADD CONSTRAINT payments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payments ADD CONSTRAINT payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions ADD CONSTRAINT prescriptions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public.price_catalogs ADD CONSTRAINT price_catalogs_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_notifications ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Indices

CREATE INDEX idx_appointment_requests_doctor ON public.appointment_requests USING btree (doctor_id, status);

CREATE INDEX idx_appointments_doctor_date ON public.appointments USING btree (doctor_id, date);

CREATE INDEX idx_appointments_reminder ON public.appointments USING btree (reminder_scheduled_at, reminder_status) WHERE (reminder_status = 'pending'::text);

CREATE INDEX idx_budget_items_patient_doc ON public.budget_items USING btree (patient_id, doctor_id);

CREATE INDEX idx_clinical_events_patient ON public.clinical_events USING btree (patient_id);

CREATE INDEX idx_consent_forms_patient_doc ON public.consent_forms USING btree (patient_id, doctor_id);

CREATE INDEX idx_evolution_notes_patient ON public.evolution_notes USING btree (patient_id);

CREATE INDEX idx_evolution_notes_patient_doc ON public.evolution_notes USING btree (patient_id, doctor_id);

CREATE INDEX idx_lab_works_patient ON public.lab_works USING btree (doctor_id, patient_id);

CREATE INDEX idx_patients_doctor ON public.patients USING btree (doctor_id);

CREATE INDEX idx_patients_not_deleted ON public.patients USING btree (doctor_id, deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_payment_receipts_clinic_id ON public.payment_receipts USING btree (clinic_id);

CREATE INDEX idx_payment_receipts_provisional_access ON public.payment_receipts USING btree (clinic_id, provisional_access_until DESC);

CREATE INDEX idx_payment_receipts_status ON public.payment_receipts USING btree (status, created_at DESC);

CREATE INDEX idx_payments_patient_doc ON public.payments USING btree (patient_id, doctor_id);

CREATE INDEX idx_prescriptions_patient_doc ON public.prescriptions USING btree (patient_id, doctor_id);

CREATE INDEX idx_profiles_clinic_id ON public.profiles USING btree (clinic_id);

CREATE INDEX idx_subscriptions_clinic_id ON public.subscriptions USING btree (clinic_id);

CREATE INDEX idx_team_invitations_clinic ON public.team_invitations USING btree (clinic_id, status);

CREATE INDEX idx_team_invitations_email ON public.team_invitations USING btree (email, status);

CREATE INDEX user_notifications_user_created ON public.user_notifications USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX user_notifications_dedupe ON public.user_notifications USING btree (user_id, dedupe_key) WHERE (dedupe_key IS NOT NULL);

-- Funciones

CREATE OR REPLACE FUNCTION public.activate_subscription(p_clinic_id uuid, p_months integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
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

CREATE OR REPLACE FUNCTION public.admin_extend_subscription(p_clinic_id uuid, p_days integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_end timestamptz;
  v_base timestamptz;
  v_new_end timestamptz;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_days NOT IN (30, 60, 90, 365) THEN
    RAISE EXCEPTION 'Solo se pueden sumar 30, 60, 90 o 365 días';
  END IF;

  SELECT s.current_period_end
    INTO v_current_end
    FROM public.subscriptions s
   WHERE s.clinic_id = p_clinic_id;

  v_base := CASE
    WHEN v_current_end IS NOT NULL AND v_current_end > now() THEN v_current_end
    ELSE now()
  END;
  v_new_end := v_base + (p_days || ' days')::interval;

  INSERT INTO public.subscriptions (
    clinic_id,
    status,
    plan,
    amount,
    currency,
    current_period_start,
    current_period_end,
    last_payment_at,
    trial_started_at,
    updated_at
  ) VALUES (
    p_clinic_id,
    'active',
    CASE WHEN p_days = 365 THEN 'yearly' ELSE 'manual' END,
    250,
    'HNL',
    now(),
    v_new_end,
    now(),
    now(),
    now()
  )
  ON CONFLICT (clinic_id) DO UPDATE SET
    status               = 'active',
    plan                 = EXCLUDED.plan,
    amount               = EXCLUDED.amount,
    currency             = EXCLUDED.currency,
    current_period_start = now(),
    current_period_end   = v_new_end,
    last_payment_at      = now(),
    updated_at           = now();

  UPDATE public.payment_receipts
     SET status = 'approved',
         reviewed_at = now(),
         reviewed_note = 'Activado manualmente +' || p_days || ' días'
   WHERE clinic_id = p_clinic_id
     AND status = 'pending';

  RETURN jsonb_build_object(
    'clinic_id', p_clinic_id,
    'days_added', p_days,
    'period_end', v_new_end,
    'days_left', GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_new_end - now())) / 86400))::int
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_clinics()
 RETURNS TABLE(clinic_id uuid, full_name text, clinic_name text, email text, status text, is_trial boolean, period_end timestamp with time zone, days_left integer, pending_receipts integer, last_payment_at timestamp with time zone, receipts jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.clinic_name,
    au.email::text,
    COALESCE(s.status, 'inactive'),
    (COALESCE(s.status, 'inactive') = 'trial'),
    s.current_period_end,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.current_period_end - now())) / 86400))::int,
    COALESCE(pr.pending_count, 0),
    s.last_payment_at,
    COALESCE(rc.receipts, '[]'::jsonb)
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.subscriptions s ON s.clinic_id = p.id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS pending_count
    FROM public.payment_receipts r
    WHERE r.clinic_id = p.id AND r.status = 'pending'
  ) pr ON true
  LEFT JOIN LATERAL (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'image_url', r.image_url,
      'created_at', r.created_at,
      'notes', r.notes,
      'status', r.status,
      'amount_paid', r.amount_paid,
      'email_referencia', r.email_referencia,
      'reviewed_note', r.reviewed_note,
      'provisional_access_until', r.provisional_access_until
    ) ORDER BY r.created_at DESC), '[]'::jsonb) AS receipts
    FROM public.payment_receipts r
    WHERE r.clinic_id = p.id
  ) rc ON true
  WHERE p.clinic_id IS NULL OR p.clinic_id = p.id
  ORDER BY
    COALESCE(pr.pending_count, 0) DESC,
    CASE
      WHEN s.current_period_end IS NULL OR s.current_period_end <= now() THEN 0
      ELSE 1
    END,
    p.full_name;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reject_pending_receipts(p_clinic_id uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.payment_receipts
     SET status = 'rejected',
         reviewed_at = now(),
         reviewed_note = coalesce(nullif(trim(p_note), ''), 'Rechazado por el administrador'),
         provisional_access_until = NULL
   WHERE clinic_id = p_clinic_id
     AND status = 'pending';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'clinic_id', p_clinic_id,
    'rejected_count', v_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.block_bookings_if_unpaid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.clinic_has_paid_access(NEW.doctor_id) THEN
    RAISE EXCEPTION 'Este consultorio no está recibiendo citas por ahora';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_appointment_request_spam()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  pending_count int;
BEGIN
  SELECT count(*) INTO pending_count
    FROM public.appointment_requests
   WHERE doctor_id = NEW.doctor_id
     AND patient_email = NEW.patient_email
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
$function$;

-- Definidas antes de clinic_access_until / current_clinic_has_paid_access
-- (LANGUAGE sql valida dependencias al CREATE; el dump original iba en orden alfabético).
CREATE OR REPLACE FUNCTION public.get_my_clinic_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.clinic_access_until(p_clinic_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  IF p_clinic_id IS DISTINCT FROM auth.uid()
     AND p_clinic_id IS DISTINCT FROM public.get_my_clinic_id() THEN
    RETURN NULL;
  END IF;

  SELECT max(until_at)
    INTO v_until
    FROM (
      SELECT s.current_period_end AS until_at
        FROM public.subscriptions s
       WHERE s.clinic_id = p_clinic_id
         AND s.status IN ('active', 'trial')
         AND s.current_period_end > now()
      UNION ALL
      SELECT r.provisional_access_until
        FROM public.payment_receipts r
       WHERE r.clinic_id = p_clinic_id
         AND r.status = 'pending'
         AND r.provisional_access_until > now()
    ) ends;

  RETURN v_until;
END;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_has_paid_access(p_clinic_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
        FROM public.subscriptions s
       WHERE s.clinic_id = p_clinic_id
         AND s.status IN ('active', 'trial')
         AND s.current_period_end > now()
    )
    OR EXISTS (
      SELECT 1
        FROM public.payment_receipts r
       WHERE r.clinic_id = p_clinic_id
         AND r.status = 'pending'
         AND r.provisional_access_until > now()
    );
$function$;

CREATE OR REPLACE FUNCTION public.create_trial_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (
    clinic_id,
    status,
    plan,
    amount,
    currency,
    trial_started_at,
    current_period_start,
    current_period_end,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    'trial',
    'monthly',
    15.00,
    'USD',
    now(),
    now(),
    now() + interval '14 days',
    now(),
    now()
  )
  ON CONFLICT (clinic_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.current_clinic_has_paid_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.clinic_has_paid_access(coalesce(public.get_my_clinic_id(), auth.uid()));
$function$;

CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.subscriptions
  SET
    status     = 'expired',
    updated_at = now()
  WHERE
    status IN ('trial', 'active')
    AND current_period_end < now();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_appointment_requests(p_doctor_id uuid)
 RETURNS TABLE(requested_date text, requested_time text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ar.requested_date, ar.requested_time
    FROM public.appointment_requests ar
    JOIN public.booking_settings b ON b.doctor_id = ar.doctor_id
   WHERE ar.doctor_id = p_doctor_id
     AND ar.status IN ('pending', 'approved')
     AND ar.requested_date >= to_char((now() AT TIME ZONE 'America/Tegucigalpa')::date, 'YYYY-MM-DD')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$function$;

CREATE OR REPLACE FUNCTION public.get_public_appointments(p_doctor_id uuid)
 RETURNS TABLE(date text, "time" text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT a.date, a.time
    FROM public.appointments a
    JOIN public.booking_settings b ON b.doctor_id = a.doctor_id
   WHERE a.doctor_id = p_doctor_id
     AND a.status = 'Programada'
     AND a.date >= to_char((now() AT TIME ZONE 'America/Tegucigalpa')::date, 'YYYY-MM-DD')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$function$;

CREATE OR REPLACE FUNCTION public.get_public_booking_settings(p_doctor_id uuid)
 RETURNS SETOF booking_settings
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT b.*
    FROM public.booking_settings b
   WHERE b.doctor_id = p_doctor_id
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$function$;

CREATE OR REPLACE FUNCTION public.get_public_doctor_availability(p_doctor_id uuid)
 RETURNS SETOF doctor_availability
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.*
    FROM public.doctor_availability d
   WHERE d.doctor_id = p_doctor_id
     AND public.clinic_has_paid_access(p_doctor_id);
$function$;

CREATE OR REPLACE FUNCTION public.guard_appointment_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Doctor'),
    'Odontólogo'
  );
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_clinic_manager(p_clinic_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id = auth.uid()
       AND (
         p.id = p_clinic_id
         OR (p.clinic_id = p_clinic_id AND p.role IN ('owner', 'admin'))
       )
  );
$function$;

-- Stub: la definición real (tabla platform_admins) llega en migraciones posteriores.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT false;
$function$;

CREATE OR REPLACE FUNCTION public.notify_new_appointment_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  hook_secret text;
BEGIN
  BEGIN
    SELECT ds.decrypted_secret
      INTO hook_secret
      FROM vault.decrypted_secrets ds
     WHERE ds.name = 'notify_webhook_secret'
     ORDER BY ds.created_at DESC
     LIMIT 1;

    IF hook_secret IS NULL OR btrim(hook_secret) = '' THEN
      RAISE WARNING 'notify_webhook_secret no está en Vault; no se envía el aviso';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url     := 'https://jrzydxpcyonrzhbpzibc.supabase.co/functions/v1/notify-doctor-new-request',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', coalesce(
          (SELECT ds.decrypted_secret FROM vault.decrypted_secrets ds
            WHERE ds.name = 'supabase_publishable_key'
            ORDER BY ds.created_at DESC LIMIT 1),
          ''
        ),
        'x-notify-secret', hook_secret
      ),
      body    := jsonb_build_object('record', jsonb_build_object('id', NEW.id))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo avisar la solicitud nueva: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.redeem_team_invitation()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reject_past_appointment_request()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  local_now timestamp := (now() at time zone 'America/Tegucigalpa');
  req_ts timestamp;
begin
  begin
    req_ts := (new.requested_date || ' ' || new.requested_time)::timestamp;
  exception when others then
    raise exception 'Fecha u hora inválida';
  end;
  if req_ts <= local_now then
    raise exception 'El horario solicitado ya pasó';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.remove_team_member(p_member_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_reminder_scheduled_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Calcula y programa el recordatorio para exactamente 24 horas antes de la cita
  NEW.reminder_scheduled_at := (NEW.date || ' ' || NEW.time)::timestamp - interval '24 hours';
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_team_member_role(p_member_id uuid, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

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
  v_replaced boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT r.id
    INTO v_receipt_id
    FROM public.payment_receipts r
   WHERE r.clinic_id = v_user_id
     AND r.status = 'pending'
   ORDER BY r.created_at DESC
   LIMIT 1;

  -- Siempre 3 días desde este envío, también al reenviar.
  v_provisional_until := now() + interval '3 days';

  IF v_receipt_id IS NOT NULL THEN
    UPDATE public.payment_receipts
       SET email_referencia = coalesce(nullif(trim(p_email_referencia), ''), auth.jwt() ->> 'email'),
           notes = nullif(trim(p_notes), ''),
           created_at = now(),
           provisional_access_until = v_provisional_until
     WHERE id = v_receipt_id;
    v_replaced := true;
    RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
    RETURN;
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

-- Vistas

CREATE VIEW public.subscription_status WITH (security_invoker=true) AS  SELECT s.clinic_id,
    s.status,
    s.plan,
    s.amount,
    s.currency,
    s.trial_started_at,
    s.current_period_start,
    s.current_period_end,
    s.last_payment_at,
        CASE
            WHEN (s.status = ANY (ARRAY['active'::text, 'trial'::text])) AND s.current_period_end > now() THEN true
            WHEN grace.provisional_access_until > now() THEN true
            ELSE false
        END AS is_active,
        CASE
            WHEN s.status = 'trial'::text THEN true
            ELSE false
        END AS is_trial,
        CASE
            WHEN grace.provisional_access_until > now() THEN false
            WHEN s.status = 'expired'::text THEN true
            WHEN s.current_period_end <= now() THEN true
            ELSE false
        END AS is_expired,
    GREATEST(0::numeric, ceil(EXTRACT(epoch FROM GREATEST(COALESCE(s.current_period_end, '-infinity'::timestamp with time zone), COALESCE(grace.provisional_access_until, '-infinity'::timestamp with time zone)) - now()) / 86400::numeric))::integer AS days_left,
        CASE
            WHEN GREATEST(COALESCE(s.current_period_end, '-infinity'::timestamp with time zone), COALESCE(grace.provisional_access_until, '-infinity'::timestamp with time zone)) >= now() AND GREATEST(COALESCE(s.current_period_end, '-infinity'::timestamp with time zone), COALESCE(grace.provisional_access_until, '-infinity'::timestamp with time zone)) <= (now() + '4 days'::interval) THEN true
            ELSE false
        END AS expires_soon,
    grace.provisional_access_until > now() AND grace.provisional_access_until > COALESCE(s.current_period_end, '-infinity'::timestamp with time zone) AS is_provisional,
    grace.provisional_access_until
   FROM subscriptions s
     LEFT JOIN LATERAL ( SELECT max(r.provisional_access_until) AS provisional_access_until
           FROM payment_receipts r
          WHERE r.clinic_id = s.clinic_id AND r.status = 'pending'::text) grace ON true
  WHERE s.clinic_id = COALESCE(get_my_clinic_id(), auth.uid());

-- Triggers

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER trg_block_bookings_if_unpaid BEFORE INSERT ON appointment_requests FOR EACH ROW EXECUTE FUNCTION block_bookings_if_unpaid();

CREATE TRIGGER trg_guard_appointment_request BEFORE INSERT OR UPDATE ON appointment_requests FOR EACH ROW EXECUTE FUNCTION guard_appointment_request();

CREATE TRIGGER trg_notify_new_appointment_request AFTER INSERT ON appointment_requests FOR EACH ROW EXECUTE FUNCTION notify_new_appointment_request();

CREATE TRIGGER trg_reject_past_request BEFORE INSERT ON appointment_requests FOR EACH ROW EXECUTE FUNCTION reject_past_appointment_request();

CREATE TRIGGER trigger_set_reminder_scheduled_at BEFORE INSERT OR UPDATE OF date, "time" ON appointments FOR EACH ROW EXECUTE FUNCTION set_reminder_scheduled_at();

CREATE TRIGGER on_profile_created_start_trial AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION create_trial_subscription();

CREATE TRIGGER trg_protect_profile_privileges BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_privileges();

-- Row level security

ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.booking_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.clinical_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.evolution_notes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lab_works ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.price_catalogs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Quitar ejecucion publica por defecto

REVOKE ALL ON FUNCTION public.activate_subscription(uuid,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_extend_subscription(uuid,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_clinics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reject_pending_receipts(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.block_bookings_if_unpaid() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_appointment_request_spam() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_access_until(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clinic_has_paid_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_trial_subscription() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_clinic_has_paid_access() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_overdue_subscriptions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_clinic_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_appointment_requests(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_appointments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_booking_settings(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_doctor_availability(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.guard_appointment_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_clinic_manager(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notify_new_appointment_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_team_invitation() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_past_appointment_request() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_team_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_reminder_scheduled_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_team_member_role(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(text,text) FROM PUBLIC;

-- Politicas

CREATE POLICY "Clinic staff can delete requests" ON public.appointment_requests AS PERMISSIVE FOR DELETE TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "Clinic staff can update requests" ON public.appointment_requests AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()))) WITH CHECK (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "Clinic staff can view requests" ON public.appointment_requests AS PERMISSIVE FOR SELECT TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "Doctors can manage their own requests" ON public.appointment_requests AS PERMISSIVE FOR ALL TO PUBLIC USING ((doctor_id = auth.uid()));

CREATE POLICY "Doctors see own requests" ON public.appointment_requests AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors update own requests" ON public.appointment_requests AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Expediente requiere plan vigente" ON public.appointment_requests AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Public can create requests" ON public.appointment_requests AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "Public can insert appointment_requests" ON public.appointment_requests AS PERMISSIVE FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Public can submit appointment requests" ON public.appointment_requests AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);

CREATE POLICY "Doctors can manage their own appointments" ON public.appointments AS PERMISSIVE FOR ALL TO PUBLIC USING ((doctor_id = auth.uid()));

CREATE POLICY "Doctors delete own appointments" ON public.appointments AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors insert own appointments" ON public.appointments AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors see own appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors update own appointments" ON public.appointments AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Expediente requiere plan vigente" ON public.appointments AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "RBAC: Delete appointments" ON public.appointments AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert appointments" ON public.appointments AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "RBAC: Select appointments" ON public.appointments AS PERMISSIVE FOR SELECT TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "RBAC: Update appointments" ON public.appointments AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()))) WITH CHECK (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "Doctors manage own settings" ON public.booking_settings AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete booking_settings" ON public.booking_settings AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert booking_settings" ON public.booking_settings AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Select booking_settings" ON public.booking_settings AS PERMISSIVE FOR SELECT TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "RBAC: Update booking_settings" ON public.booking_settings AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "Expediente requiere plan vigente" ON public.budget_items AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Owner Access" ON public.budget_items AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete budget_items" ON public.budget_items AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert budget_items" ON public.budget_items AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text]))));

CREATE POLICY "RBAC: Select budget_items" ON public.budget_items AS PERMISSIVE FOR SELECT TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Update budget_items" ON public.budget_items AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text]))));

CREATE POLICY "Doctores pueden actualizar sus propios eventos" ON public.clinical_events AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctores pueden insertar sus propios eventos" ON public.clinical_events AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors delete own events" ON public.clinical_events AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors insert own events" ON public.clinical_events AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Expediente requiere plan vigente" ON public.clinical_events AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Owner Access" ON public.clinical_events AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete clinical_events" ON public.clinical_events AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert clinical_events" ON public.clinical_events AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Select clinical_events" ON public.clinical_events AS PERMISSIVE FOR SELECT TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(btrim(get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Update clinical_events" ON public.clinical_events AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "Expediente requiere plan vigente" ON public.consent_forms AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Owner Access" ON public.consent_forms AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete consent_forms" ON public.consent_forms AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert consent_forms" ON public.consent_forms AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Select consent_forms" ON public.consent_forms AS PERMISSIVE FOR SELECT TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(btrim(get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Update consent_forms" ON public.consent_forms AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "Doctors manage own availability" ON public.doctor_availability AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete doctor_availability" ON public.doctor_availability AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert doctor_availability" ON public.doctor_availability AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Select doctor_availability" ON public.doctor_availability AS PERMISSIVE FOR SELECT TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "RBAC: Update doctor_availability" ON public.doctor_availability AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "Doctors delete own notes" ON public.evolution_notes AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors insert own notes" ON public.evolution_notes AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors update own notes" ON public.evolution_notes AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Expediente requiere plan vigente" ON public.evolution_notes AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Owner Access" ON public.evolution_notes AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete evolution_notes" ON public.evolution_notes AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert evolution_notes" ON public.evolution_notes AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Select evolution_notes" ON public.evolution_notes AS PERMISSIVE FOR SELECT TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(btrim(get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Update evolution_notes" ON public.evolution_notes AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "Doctors can delete their own lab works" ON public.lab_works AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can insert their own lab works" ON public.lab_works AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can update their own lab works" ON public.lab_works AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors can view their own lab works" ON public.lab_works AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Expediente requiere plan vigente" ON public.lab_works AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Doctors delete own patients" ON public.patients AS PERMISSIVE FOR DELETE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors insert own patients" ON public.patients AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Doctors see own patients" ON public.patients AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctors update own patients" ON public.patients AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Expediente requiere plan vigente" ON public.patients AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "RBAC: Delete patients" ON public.patients AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert patients" ON public.patients AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "RBAC: Select patients" ON public.patients AS PERMISSIVE FOR SELECT TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (deleted_at IS NULL)));

CREATE POLICY "RBAC: Update patients" ON public.patients AS PERMISSIVE FOR UPDATE TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id()))) WITH CHECK (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "Clinic can view receipts" ON public.payment_receipts AS PERMISSIVE FOR SELECT TO authenticated USING (((clinic_id = auth.uid()) OR (clinic_id = get_my_clinic_id())));

CREATE POLICY "Expediente requiere plan vigente" ON public.payments AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Owner Access" ON public.payments AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete payments" ON public.payments AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert payments" ON public.payments AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text]))));

CREATE POLICY "RBAC: Select payments" ON public.payments AS PERMISSIVE FOR SELECT TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Update payments" ON public.payments AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'receptionist'::text]))));

CREATE POLICY "Doctores pueden actualizar sus propias recetas" ON public.prescriptions AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = doctor_id));

CREATE POLICY "Doctores pueden insertar sus propias recetas" ON public.prescriptions AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "Expediente requiere plan vigente" ON public.prescriptions AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Owner Access" ON public.prescriptions AS PERMISSIVE FOR ALL TO PUBLIC USING ((auth.uid() = doctor_id)) WITH CHECK ((auth.uid() = doctor_id));

CREATE POLICY "RBAC: Delete prescriptions" ON public.prescriptions AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "RBAC: Insert prescriptions" ON public.prescriptions AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Select prescriptions" ON public.prescriptions AS PERMISSIVE FOR SELECT TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(btrim(get_my_role())) = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "RBAC: Update prescriptions" ON public.prescriptions AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (get_my_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'assistant'::text]))));

CREATE POLICY "Catalogo requiere plan vigente" ON public.price_catalogs AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Clinic admins can delete price catalog" ON public.price_catalogs AS PERMISSIVE FOR DELETE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "Clinic admins can insert price catalog" ON public.price_catalogs AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "Clinic admins can update price catalog" ON public.price_catalogs AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text])))) WITH CHECK ((((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())) AND (lower(get_my_role()) = ANY (ARRAY['owner'::text, 'admin'::text]))));

CREATE POLICY "Clinic staff can view price catalog" ON public.price_catalogs AS PERMISSIVE FOR SELECT TO PUBLIC USING (((doctor_id = auth.uid()) OR (doctor_id = get_my_clinic_id())));

CREATE POLICY "Users can insert own profile" ON public.profiles AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can update own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can view own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO PUBLIC USING ((auth.uid() = id));

CREATE POLICY "Users can view relevant profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO PUBLIC USING (((auth.uid() = id) OR (clinic_id = auth.uid())));

CREATE POLICY "Clinics read own subscription" ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING (((clinic_id = auth.uid()) OR (clinic_id = get_my_clinic_id())));

CREATE POLICY "Owners and admins can delete team invitations" ON public.team_invitations AS PERMISSIVE FOR DELETE TO authenticated USING (is_clinic_manager(clinic_id));

CREATE POLICY "Owners and admins can insert team invitations" ON public.team_invitations AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((is_clinic_manager(clinic_id) AND (role = ANY (ARRAY['admin'::text, 'assistant'::text, 'receptionist'::text])) AND (status = 'pending'::text)));

CREATE POLICY "Owners and admins can update team invitations" ON public.team_invitations AS PERMISSIVE FOR UPDATE TO authenticated USING (is_clinic_manager(clinic_id)) WITH CHECK ((is_clinic_manager(clinic_id) AND (role = ANY (ARRAY['admin'::text, 'assistant'::text, 'receptionist'::text]))));

CREATE POLICY "Users can view team invitations for their clinic" ON public.team_invitations AS PERMISSIVE FOR SELECT TO authenticated USING ((is_clinic_manager(clinic_id) OR (lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text)))));

CREATE POLICY "Avisos requieren plan vigente" ON public.user_notifications AS RESTRICTIVE FOR ALL TO authenticated USING (current_clinic_has_paid_access()) WITH CHECK (current_clinic_has_paid_access());

CREATE POLICY "Users delete own notifications" ON public.user_notifications AS PERMISSIVE FOR DELETE TO PUBLIC USING ((user_id = auth.uid()));

CREATE POLICY "Users insert own notifications" ON public.user_notifications AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users read own notifications" ON public.user_notifications AS PERMISSIVE FOR SELECT TO PUBLIC USING ((user_id = auth.uid()));

CREATE POLICY "Users update own notifications" ON public.user_notifications AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));

-- Permisos de tablas

REVOKE ALL ON TABLE public.appointment_requests FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.appointments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.booking_settings FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.budget_items FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.clinical_events FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.consent_forms FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.doctor_availability FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.evolution_notes FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.lab_works FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.patients FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.payment_receipts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.prescriptions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.price_catalogs FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.subscriptions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.team_invitations FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.user_notifications FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.subscription_status FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON TABLE public.appointment_requests TO anon;

GRANT MAINTAIN ON TABLE public.appointment_requests TO anon;

GRANT REFERENCES ON TABLE public.appointment_requests TO anon;

GRANT TRIGGER ON TABLE public.appointment_requests TO anon;

GRANT TRUNCATE ON TABLE public.appointment_requests TO anon;

GRANT DELETE ON TABLE public.appointment_requests TO authenticated;

GRANT INSERT ON TABLE public.appointment_requests TO authenticated;

GRANT MAINTAIN ON TABLE public.appointment_requests TO authenticated;

GRANT REFERENCES ON TABLE public.appointment_requests TO authenticated;

GRANT SELECT ON TABLE public.appointment_requests TO authenticated;

GRANT TRIGGER ON TABLE public.appointment_requests TO authenticated;

GRANT TRUNCATE ON TABLE public.appointment_requests TO authenticated;

GRANT UPDATE ON TABLE public.appointment_requests TO authenticated;

GRANT DELETE ON TABLE public.appointment_requests TO service_role;

GRANT INSERT ON TABLE public.appointment_requests TO service_role;

GRANT MAINTAIN ON TABLE public.appointment_requests TO service_role;

GRANT REFERENCES ON TABLE public.appointment_requests TO service_role;

GRANT SELECT ON TABLE public.appointment_requests TO service_role;

GRANT TRIGGER ON TABLE public.appointment_requests TO service_role;

GRANT TRUNCATE ON TABLE public.appointment_requests TO service_role;

GRANT UPDATE ON TABLE public.appointment_requests TO service_role;

GRANT DELETE ON TABLE public.appointments TO authenticated;

GRANT INSERT ON TABLE public.appointments TO authenticated;

GRANT MAINTAIN ON TABLE public.appointments TO authenticated;

GRANT REFERENCES ON TABLE public.appointments TO authenticated;

GRANT SELECT ON TABLE public.appointments TO authenticated;

GRANT TRIGGER ON TABLE public.appointments TO authenticated;

GRANT TRUNCATE ON TABLE public.appointments TO authenticated;

GRANT UPDATE ON TABLE public.appointments TO authenticated;

GRANT DELETE ON TABLE public.appointments TO service_role;

GRANT INSERT ON TABLE public.appointments TO service_role;

GRANT MAINTAIN ON TABLE public.appointments TO service_role;

GRANT REFERENCES ON TABLE public.appointments TO service_role;

GRANT SELECT ON TABLE public.appointments TO service_role;

GRANT TRIGGER ON TABLE public.appointments TO service_role;

GRANT TRUNCATE ON TABLE public.appointments TO service_role;

GRANT UPDATE ON TABLE public.appointments TO service_role;

GRANT DELETE ON TABLE public.booking_settings TO authenticated;

GRANT INSERT ON TABLE public.booking_settings TO authenticated;

GRANT MAINTAIN ON TABLE public.booking_settings TO authenticated;

GRANT REFERENCES ON TABLE public.booking_settings TO authenticated;

GRANT SELECT ON TABLE public.booking_settings TO authenticated;

GRANT TRIGGER ON TABLE public.booking_settings TO authenticated;

GRANT TRUNCATE ON TABLE public.booking_settings TO authenticated;

GRANT UPDATE ON TABLE public.booking_settings TO authenticated;

GRANT DELETE ON TABLE public.booking_settings TO service_role;

GRANT INSERT ON TABLE public.booking_settings TO service_role;

GRANT MAINTAIN ON TABLE public.booking_settings TO service_role;

GRANT REFERENCES ON TABLE public.booking_settings TO service_role;

GRANT SELECT ON TABLE public.booking_settings TO service_role;

GRANT TRIGGER ON TABLE public.booking_settings TO service_role;

GRANT TRUNCATE ON TABLE public.booking_settings TO service_role;

GRANT UPDATE ON TABLE public.booking_settings TO service_role;

GRANT DELETE ON TABLE public.budget_items TO anon;

GRANT INSERT ON TABLE public.budget_items TO anon;

GRANT MAINTAIN ON TABLE public.budget_items TO anon;

GRANT REFERENCES ON TABLE public.budget_items TO anon;

GRANT SELECT ON TABLE public.budget_items TO anon;

GRANT TRIGGER ON TABLE public.budget_items TO anon;

GRANT TRUNCATE ON TABLE public.budget_items TO anon;

GRANT UPDATE ON TABLE public.budget_items TO anon;

GRANT DELETE ON TABLE public.budget_items TO authenticated;

GRANT INSERT ON TABLE public.budget_items TO authenticated;

GRANT MAINTAIN ON TABLE public.budget_items TO authenticated;

GRANT REFERENCES ON TABLE public.budget_items TO authenticated;

GRANT SELECT ON TABLE public.budget_items TO authenticated;

GRANT TRIGGER ON TABLE public.budget_items TO authenticated;

GRANT TRUNCATE ON TABLE public.budget_items TO authenticated;

GRANT UPDATE ON TABLE public.budget_items TO authenticated;

GRANT DELETE ON TABLE public.budget_items TO service_role;

GRANT INSERT ON TABLE public.budget_items TO service_role;

GRANT MAINTAIN ON TABLE public.budget_items TO service_role;

GRANT REFERENCES ON TABLE public.budget_items TO service_role;

GRANT SELECT ON TABLE public.budget_items TO service_role;

GRANT TRIGGER ON TABLE public.budget_items TO service_role;

GRANT TRUNCATE ON TABLE public.budget_items TO service_role;

GRANT UPDATE ON TABLE public.budget_items TO service_role;

GRANT DELETE ON TABLE public.clinical_events TO anon;

GRANT INSERT ON TABLE public.clinical_events TO anon;

GRANT MAINTAIN ON TABLE public.clinical_events TO anon;

GRANT REFERENCES ON TABLE public.clinical_events TO anon;

GRANT SELECT ON TABLE public.clinical_events TO anon;

GRANT TRIGGER ON TABLE public.clinical_events TO anon;

GRANT TRUNCATE ON TABLE public.clinical_events TO anon;

GRANT UPDATE ON TABLE public.clinical_events TO anon;

GRANT DELETE ON TABLE public.clinical_events TO authenticated;

GRANT INSERT ON TABLE public.clinical_events TO authenticated;

GRANT MAINTAIN ON TABLE public.clinical_events TO authenticated;

GRANT REFERENCES ON TABLE public.clinical_events TO authenticated;

GRANT SELECT ON TABLE public.clinical_events TO authenticated;

GRANT TRIGGER ON TABLE public.clinical_events TO authenticated;

GRANT TRUNCATE ON TABLE public.clinical_events TO authenticated;

GRANT UPDATE ON TABLE public.clinical_events TO authenticated;

GRANT DELETE ON TABLE public.clinical_events TO service_role;

GRANT INSERT ON TABLE public.clinical_events TO service_role;

GRANT MAINTAIN ON TABLE public.clinical_events TO service_role;

GRANT REFERENCES ON TABLE public.clinical_events TO service_role;

GRANT SELECT ON TABLE public.clinical_events TO service_role;

GRANT TRIGGER ON TABLE public.clinical_events TO service_role;

GRANT TRUNCATE ON TABLE public.clinical_events TO service_role;

GRANT UPDATE ON TABLE public.clinical_events TO service_role;

GRANT DELETE ON TABLE public.consent_forms TO anon;

GRANT INSERT ON TABLE public.consent_forms TO anon;

GRANT MAINTAIN ON TABLE public.consent_forms TO anon;

GRANT REFERENCES ON TABLE public.consent_forms TO anon;

GRANT SELECT ON TABLE public.consent_forms TO anon;

GRANT TRIGGER ON TABLE public.consent_forms TO anon;

GRANT TRUNCATE ON TABLE public.consent_forms TO anon;

GRANT UPDATE ON TABLE public.consent_forms TO anon;

GRANT DELETE ON TABLE public.consent_forms TO authenticated;

GRANT INSERT ON TABLE public.consent_forms TO authenticated;

GRANT MAINTAIN ON TABLE public.consent_forms TO authenticated;

GRANT REFERENCES ON TABLE public.consent_forms TO authenticated;

GRANT SELECT ON TABLE public.consent_forms TO authenticated;

GRANT TRIGGER ON TABLE public.consent_forms TO authenticated;

GRANT TRUNCATE ON TABLE public.consent_forms TO authenticated;

GRANT UPDATE ON TABLE public.consent_forms TO authenticated;

GRANT DELETE ON TABLE public.consent_forms TO service_role;

GRANT INSERT ON TABLE public.consent_forms TO service_role;

GRANT MAINTAIN ON TABLE public.consent_forms TO service_role;

GRANT REFERENCES ON TABLE public.consent_forms TO service_role;

GRANT SELECT ON TABLE public.consent_forms TO service_role;

GRANT TRIGGER ON TABLE public.consent_forms TO service_role;

GRANT TRUNCATE ON TABLE public.consent_forms TO service_role;

GRANT UPDATE ON TABLE public.consent_forms TO service_role;

GRANT DELETE ON TABLE public.doctor_availability TO authenticated;

GRANT INSERT ON TABLE public.doctor_availability TO authenticated;

GRANT MAINTAIN ON TABLE public.doctor_availability TO authenticated;

GRANT REFERENCES ON TABLE public.doctor_availability TO authenticated;

GRANT SELECT ON TABLE public.doctor_availability TO authenticated;

GRANT TRIGGER ON TABLE public.doctor_availability TO authenticated;

GRANT TRUNCATE ON TABLE public.doctor_availability TO authenticated;

GRANT UPDATE ON TABLE public.doctor_availability TO authenticated;

GRANT DELETE ON TABLE public.doctor_availability TO service_role;

GRANT INSERT ON TABLE public.doctor_availability TO service_role;

GRANT MAINTAIN ON TABLE public.doctor_availability TO service_role;

GRANT REFERENCES ON TABLE public.doctor_availability TO service_role;

GRANT SELECT ON TABLE public.doctor_availability TO service_role;

GRANT TRIGGER ON TABLE public.doctor_availability TO service_role;

GRANT TRUNCATE ON TABLE public.doctor_availability TO service_role;

GRANT UPDATE ON TABLE public.doctor_availability TO service_role;

GRANT DELETE ON TABLE public.evolution_notes TO anon;

GRANT INSERT ON TABLE public.evolution_notes TO anon;

GRANT MAINTAIN ON TABLE public.evolution_notes TO anon;

GRANT REFERENCES ON TABLE public.evolution_notes TO anon;

GRANT SELECT ON TABLE public.evolution_notes TO anon;

GRANT TRIGGER ON TABLE public.evolution_notes TO anon;

GRANT TRUNCATE ON TABLE public.evolution_notes TO anon;

GRANT UPDATE ON TABLE public.evolution_notes TO anon;

GRANT DELETE ON TABLE public.evolution_notes TO authenticated;

GRANT INSERT ON TABLE public.evolution_notes TO authenticated;

GRANT MAINTAIN ON TABLE public.evolution_notes TO authenticated;

GRANT REFERENCES ON TABLE public.evolution_notes TO authenticated;

GRANT SELECT ON TABLE public.evolution_notes TO authenticated;

GRANT TRIGGER ON TABLE public.evolution_notes TO authenticated;

GRANT TRUNCATE ON TABLE public.evolution_notes TO authenticated;

GRANT UPDATE ON TABLE public.evolution_notes TO authenticated;

GRANT DELETE ON TABLE public.evolution_notes TO service_role;

GRANT INSERT ON TABLE public.evolution_notes TO service_role;

GRANT MAINTAIN ON TABLE public.evolution_notes TO service_role;

GRANT REFERENCES ON TABLE public.evolution_notes TO service_role;

GRANT SELECT ON TABLE public.evolution_notes TO service_role;

GRANT TRIGGER ON TABLE public.evolution_notes TO service_role;

GRANT TRUNCATE ON TABLE public.evolution_notes TO service_role;

GRANT UPDATE ON TABLE public.evolution_notes TO service_role;

GRANT DELETE ON TABLE public.lab_works TO anon;

GRANT INSERT ON TABLE public.lab_works TO anon;

GRANT MAINTAIN ON TABLE public.lab_works TO anon;

GRANT REFERENCES ON TABLE public.lab_works TO anon;

GRANT SELECT ON TABLE public.lab_works TO anon;

GRANT TRIGGER ON TABLE public.lab_works TO anon;

GRANT TRUNCATE ON TABLE public.lab_works TO anon;

GRANT UPDATE ON TABLE public.lab_works TO anon;

GRANT DELETE ON TABLE public.lab_works TO authenticated;

GRANT INSERT ON TABLE public.lab_works TO authenticated;

GRANT MAINTAIN ON TABLE public.lab_works TO authenticated;

GRANT REFERENCES ON TABLE public.lab_works TO authenticated;

GRANT SELECT ON TABLE public.lab_works TO authenticated;

GRANT TRIGGER ON TABLE public.lab_works TO authenticated;

GRANT TRUNCATE ON TABLE public.lab_works TO authenticated;

GRANT UPDATE ON TABLE public.lab_works TO authenticated;

GRANT DELETE ON TABLE public.lab_works TO service_role;

GRANT INSERT ON TABLE public.lab_works TO service_role;

GRANT MAINTAIN ON TABLE public.lab_works TO service_role;

GRANT REFERENCES ON TABLE public.lab_works TO service_role;

GRANT SELECT ON TABLE public.lab_works TO service_role;

GRANT TRIGGER ON TABLE public.lab_works TO service_role;

GRANT TRUNCATE ON TABLE public.lab_works TO service_role;

GRANT UPDATE ON TABLE public.lab_works TO service_role;

GRANT DELETE ON TABLE public.patients TO anon;

GRANT INSERT ON TABLE public.patients TO anon;

GRANT MAINTAIN ON TABLE public.patients TO anon;

GRANT REFERENCES ON TABLE public.patients TO anon;

GRANT SELECT ON TABLE public.patients TO anon;

GRANT TRIGGER ON TABLE public.patients TO anon;

GRANT TRUNCATE ON TABLE public.patients TO anon;

GRANT UPDATE ON TABLE public.patients TO anon;

GRANT DELETE ON TABLE public.patients TO authenticated;

GRANT INSERT ON TABLE public.patients TO authenticated;

GRANT MAINTAIN ON TABLE public.patients TO authenticated;

GRANT REFERENCES ON TABLE public.patients TO authenticated;

GRANT SELECT ON TABLE public.patients TO authenticated;

GRANT TRIGGER ON TABLE public.patients TO authenticated;

GRANT TRUNCATE ON TABLE public.patients TO authenticated;

GRANT UPDATE ON TABLE public.patients TO authenticated;

GRANT DELETE ON TABLE public.patients TO service_role;

GRANT INSERT ON TABLE public.patients TO service_role;

GRANT MAINTAIN ON TABLE public.patients TO service_role;

GRANT REFERENCES ON TABLE public.patients TO service_role;

GRANT SELECT ON TABLE public.patients TO service_role;

GRANT TRIGGER ON TABLE public.patients TO service_role;

GRANT TRUNCATE ON TABLE public.patients TO service_role;

GRANT UPDATE ON TABLE public.patients TO service_role;

GRANT DELETE ON TABLE public.payment_receipts TO anon;

GRANT INSERT ON TABLE public.payment_receipts TO anon;

GRANT MAINTAIN ON TABLE public.payment_receipts TO anon;

GRANT REFERENCES ON TABLE public.payment_receipts TO anon;

GRANT SELECT ON TABLE public.payment_receipts TO anon;

GRANT TRIGGER ON TABLE public.payment_receipts TO anon;

GRANT TRUNCATE ON TABLE public.payment_receipts TO anon;

GRANT UPDATE ON TABLE public.payment_receipts TO anon;

GRANT DELETE ON TABLE public.payment_receipts TO authenticated;

GRANT MAINTAIN ON TABLE public.payment_receipts TO authenticated;

GRANT REFERENCES ON TABLE public.payment_receipts TO authenticated;

GRANT SELECT ON TABLE public.payment_receipts TO authenticated;

GRANT TRIGGER ON TABLE public.payment_receipts TO authenticated;

GRANT TRUNCATE ON TABLE public.payment_receipts TO authenticated;

GRANT UPDATE ON TABLE public.payment_receipts TO authenticated;

GRANT DELETE ON TABLE public.payment_receipts TO service_role;

GRANT INSERT ON TABLE public.payment_receipts TO service_role;

GRANT MAINTAIN ON TABLE public.payment_receipts TO service_role;

GRANT REFERENCES ON TABLE public.payment_receipts TO service_role;

GRANT SELECT ON TABLE public.payment_receipts TO service_role;

GRANT TRIGGER ON TABLE public.payment_receipts TO service_role;

GRANT TRUNCATE ON TABLE public.payment_receipts TO service_role;

GRANT UPDATE ON TABLE public.payment_receipts TO service_role;

GRANT DELETE ON TABLE public.payments TO anon;

GRANT INSERT ON TABLE public.payments TO anon;

GRANT MAINTAIN ON TABLE public.payments TO anon;

GRANT REFERENCES ON TABLE public.payments TO anon;

GRANT SELECT ON TABLE public.payments TO anon;

GRANT TRIGGER ON TABLE public.payments TO anon;

GRANT TRUNCATE ON TABLE public.payments TO anon;

GRANT UPDATE ON TABLE public.payments TO anon;

GRANT DELETE ON TABLE public.payments TO authenticated;

GRANT INSERT ON TABLE public.payments TO authenticated;

GRANT MAINTAIN ON TABLE public.payments TO authenticated;

GRANT REFERENCES ON TABLE public.payments TO authenticated;

GRANT SELECT ON TABLE public.payments TO authenticated;

GRANT TRIGGER ON TABLE public.payments TO authenticated;

GRANT TRUNCATE ON TABLE public.payments TO authenticated;

GRANT UPDATE ON TABLE public.payments TO authenticated;

GRANT DELETE ON TABLE public.payments TO service_role;

GRANT INSERT ON TABLE public.payments TO service_role;

GRANT MAINTAIN ON TABLE public.payments TO service_role;

GRANT REFERENCES ON TABLE public.payments TO service_role;

GRANT SELECT ON TABLE public.payments TO service_role;

GRANT TRIGGER ON TABLE public.payments TO service_role;

GRANT TRUNCATE ON TABLE public.payments TO service_role;

GRANT UPDATE ON TABLE public.payments TO service_role;

GRANT DELETE ON TABLE public.prescriptions TO anon;

GRANT INSERT ON TABLE public.prescriptions TO anon;

GRANT MAINTAIN ON TABLE public.prescriptions TO anon;

GRANT REFERENCES ON TABLE public.prescriptions TO anon;

GRANT SELECT ON TABLE public.prescriptions TO anon;

GRANT TRIGGER ON TABLE public.prescriptions TO anon;

GRANT TRUNCATE ON TABLE public.prescriptions TO anon;

GRANT UPDATE ON TABLE public.prescriptions TO anon;

GRANT DELETE ON TABLE public.prescriptions TO authenticated;

GRANT INSERT ON TABLE public.prescriptions TO authenticated;

GRANT MAINTAIN ON TABLE public.prescriptions TO authenticated;

GRANT REFERENCES ON TABLE public.prescriptions TO authenticated;

GRANT SELECT ON TABLE public.prescriptions TO authenticated;

GRANT TRIGGER ON TABLE public.prescriptions TO authenticated;

GRANT TRUNCATE ON TABLE public.prescriptions TO authenticated;

GRANT UPDATE ON TABLE public.prescriptions TO authenticated;

GRANT DELETE ON TABLE public.prescriptions TO service_role;

GRANT INSERT ON TABLE public.prescriptions TO service_role;

GRANT MAINTAIN ON TABLE public.prescriptions TO service_role;

GRANT REFERENCES ON TABLE public.prescriptions TO service_role;

GRANT SELECT ON TABLE public.prescriptions TO service_role;

GRANT TRIGGER ON TABLE public.prescriptions TO service_role;

GRANT TRUNCATE ON TABLE public.prescriptions TO service_role;

GRANT UPDATE ON TABLE public.prescriptions TO service_role;

GRANT DELETE ON TABLE public.price_catalogs TO anon;

GRANT INSERT ON TABLE public.price_catalogs TO anon;

GRANT MAINTAIN ON TABLE public.price_catalogs TO anon;

GRANT REFERENCES ON TABLE public.price_catalogs TO anon;

GRANT SELECT ON TABLE public.price_catalogs TO anon;

GRANT TRIGGER ON TABLE public.price_catalogs TO anon;

GRANT TRUNCATE ON TABLE public.price_catalogs TO anon;

GRANT UPDATE ON TABLE public.price_catalogs TO anon;

GRANT DELETE ON TABLE public.price_catalogs TO authenticated;

GRANT INSERT ON TABLE public.price_catalogs TO authenticated;

GRANT MAINTAIN ON TABLE public.price_catalogs TO authenticated;

GRANT REFERENCES ON TABLE public.price_catalogs TO authenticated;

GRANT SELECT ON TABLE public.price_catalogs TO authenticated;

GRANT TRIGGER ON TABLE public.price_catalogs TO authenticated;

GRANT TRUNCATE ON TABLE public.price_catalogs TO authenticated;

GRANT UPDATE ON TABLE public.price_catalogs TO authenticated;

GRANT DELETE ON TABLE public.price_catalogs TO service_role;

GRANT INSERT ON TABLE public.price_catalogs TO service_role;

GRANT MAINTAIN ON TABLE public.price_catalogs TO service_role;

GRANT REFERENCES ON TABLE public.price_catalogs TO service_role;

GRANT SELECT ON TABLE public.price_catalogs TO service_role;

GRANT TRIGGER ON TABLE public.price_catalogs TO service_role;

GRANT TRUNCATE ON TABLE public.price_catalogs TO service_role;

GRANT UPDATE ON TABLE public.price_catalogs TO service_role;

GRANT DELETE ON TABLE public.profiles TO anon;

GRANT INSERT ON TABLE public.profiles TO anon;

GRANT MAINTAIN ON TABLE public.profiles TO anon;

GRANT REFERENCES ON TABLE public.profiles TO anon;

GRANT SELECT ON TABLE public.profiles TO anon;

GRANT TRIGGER ON TABLE public.profiles TO anon;

GRANT TRUNCATE ON TABLE public.profiles TO anon;

GRANT UPDATE ON TABLE public.profiles TO anon;

GRANT DELETE ON TABLE public.profiles TO authenticated;

GRANT INSERT ON TABLE public.profiles TO authenticated;

GRANT MAINTAIN ON TABLE public.profiles TO authenticated;

GRANT REFERENCES ON TABLE public.profiles TO authenticated;

GRANT SELECT ON TABLE public.profiles TO authenticated;

GRANT TRIGGER ON TABLE public.profiles TO authenticated;

GRANT TRUNCATE ON TABLE public.profiles TO authenticated;

GRANT UPDATE ON TABLE public.profiles TO authenticated;

GRANT DELETE ON TABLE public.profiles TO service_role;

GRANT INSERT ON TABLE public.profiles TO service_role;

GRANT MAINTAIN ON TABLE public.profiles TO service_role;

GRANT REFERENCES ON TABLE public.profiles TO service_role;

GRANT SELECT ON TABLE public.profiles TO service_role;

GRANT TRIGGER ON TABLE public.profiles TO service_role;

GRANT TRUNCATE ON TABLE public.profiles TO service_role;

GRANT UPDATE ON TABLE public.profiles TO service_role;

GRANT DELETE ON TABLE public.subscription_status TO anon;

GRANT INSERT ON TABLE public.subscription_status TO anon;

GRANT MAINTAIN ON TABLE public.subscription_status TO anon;

GRANT REFERENCES ON TABLE public.subscription_status TO anon;

GRANT SELECT ON TABLE public.subscription_status TO anon;

GRANT TRIGGER ON TABLE public.subscription_status TO anon;

GRANT TRUNCATE ON TABLE public.subscription_status TO anon;

GRANT UPDATE ON TABLE public.subscription_status TO anon;

GRANT DELETE ON TABLE public.subscription_status TO authenticated;

GRANT INSERT ON TABLE public.subscription_status TO authenticated;

GRANT MAINTAIN ON TABLE public.subscription_status TO authenticated;

GRANT REFERENCES ON TABLE public.subscription_status TO authenticated;

GRANT SELECT ON TABLE public.subscription_status TO authenticated;

GRANT TRIGGER ON TABLE public.subscription_status TO authenticated;

GRANT TRUNCATE ON TABLE public.subscription_status TO authenticated;

GRANT UPDATE ON TABLE public.subscription_status TO authenticated;

GRANT DELETE ON TABLE public.subscription_status TO service_role;

GRANT INSERT ON TABLE public.subscription_status TO service_role;

GRANT MAINTAIN ON TABLE public.subscription_status TO service_role;

GRANT REFERENCES ON TABLE public.subscription_status TO service_role;

GRANT SELECT ON TABLE public.subscription_status TO service_role;

GRANT TRIGGER ON TABLE public.subscription_status TO service_role;

GRANT TRUNCATE ON TABLE public.subscription_status TO service_role;

GRANT UPDATE ON TABLE public.subscription_status TO service_role;

GRANT DELETE ON TABLE public.subscriptions TO anon;

GRANT INSERT ON TABLE public.subscriptions TO anon;

GRANT MAINTAIN ON TABLE public.subscriptions TO anon;

GRANT REFERENCES ON TABLE public.subscriptions TO anon;

GRANT SELECT ON TABLE public.subscriptions TO anon;

GRANT TRIGGER ON TABLE public.subscriptions TO anon;

GRANT TRUNCATE ON TABLE public.subscriptions TO anon;

GRANT UPDATE ON TABLE public.subscriptions TO anon;

GRANT DELETE ON TABLE public.subscriptions TO authenticated;

GRANT INSERT ON TABLE public.subscriptions TO authenticated;

GRANT MAINTAIN ON TABLE public.subscriptions TO authenticated;

GRANT REFERENCES ON TABLE public.subscriptions TO authenticated;

GRANT SELECT ON TABLE public.subscriptions TO authenticated;

GRANT TRIGGER ON TABLE public.subscriptions TO authenticated;

GRANT TRUNCATE ON TABLE public.subscriptions TO authenticated;

GRANT UPDATE ON TABLE public.subscriptions TO authenticated;

GRANT DELETE ON TABLE public.subscriptions TO service_role;

GRANT INSERT ON TABLE public.subscriptions TO service_role;

GRANT MAINTAIN ON TABLE public.subscriptions TO service_role;

GRANT REFERENCES ON TABLE public.subscriptions TO service_role;

GRANT SELECT ON TABLE public.subscriptions TO service_role;

GRANT TRIGGER ON TABLE public.subscriptions TO service_role;

GRANT TRUNCATE ON TABLE public.subscriptions TO service_role;

GRANT UPDATE ON TABLE public.subscriptions TO service_role;

GRANT DELETE ON TABLE public.team_invitations TO anon;

GRANT INSERT ON TABLE public.team_invitations TO anon;

GRANT MAINTAIN ON TABLE public.team_invitations TO anon;

GRANT REFERENCES ON TABLE public.team_invitations TO anon;

GRANT SELECT ON TABLE public.team_invitations TO anon;

GRANT TRIGGER ON TABLE public.team_invitations TO anon;

GRANT TRUNCATE ON TABLE public.team_invitations TO anon;

GRANT UPDATE ON TABLE public.team_invitations TO anon;

GRANT DELETE ON TABLE public.team_invitations TO authenticated;

GRANT INSERT ON TABLE public.team_invitations TO authenticated;

GRANT MAINTAIN ON TABLE public.team_invitations TO authenticated;

GRANT REFERENCES ON TABLE public.team_invitations TO authenticated;

GRANT SELECT ON TABLE public.team_invitations TO authenticated;

GRANT TRIGGER ON TABLE public.team_invitations TO authenticated;

GRANT TRUNCATE ON TABLE public.team_invitations TO authenticated;

GRANT UPDATE ON TABLE public.team_invitations TO authenticated;

GRANT DELETE ON TABLE public.team_invitations TO service_role;

GRANT INSERT ON TABLE public.team_invitations TO service_role;

GRANT MAINTAIN ON TABLE public.team_invitations TO service_role;

GRANT REFERENCES ON TABLE public.team_invitations TO service_role;

GRANT SELECT ON TABLE public.team_invitations TO service_role;

GRANT TRIGGER ON TABLE public.team_invitations TO service_role;

GRANT TRUNCATE ON TABLE public.team_invitations TO service_role;

GRANT UPDATE ON TABLE public.team_invitations TO service_role;

GRANT DELETE ON TABLE public.user_notifications TO anon;

GRANT INSERT ON TABLE public.user_notifications TO anon;

GRANT MAINTAIN ON TABLE public.user_notifications TO anon;

GRANT REFERENCES ON TABLE public.user_notifications TO anon;

GRANT SELECT ON TABLE public.user_notifications TO anon;

GRANT TRIGGER ON TABLE public.user_notifications TO anon;

GRANT TRUNCATE ON TABLE public.user_notifications TO anon;

GRANT UPDATE ON TABLE public.user_notifications TO anon;

GRANT DELETE ON TABLE public.user_notifications TO authenticated;

GRANT INSERT ON TABLE public.user_notifications TO authenticated;

GRANT MAINTAIN ON TABLE public.user_notifications TO authenticated;

GRANT REFERENCES ON TABLE public.user_notifications TO authenticated;

GRANT SELECT ON TABLE public.user_notifications TO authenticated;

GRANT TRIGGER ON TABLE public.user_notifications TO authenticated;

GRANT TRUNCATE ON TABLE public.user_notifications TO authenticated;

GRANT UPDATE ON TABLE public.user_notifications TO authenticated;

GRANT DELETE ON TABLE public.user_notifications TO service_role;

GRANT INSERT ON TABLE public.user_notifications TO service_role;

GRANT MAINTAIN ON TABLE public.user_notifications TO service_role;

GRANT REFERENCES ON TABLE public.user_notifications TO service_role;

GRANT SELECT ON TABLE public.user_notifications TO service_role;

GRANT TRIGGER ON TABLE public.user_notifications TO service_role;

GRANT TRUNCATE ON TABLE public.user_notifications TO service_role;

GRANT UPDATE ON TABLE public.user_notifications TO service_role;

-- Permisos de funciones

GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid,integer) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid,integer) TO anon;

GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid,integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.activate_subscription(uuid,integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_extend_subscription(uuid,integer) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_extend_subscription(uuid,integer) TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_list_clinics() TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_clinics() TO service_role;

GRANT EXECUTE ON FUNCTION public.admin_reject_pending_receipts(uuid,text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_reject_pending_receipts(uuid,text) TO service_role;

GRANT EXECUTE ON FUNCTION public.block_bookings_if_unpaid() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.block_bookings_if_unpaid() TO anon;

GRANT EXECUTE ON FUNCTION public.block_bookings_if_unpaid() TO authenticated;

GRANT EXECUTE ON FUNCTION public.block_bookings_if_unpaid() TO service_role;

GRANT EXECUTE ON FUNCTION public.check_appointment_request_spam() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.check_appointment_request_spam() TO anon;

GRANT EXECUTE ON FUNCTION public.check_appointment_request_spam() TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_appointment_request_spam() TO service_role;

GRANT EXECUTE ON FUNCTION public.clinic_access_until(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.clinic_access_until(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.clinic_has_paid_access(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.create_trial_subscription() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_trial_subscription() TO anon;

GRANT EXECUTE ON FUNCTION public.create_trial_subscription() TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_trial_subscription() TO service_role;

GRANT EXECUTE ON FUNCTION public.current_clinic_has_paid_access() TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_clinic_has_paid_access() TO service_role;

GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO anon;

GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO authenticated;

GRANT EXECUTE ON FUNCTION public.expire_overdue_subscriptions() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_clinic_id() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_clinic_id() TO anon;

GRANT EXECUTE ON FUNCTION public.get_my_clinic_id() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_clinic_id() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO service_role;

GRANT EXECUTE ON FUNCTION public.get_public_appointment_requests(uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.get_public_appointment_requests(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_appointment_requests(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_public_appointments(uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.get_public_appointments(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_appointments(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_public_booking_settings(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_booking_settings(uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.get_public_booking_settings(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_booking_settings(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_availability(uuid) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_availability(uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_availability(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_availability(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.guard_appointment_request() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.guard_appointment_request() TO anon;

GRANT EXECUTE ON FUNCTION public.guard_appointment_request() TO authenticated;

GRANT EXECUTE ON FUNCTION public.guard_appointment_request() TO service_role;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

GRANT EXECUTE ON FUNCTION public.is_clinic_manager(uuid) TO anon;

GRANT EXECUTE ON FUNCTION public.is_clinic_manager(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_clinic_manager(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

GRANT EXECUTE ON FUNCTION public.notify_new_appointment_request() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.notify_new_appointment_request() TO anon;

GRANT EXECUTE ON FUNCTION public.notify_new_appointment_request() TO authenticated;

GRANT EXECUTE ON FUNCTION public.notify_new_appointment_request() TO service_role;

GRANT EXECUTE ON FUNCTION public.protect_profile_privileges() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.protect_profile_privileges() TO anon;

GRANT EXECUTE ON FUNCTION public.protect_profile_privileges() TO authenticated;

GRANT EXECUTE ON FUNCTION public.protect_profile_privileges() TO service_role;

GRANT EXECUTE ON FUNCTION public.redeem_team_invitation() TO authenticated;

GRANT EXECUTE ON FUNCTION public.redeem_team_invitation() TO service_role;

GRANT EXECUTE ON FUNCTION public.reject_past_appointment_request() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.reject_past_appointment_request() TO anon;

GRANT EXECUTE ON FUNCTION public.reject_past_appointment_request() TO authenticated;

GRANT EXECUTE ON FUNCTION public.reject_past_appointment_request() TO service_role;

GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid) TO service_role;

GRANT EXECUTE ON FUNCTION public.set_reminder_scheduled_at() TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_reminder_scheduled_at() TO anon;

GRANT EXECUTE ON FUNCTION public.set_reminder_scheduled_at() TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_reminder_scheduled_at() TO service_role;

GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid,text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.set_team_member_role(uuid,text) TO service_role;

GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text,text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(text,text) TO service_role;

-- Realtime

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_requests;

-- Cron

SELECT cron.schedule('expire-overdue-subscriptions', '5 0 * * *', $cron$
    SELECT public.expire_overdue_subscriptions();
  $cron$);
