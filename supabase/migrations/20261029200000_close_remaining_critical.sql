-- Cierra hallazgos críticos/altos abiertos:
-- 1) Expediente clínico fuera del alcance de recepcionista (tabla patient_clinical)
-- 2) Admins de plataforma en tabla (no hardcode solo en función)
-- 3) submit_payment_receipt solo service_role (edge function con archivo)
-- 4) apikey del webhook desde Vault

-- ============================================================
-- Helpers de rol clínico
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_view_clinical_chart()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT lower(btrim(coalesce(public.get_my_role(), ''))) = ANY (ARRAY['owner', 'admin', 'assistant']);
$function$;

REVOKE ALL ON FUNCTION public.can_view_clinical_chart() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_clinical_chart() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_clinical_chart() TO service_role;

-- ============================================================
-- 1. patient_clinical
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patient_clinical (
  patient_id uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  allergies text[] DEFAULT '{}'::text[] NOT NULL,
  medications text DEFAULT ''::text,
  previous_diseases text DEFAULT ''::text,
  family_history text DEFAULT ''::text,
  blood_type text,
  smoker boolean DEFAULT false,
  pregnant boolean DEFAULT false,
  habits text,
  observations text,
  odontogram jsonb DEFAULT '[]'::jsonb NOT NULL,
  odontogram_history jsonb DEFAULT '[]'::jsonb NOT NULL,
  periodontogram jsonb DEFAULT '[]'::jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_patient_clinical_doctor ON public.patient_clinical (doctor_id);

INSERT INTO public.patient_clinical (
  patient_id, doctor_id, allergies, medications, previous_diseases, family_history,
  blood_type, smoker, pregnant, habits, observations,
  odontogram, odontogram_history, periodontogram, updated_at
)
SELECT
  p.id,
  p.doctor_id,
  coalesce(p.allergies, '{}'::text[]),
  coalesce(p.medications, ''),
  coalesce(p.previous_diseases, ''),
  coalesce(p.family_history, ''),
  p.blood_type,
  coalesce(p.smoker, false),
  coalesce(p.pregnant, false),
  p.habits,
  p.observations,
  coalesce(p.odontogram, '[]'::jsonb),
  coalesce(p.odontogram_history, '[]'::jsonb),
  coalesce(p.periodontogram, '[]'::jsonb),
  coalesce(p.updated_at, now())
FROM public.patients p
ON CONFLICT (patient_id) DO NOTHING;

-- Quitar columnas clínicas de patients (la recepcionista ya no puede SELECT-earlas ahí)
ALTER TABLE public.patients DROP COLUMN IF EXISTS allergies;
ALTER TABLE public.patients DROP COLUMN IF EXISTS medications;
ALTER TABLE public.patients DROP COLUMN IF EXISTS previous_diseases;
ALTER TABLE public.patients DROP COLUMN IF EXISTS family_history;
ALTER TABLE public.patients DROP COLUMN IF EXISTS blood_type;
ALTER TABLE public.patients DROP COLUMN IF EXISTS smoker;
ALTER TABLE public.patients DROP COLUMN IF EXISTS pregnant;
ALTER TABLE public.patients DROP COLUMN IF EXISTS habits;
ALTER TABLE public.patients DROP COLUMN IF EXISTS observations;
ALTER TABLE public.patients DROP COLUMN IF EXISTS odontogram;
ALTER TABLE public.patients DROP COLUMN IF EXISTS odontogram_history;
ALTER TABLE public.patients DROP COLUMN IF EXISTS periodontogram;

CREATE OR REPLACE FUNCTION public.ensure_patient_clinical_row()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.patient_clinical (patient_id, doctor_id)
  VALUES (NEW.id, NEW.doctor_id)
  ON CONFLICT (patient_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_ensure_patient_clinical_row ON public.patients;
CREATE TRIGGER trg_ensure_patient_clinical_row
  AFTER INSERT ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_patient_clinical_row();

ALTER TABLE public.patient_clinical ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Expediente clínico requiere plan" ON public.patient_clinical;
CREATE POLICY "Expediente clínico requiere plan"
  ON public.patient_clinical
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.current_clinic_has_paid_access())
  WITH CHECK (public.current_clinic_has_paid_access());

DROP POLICY IF EXISTS "RBAC: Select patient_clinical" ON public.patient_clinical;
CREATE POLICY "RBAC: Select patient_clinical"
  ON public.patient_clinical
  FOR SELECT
  TO authenticated
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.can_view_clinical_chart()
  );

DROP POLICY IF EXISTS "RBAC: Insert patient_clinical" ON public.patient_clinical;
CREATE POLICY "RBAC: Insert patient_clinical"
  ON public.patient_clinical
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.can_view_clinical_chart()
  );

DROP POLICY IF EXISTS "RBAC: Update patient_clinical" ON public.patient_clinical;
CREATE POLICY "RBAC: Update patient_clinical"
  ON public.patient_clinical
  FOR UPDATE
  TO authenticated
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.can_view_clinical_chart()
  )
  WITH CHECK (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND public.can_view_clinical_chart()
  );

DROP POLICY IF EXISTS "RBAC: Delete patient_clinical" ON public.patient_clinical;
CREATE POLICY "RBAC: Delete patient_clinical"
  ON public.patient_clinical
  FOR DELETE
  TO authenticated
  USING (
    (doctor_id = auth.uid() OR doctor_id = public.get_my_clinic_id())
    AND lower(btrim(public.get_my_role())) = ANY (ARRAY['owner', 'admin'])
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.patient_clinical TO authenticated;
GRANT ALL ON TABLE public.patient_clinical TO service_role;

-- Triggers viejos de patients ya no aplican a columnas movidas
DROP TRIGGER IF EXISTS trg_guard_patient_clinical_fields ON public.patients;
DROP TRIGGER IF EXISTS trigger_check_patient_clinical_update ON public.patients;
DROP FUNCTION IF EXISTS public.guard_patient_clinical_fields();
DROP FUNCTION IF EXISTS public.check_patient_clinical_update();

-- Recepcionista no puede soft-delete
CREATE OR REPLACE FUNCTION public.guard_patient_identity_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF lower(btrim(coalesce(public.get_my_role(), ''))) = 'receptionist'
     AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'La recepcionista no puede eliminar pacientes';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_patient_identity_update ON public.patients;
CREATE TRIGGER trg_guard_patient_identity_update
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_patient_identity_update();

-- ============================================================
-- 2. platform_admins
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_admins (
  email text PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Seed de admin: NO hardcodear emails en git.
-- En el SQL Editor (una vez): 
--   INSERT INTO public.platform_admins (email) VALUES ('tu@email.com') ON CONFLICT DO NOTHING;

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No direct access platform_admins" ON public.platform_admins;
-- Sin políticas permisivas: nadie lee la tabla por API. Solo SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.platform_admins a ON lower(a.email) = lower(u.email)
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(coalesce(auth.jwt() ->> 'email', '')) = lower(u.email)
  );
$function$;

REVOKE ALL ON TABLE public.platform_admins FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.platform_admins TO service_role;

-- ============================================================
-- 3. Comprobante: solo service_role (la edge function valida sesión + archivo)
-- ============================================================

DROP FUNCTION IF EXISTS public.submit_payment_receipt(text, text);

CREATE OR REPLACE FUNCTION public.submit_payment_receipt(
  p_clinic_id uuid,
  p_email_referencia text,
  p_notes text DEFAULT NULL::text
)
RETURNS TABLE(
  receipt_id uuid,
  provisional_access_until timestamp with time zone,
  replaced boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_receipt_id uuid;
  v_provisional_until timestamptz;
  v_last_provisional timestamptz;
  v_replaced boolean := false;
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  IF v_jwt_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_clinic_id IS NULL THEN
    RAISE EXCEPTION 'Falta clínica';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id = p_clinic_id
       AND p.clinic_id IS NOT NULL
       AND p.clinic_id IS DISTINCT FROM p.id
  ) THEN
    RAISE EXCEPTION 'Solo el propietario puede enviar el comprobante';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_clinic_id) THEN
    RAISE EXCEPTION 'Clínica no encontrada';
  END IF;

  SELECT r.id, r.provisional_access_until
    INTO v_receipt_id, v_provisional_until
    FROM public.payment_receipts r
   WHERE r.clinic_id = p_clinic_id
     AND r.status = 'pending'
   ORDER BY r.created_at DESC
   LIMIT 1;

  IF v_receipt_id IS NOT NULL THEN
    UPDATE public.payment_receipts
       SET email_referencia = nullif(trim(p_email_referencia), ''),
           notes = nullif(trim(p_notes), ''),
           created_at = now()
     WHERE id = v_receipt_id;
    v_replaced := true;
    RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
    RETURN;
  END IF;

  SELECT max(r.provisional_access_until)
    INTO v_last_provisional
    FROM public.payment_receipts r
   WHERE r.clinic_id = p_clinic_id;

  IF v_last_provisional IS NOT NULL AND v_last_provisional > (now() - interval '30 days') THEN
    v_provisional_until := NULL;
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
    p_clinic_id,
    coalesce(nullif(trim(p_email_referencia), ''), 'sin-email'),
    nullif(trim(p_notes), ''),
    'pending',
    v_provisional_until
  )
  RETURNING id INTO v_receipt_id;

  RETURN QUERY SELECT v_receipt_id, v_provisional_until, v_replaced;
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_payment_receipt(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.submit_payment_receipt(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_payment_receipt(uuid, text, text) TO service_role;

-- ============================================================
-- 4. Webhook: apikey desde Vault
-- ============================================================

-- NO insertar la publishable key en migraciones versionadas.
-- Créala en Vault (Dashboard / ops) como supabase_publishable_key y rota
-- cualquier clave que haya estado en el historial de git.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets s WHERE s.name = 'supabase_publishable_key'
  ) THEN
    RAISE WARNING 'Vault: falta supabase_publishable_key (créala fuera de git)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'No se pudo verificar supabase_publishable_key en Vault: %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.notify_new_appointment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault', 'net'
AS $function$
DECLARE
  hook_secret text;
  hook_apikey text;
BEGIN
  BEGIN
    SELECT ds.decrypted_secret
      INTO hook_secret
      FROM vault.decrypted_secrets ds
     WHERE ds.name = 'notify_webhook_secret'
     ORDER BY ds.created_at DESC
     LIMIT 1;

    SELECT ds.decrypted_secret
      INTO hook_apikey
      FROM vault.decrypted_secrets ds
     WHERE ds.name = 'supabase_publishable_key'
     ORDER BY ds.created_at DESC
     LIMIT 1;

    IF hook_secret IS NULL OR btrim(hook_secret) = '' THEN
      RAISE WARNING 'notify_webhook_secret no está en Vault; no se envía el aviso';
      RETURN NEW;
    END IF;

    IF hook_apikey IS NULL OR btrim(hook_apikey) = '' THEN
      RAISE WARNING 'supabase_publishable_key no está en Vault; no se envía el aviso';
      RETURN NEW;
    END IF;

    PERFORM net.http_post(
      url     := 'https://jrzydxpcyonrzhbpzibc.supabase.co/functions/v1/notify-doctor-new-request',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', hook_apikey,
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
