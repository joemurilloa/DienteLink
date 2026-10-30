-- save_patient: guardado atómico del expediente (parcial = no tocar campos ausentes).
-- NO aplicar a prod hasta: smoke approve OK + cliente en RPC.
-- Cutover revoke: 20261029240001 (PENDIENTE).
--
-- DL400 forma | DL403 rol | DL404 ajeno | DL412 versión | DL413 soft-deleted

-- ============================================================
-- 1. Schema
-- ============================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE public.evolution_notes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.clinical_events
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.budget_items
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.consent_forms
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.lab_works
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_evolution_notes_alive
  ON public.evolution_notes (patient_id, doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clinical_events_alive
  ON public.clinical_events (patient_id, doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_budget_items_alive
  ON public.budget_items (patient_id, doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_alive
  ON public.payments (patient_id, doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_consent_forms_alive
  ON public.consent_forms (patient_id, doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_prescriptions_alive
  ON public.prescriptions (patient_id, doctor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lab_works_alive
  ON public.lab_works (patient_id, doctor_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. Helpers
-- ============================================================

-- Clave presente y valor ≠ json null. SQL NULL → false (nunca NULL).
CREATE OR REPLACE FUNCTION public.jsonb_has(p jsonb, k text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p IS NULL OR k IS NULL THEN false
    WHEN NOT (p ? k) THEN false
    WHEN jsonb_typeof(p -> k) = 'null' THEN false
    ELSE true
  END;
$function$;

-- Clave presente con valor json null explícito (para DL400: no limpiar en silencio)
CREATE OR REPLACE FUNCTION public.jsonb_key_null(p jsonb, k text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT coalesce(p IS NOT NULL AND (p ? k) AND jsonb_typeof(p -> k) = 'null', false);
$function$;

CREATE OR REPLACE FUNCTION public.can_write_patient_collection(p_role text, p_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(btrim(coalesce(p_role, '')))
    WHEN 'owner' THEN true
    WHEN 'admin' THEN true
    WHEN 'assistant' THEN p_key = ANY (ARRAY[
      'evolutionNotes', 'history', 'consents', 'prescriptions', 'labWorks', 'clinical', 'identity'
    ])
    WHEN 'receptionist' THEN p_key = ANY (ARRAY[
      'budget', 'payments', 'labWorks', 'identity'
    ])
    ELSE false
  END;
$function$;

REVOKE ALL ON FUNCTION public.can_write_patient_collection(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_write_patient_collection(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_subrow_ids_writable(
  p_table text,
  p_ids uuid[],
  p_patient_id uuid,
  p_clinic_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_sql text;
BEGIN
  IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN
    RETURN;
  END IF;
  IF p_table NOT IN (
    'evolution_notes', 'clinical_events', 'budget_items', 'payments',
    'consent_forms', 'prescriptions', 'lab_works'
  ) THEN
    RAISE EXCEPTION 'BAD_REQUEST: tabla inválida' USING ERRCODE = 'DL400';
  END IF;

  v_sql := format(
    'SELECT id, patient_id, doctor_id, deleted_at FROM public.%I WHERE id = ANY ($1) FOR UPDATE',
    p_table
  );
  FOR r IN EXECUTE v_sql USING p_ids
  LOOP
    IF r.doctor_id IS DISTINCT FROM p_clinic_id
       OR r.patient_id IS DISTINCT FROM p_patient_id THEN
      RAISE EXCEPTION 'NOT_FOUND: id no pertenece a este expediente' USING ERRCODE = 'DL404';
    END IF;
    IF r.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'GONE: fila soft-deleted' USING ERRCODE = 'DL413';
    END IF;
  END LOOP;
END;
$function$;

-- Solo usable desde save_patient (mismo owner). NO grant a authenticated.
REVOKE ALL ON FUNCTION public.assert_subrow_ids_writable(text, uuid[], uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assert_subrow_ids_writable(text, uuid[], uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.assert_subrow_ids_writable(text, uuid[], uuid, uuid) FROM authenticated;

-- ============================================================
-- 3. save_patient
-- ============================================================

CREATE OR REPLACE FUNCTION public.save_patient(
  p_patient jsonb,
  p_expected_version integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_clinic uuid;
  v_role text;
  v_pid uuid;
  v_new boolean;
  v_ver int;
  v_next_ver int;
  v_written text[] := ARRAY[]::text[];
  v_skipped text[] := ARRAY[]::text[];
  v_removed int := 0;
  v_ignored int := 0;
  v_coll jsonb;
  v_key text;
  v_table text;
  v_items jsonb;
  v_removed_ids uuid[];
  v_item_ids uuid[];
  v_n int;
  v_expect int;
  v_ident jsonb;
  v_clinical jsonb;
  v_is_manager boolean;
  v_has_ident boolean;
  v_has_ch boolean;
  v_has_odo boolean;
  v_has_odo_hist boolean;
  v_has_perio boolean;
  v_has_consent boolean;
  v_wants_clinical boolean;
  v_con text;
  v_dup int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: no autenticado' USING ERRCODE = 'DL403';
  END IF;

  v_clinic := public.get_my_clinic_id();
  v_role := lower(btrim(coalesce(public.get_my_role(), '')));
  IF v_clinic IS NULL OR v_role = '' THEN
    RAISE EXCEPTION 'FORBIDDEN: sin clínica o rol' USING ERRCODE = 'DL403';
  END IF;
  v_is_manager := v_role IN ('owner', 'admin');

  IF p_patient IS NULL OR jsonb_typeof(p_patient) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'BAD_REQUEST: p_patient debe ser objeto' USING ERRCODE = 'DL400';
  END IF;

  BEGIN
    v_pid := (p_patient->>'id')::uuid;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'BAD_REQUEST: id inválido' USING ERRCODE = 'DL400';
  END;
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: id requerido' USING ERRCODE = 'DL400';
  END IF;

  IF public.jsonb_key_null(p_patient, 'collections')
     OR public.jsonb_key_null(p_patient, 'identification')
     OR public.jsonb_key_null(p_patient, 'clinicalHistory')
     OR public.jsonb_key_null(p_patient, 'odontogram')
     OR public.jsonb_key_null(p_patient, 'odontogramHistory')
     OR public.jsonb_key_null(p_patient, 'periodontogram')
     OR public.jsonb_key_null(p_patient, 'consentSigned') THEN
    RAISE EXCEPTION 'BAD_REQUEST: null explícito no permitido; usa "" para limpiar texto'
      USING ERRCODE = 'DL400';
  END IF;

  IF public.jsonb_has(p_patient, 'collections')
     AND jsonb_typeof(p_patient->'collections') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'BAD_REQUEST: collections debe ser objeto' USING ERRCODE = 'DL400';
  END IF;

  IF p_patient ? 'identification'
     AND jsonb_typeof(p_patient->'identification') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'BAD_REQUEST: identification debe ser objeto' USING ERRCODE = 'DL400';
  END IF;
  IF p_patient ? 'clinicalHistory'
     AND jsonb_typeof(p_patient->'clinicalHistory') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'BAD_REQUEST: clinicalHistory debe ser objeto' USING ERRCODE = 'DL400';
  END IF;

  v_has_ident := public.jsonb_has(p_patient, 'identification');
  v_has_ch := public.jsonb_has(p_patient, 'clinicalHistory');
  v_has_odo := public.jsonb_has(p_patient, 'odontogram');
  v_has_odo_hist := public.jsonb_has(p_patient, 'odontogramHistory');
  v_has_perio := public.jsonb_has(p_patient, 'periodontogram');
  v_has_consent := public.jsonb_has(p_patient, 'consentSigned');
  v_wants_clinical := v_has_ch OR v_has_odo OR v_has_odo_hist OR v_has_perio;

  v_ident := CASE WHEN v_has_ident THEN p_patient->'identification' ELSE '{}'::jsonb END;
  v_clinical := CASE WHEN v_has_ch THEN p_patient->'clinicalHistory' ELSE '{}'::jsonb END;

  -- null explícito dentro de identification / clinicalHistory → DL400
  IF v_has_ident AND (
       public.jsonb_key_null(v_ident, 'fullName')
    OR public.jsonb_key_null(v_ident, 'birthDate')
    OR public.jsonb_key_null(v_ident, 'gender')
    OR public.jsonb_key_null(v_ident, 'address')
    OR public.jsonb_key_null(v_ident, 'phone')
    OR public.jsonb_key_null(v_ident, 'email')
    OR public.jsonb_key_null(v_ident, 'occupation')
  ) THEN
    RAISE EXCEPTION 'BAD_REQUEST: identification.* null; usa "" para limpiar'
      USING ERRCODE = 'DL400';
  END IF;

  IF v_has_ident AND public.jsonb_has(v_ident, 'fullName')
     AND nullif(btrim(v_ident->>'fullName'), '') IS NULL THEN
    RAISE EXCEPTION 'BAD_REQUEST: fullName no puede estar vacío' USING ERRCODE = 'DL400';
  END IF;

  IF v_has_ch AND public.jsonb_has(v_clinical, 'allergies')
     AND jsonb_typeof(v_clinical->'allergies') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'BAD_REQUEST: allergies debe ser array' USING ERRCODE = 'DL400';
  END IF;

  -- Roles antes de escribir
  IF NOT public.can_write_patient_collection(v_role, 'identity') THEN
    RAISE EXCEPTION 'FORBIDDEN: no puedes guardar pacientes' USING ERRCODE = 'DL403';
  END IF;
  IF v_wants_clinical AND NOT public.can_write_patient_collection(v_role, 'clinical') THEN
    RAISE EXCEPTION 'FORBIDDEN: no puedes escribir expediente clínico' USING ERRCODE = 'DL403';
  END IF;

  FOREACH v_key IN ARRAY ARRAY[
    'evolutionNotes', 'history', 'budget', 'payments',
    'consents', 'prescriptions', 'labWorks'
  ]
  LOOP
    IF NOT public.jsonb_has(p_patient->'collections', v_key) THEN
      CONTINUE;
    END IF;
    IF jsonb_typeof(p_patient->'collections'->v_key) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'BAD_REQUEST: collections.% debe ser objeto', v_key USING ERRCODE = 'DL400';
    END IF;
    IF NOT public.can_write_patient_collection(v_role, v_key) THEN
      RAISE EXCEPTION 'FORBIDDEN: no puedes escribir %', v_key USING ERRCODE = 'DL403';
    END IF;
    IF v_key = 'payments'
       AND jsonb_typeof(coalesce(p_patient->'collections'->v_key->'removedIds', '[]'::jsonb)) = 'array'
       AND jsonb_array_length(coalesce(p_patient->'collections'->v_key->'removedIds', '[]'::jsonb)) > 0
       AND NOT v_is_manager THEN
      RAISE EXCEPTION 'FORBIDDEN: no puedes borrar pagos' USING ERRCODE = 'DL403';
    END IF;
  END LOOP;

  -- Soft-deleted del mismo id → DL413 (no DL412)
  IF EXISTS (
    SELECT 1 FROM public.patients
     WHERE id = v_pid AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'GONE: paciente soft-deleted' USING ERRCODE = 'DL413';
  END IF;

  SELECT p.version INTO v_ver
    FROM public.patients p
   WHERE p.id = v_pid
     AND p.doctor_id = v_clinic
     AND p.deleted_at IS NULL
   FOR UPDATE;

  v_new := NOT FOUND;

  IF v_new THEN
    IF p_expected_version IS NOT NULL THEN
      RAISE EXCEPTION 'VERSION_CONFLICT: paciente no existe con esa versión'
        USING ERRCODE = 'DL412';
    END IF;
    IF EXISTS (SELECT 1 FROM public.patients WHERE id = v_pid) THEN
      RAISE EXCEPTION 'VERSION_CONFLICT: el id ya existe (¿reintento?)'
        USING ERRCODE = 'DL412';
    END IF;
    IF NOT v_has_ident OR NOT public.jsonb_has(v_ident, 'fullName')
       OR nullif(btrim(v_ident->>'fullName'), '') IS NULL THEN
      RAISE EXCEPTION 'BAD_REQUEST: alta requiere identification.fullName'
        USING ERRCODE = 'DL400';
    END IF;
    v_next_ver := 1;
  ELSE
    IF p_expected_version IS NULL THEN
      RAISE EXCEPTION 'VERSION_CONFLICT: alta con id existente; recarga'
        USING ERRCODE = 'DL412';
    END IF;
    IF p_expected_version IS DISTINCT FROM v_ver THEN
      RAISE EXCEPTION 'VERSION_CONFLICT: versión stale (esperada %, actual %)',
        p_expected_version, v_ver
        USING ERRCODE = 'DL412';
    END IF;
    v_next_ver := v_ver + 1;
  END IF;

  -- ---- patients: INSERT plano (alta) vs UPDATE parcial (existente) --------
  -- ON CONFLICT convertiría la 2ª alta concurrente en UPDATE silencioso → DL412 muerto.
  IF v_new THEN
    BEGIN
      INSERT INTO public.patients (
        id, doctor_id, full_name, birth_date, gender, address, phone, email, occupation,
        motive_of_consult, consent_signed, updated_at, version
      ) VALUES (
        v_pid,
        v_clinic,
        btrim(v_ident->>'fullName'),
        CASE WHEN public.jsonb_has(v_ident, 'birthDate') THEN nullif(v_ident->>'birthDate', '') ELSE NULL END,
        CASE WHEN public.jsonb_has(v_ident, 'gender') THEN nullif(v_ident->>'gender', '') ELSE NULL END,
        CASE WHEN public.jsonb_has(v_ident, 'address') THEN nullif(v_ident->>'address', '') ELSE NULL END,
        CASE WHEN public.jsonb_has(v_ident, 'phone') THEN nullif(v_ident->>'phone', '') ELSE NULL END,
        CASE WHEN public.jsonb_has(v_ident, 'email') THEN nullif(v_ident->>'email', '') ELSE NULL END,
        CASE WHEN public.jsonb_has(v_ident, 'occupation') THEN nullif(v_ident->>'occupation', '') ELSE NULL END,
        CASE WHEN public.jsonb_has(v_clinical, 'motiveOfConsult')
          THEN nullif(v_clinical->>'motiveOfConsult', '') ELSE NULL END,
        CASE WHEN v_has_consent THEN (p_patient->>'consentSigned')::boolean ELSE false END,
        now(),
        v_next_ver
      );
      GET DIAGNOSTICS v_n = ROW_COUNT;
    EXCEPTION
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_con = CONSTRAINT_NAME;
        IF v_con IN ('patients_pkey', 'patients_id_key') THEN
          RAISE EXCEPTION 'VERSION_CONFLICT: alta concurrente del mismo id'
            USING ERRCODE = 'DL412';
        END IF;
        RAISE;
    END;
  ELSE
    UPDATE public.patients t SET
      full_name = CASE
        WHEN public.jsonb_has(v_ident, 'fullName') THEN btrim(v_ident->>'fullName')
        ELSE t.full_name END,
      birth_date = CASE
        WHEN public.jsonb_has(v_ident, 'birthDate') THEN nullif(v_ident->>'birthDate', '')
        ELSE t.birth_date END,
      gender = CASE
        WHEN public.jsonb_has(v_ident, 'gender') THEN nullif(v_ident->>'gender', '')
        ELSE t.gender END,
      address = CASE
        WHEN public.jsonb_has(v_ident, 'address') THEN nullif(v_ident->>'address', '')
        ELSE t.address END,
      phone = CASE
        WHEN public.jsonb_has(v_ident, 'phone') THEN nullif(v_ident->>'phone', '')
        ELSE t.phone END,
      email = CASE
        WHEN public.jsonb_has(v_ident, 'email') THEN nullif(v_ident->>'email', '')
        ELSE t.email END,
      occupation = CASE
        WHEN public.jsonb_has(v_ident, 'occupation') THEN nullif(v_ident->>'occupation', '')
        ELSE t.occupation END,
      motive_of_consult = CASE
        WHEN public.jsonb_has(v_clinical, 'motiveOfConsult')
        THEN nullif(v_clinical->>'motiveOfConsult', '')
        ELSE t.motive_of_consult END,
      consent_signed = CASE
        WHEN v_has_consent THEN (p_patient->>'consentSigned')::boolean
        ELSE t.consent_signed END,
      updated_at = now(),
      version = v_next_ver
    WHERE t.id = v_pid
      AND t.doctor_id = v_clinic
      AND t.deleted_at IS NULL
      AND t.version = p_expected_version;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      RAISE EXCEPTION 'VERSION_CONFLICT: no se actualizó (versión o tenant)'
        USING ERRCODE = 'DL412';
    END IF;
  END IF;

  IF v_n = 0 THEN
    RAISE EXCEPTION 'NOT_FOUND: no se pudo escribir paciente' USING ERRCODE = 'DL404';
  END IF;
  v_written := array_append(v_written, 'patients');

  -- ---- patient_clinical: solo grupos/claves presentes --------------------
  IF v_wants_clinical THEN
    INSERT INTO public.patient_clinical AS t (
      patient_id, doctor_id, allergies, medications, previous_diseases, family_history,
      blood_type, smoker, pregnant, habits, observations,
      odontogram, odontogram_history, periodontogram, updated_at
    ) VALUES (
      v_pid, v_clinic,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'allergies') THEN coalesce(
        ARRAY(SELECT jsonb_array_elements_text(coalesce(v_clinical->'allergies', '[]'::jsonb))),
        '{}'::text[]
      ) ELSE '{}'::text[] END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'medications')
        THEN nullif(v_clinical->>'medications', '') ELSE NULL END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'previousDiseases')
        THEN nullif(v_clinical->>'previousDiseases', '') ELSE NULL END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'familyHistory')
        THEN nullif(v_clinical->>'familyHistory', '') ELSE NULL END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'bloodType')
        THEN nullif(v_clinical->>'bloodType', '') ELSE NULL END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'smoker')
        THEN coalesce((v_clinical->>'smoker')::boolean, false) ELSE false END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'pregnant')
        THEN coalesce((v_clinical->>'pregnant')::boolean, false) ELSE false END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'habits')
        THEN nullif(v_clinical->>'habits', '') ELSE NULL END,
      CASE WHEN v_has_ch AND public.jsonb_has(v_clinical, 'observations')
        THEN nullif(v_clinical->>'observations', '') ELSE NULL END,
      CASE WHEN v_has_odo THEN coalesce(p_patient->'odontogram', '[]'::jsonb) ELSE '[]'::jsonb END,
      CASE WHEN v_has_odo_hist THEN coalesce(p_patient->'odontogramHistory', '[]'::jsonb) ELSE '[]'::jsonb END,
      CASE WHEN v_has_perio THEN coalesce(p_patient->'periodontogram', '{}'::jsonb) ELSE '{}'::jsonb END,
      now()
    )
    ON CONFLICT (patient_id) DO UPDATE SET
      allergies = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'allergies')
        THEN EXCLUDED.allergies ELSE t.allergies END,
      medications = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'medications')
        THEN EXCLUDED.medications ELSE t.medications END,
      previous_diseases = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'previousDiseases')
        THEN EXCLUDED.previous_diseases ELSE t.previous_diseases END,
      family_history = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'familyHistory')
        THEN EXCLUDED.family_history ELSE t.family_history END,
      blood_type = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'bloodType')
        THEN EXCLUDED.blood_type ELSE t.blood_type END,
      smoker = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'smoker')
        THEN EXCLUDED.smoker ELSE t.smoker END,
      pregnant = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'pregnant')
        THEN EXCLUDED.pregnant ELSE t.pregnant END,
      habits = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'habits')
        THEN EXCLUDED.habits ELSE t.habits END,
      observations = CASE
        WHEN public.jsonb_has(p_patient, 'clinicalHistory')
         AND public.jsonb_has(p_patient->'clinicalHistory', 'observations')
        THEN EXCLUDED.observations ELSE t.observations END,
      odontogram = CASE WHEN public.jsonb_has(p_patient, 'odontogram')
        THEN EXCLUDED.odontogram ELSE t.odontogram END,
      odontogram_history = CASE WHEN public.jsonb_has(p_patient, 'odontogramHistory')
        THEN EXCLUDED.odontogram_history ELSE t.odontogram_history END,
      periodontogram = CASE WHEN public.jsonb_has(p_patient, 'periodontogram')
        THEN EXCLUDED.periodontogram ELSE t.periodontogram END,
      updated_at = now()
    WHERE t.doctor_id = v_clinic;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n = 0 THEN
      RAISE EXCEPTION 'NOT_FOUND: patient_clinical' USING ERRCODE = 'DL404';
    END IF;
    v_written := array_append(v_written, 'patient_clinical');
  ELSE
    v_skipped := array_append(v_skipped, 'patient_clinical');
  END IF;

  -- ---- Colecciones -------------------------------------------------------
  FOREACH v_key IN ARRAY ARRAY[
    'evolutionNotes', 'history', 'budget', 'payments',
    'consents', 'prescriptions', 'labWorks'
  ]
  LOOP
    IF NOT public.jsonb_has(p_patient->'collections', v_key) THEN
      v_skipped := array_append(v_skipped, v_key);
      CONTINUE;
    END IF;
    v_coll := p_patient->'collections'->v_key;

    v_table := CASE v_key
      WHEN 'evolutionNotes' THEN 'evolution_notes'
      WHEN 'history' THEN 'clinical_events'
      WHEN 'budget' THEN 'budget_items'
      WHEN 'payments' THEN 'payments'
      WHEN 'consents' THEN 'consent_forms'
      WHEN 'prescriptions' THEN 'prescriptions'
      WHEN 'labWorks' THEN 'lab_works'
    END;

    v_items := coalesce(v_coll->'items', '[]'::jsonb);
    IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.items debe ser array', v_key USING ERRCODE = 'DL400';
    END IF;
    IF public.jsonb_has(v_coll, 'removedIds')
       AND jsonb_typeof(v_coll->'removedIds') IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.removedIds debe ser array', v_key USING ERRCODE = 'DL400';
    END IF;
    IF jsonb_array_length(v_items) > 500 THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.items excede 500', v_key USING ERRCODE = 'DL400';
    END IF;
    IF jsonb_array_length(coalesce(v_coll->'removedIds', '[]'::jsonb)) > 500 THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.removedIds excede 500', v_key USING ERRCODE = 'DL400';
    END IF;

    -- ids: requeridos, uuid válidos, únicos
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_items) e
      WHERE NOT public.jsonb_has(e, 'id')
    ) THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.items[].id requerido', v_key USING ERRCODE = 'DL400';
    END IF;

    BEGIN
      SELECT coalesce(array_agg(DISTINCT (e->>'id')::uuid), ARRAY[]::uuid[])
        INTO v_item_ids
        FROM jsonb_array_elements(v_items) e;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.items[].id uuid inválido', v_key USING ERRCODE = 'DL400';
    END;

    SELECT count(*)::int INTO v_dup FROM (
      SELECT (e->>'id') FROM jsonb_array_elements(v_items) e GROUP BY 1 HAVING count(*) > 1
    ) d;
    IF v_dup > 0 THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.items ids duplicados', v_key USING ERRCODE = 'DL400';
    END IF;

    BEGIN
      SELECT coalesce(array_agg(x::uuid), ARRAY[]::uuid[])
        INTO v_removed_ids
        FROM jsonb_array_elements_text(coalesce(v_coll->'removedIds', '[]'::jsonb)) AS x;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.removedIds uuid inválido', v_key USING ERRCODE = 'DL400';
    END;

    IF EXISTS (SELECT 1 FROM unnest(v_item_ids) i WHERE i = ANY (v_removed_ids)) THEN
      RAISE EXCEPTION 'BAD_REQUEST: %.items y removedIds no deben solaparse', v_key
        USING ERRCODE = 'DL400';
    END IF;

    PERFORM public.assert_subrow_ids_writable(v_table, v_item_ids, v_pid, v_clinic);

    IF cardinality(v_removed_ids) > 0 THEN
      IF v_key = 'evolutionNotes' THEN
        UPDATE public.evolution_notes SET deleted_at = now(), deleted_by = v_uid
         WHERE id = ANY (v_removed_ids) AND patient_id = v_pid AND doctor_id = v_clinic AND deleted_at IS NULL;
      ELSIF v_key = 'history' THEN
        UPDATE public.clinical_events SET deleted_at = now(), deleted_by = v_uid
         WHERE id = ANY (v_removed_ids) AND patient_id = v_pid AND doctor_id = v_clinic AND deleted_at IS NULL;
      ELSIF v_key = 'budget' THEN
        UPDATE public.budget_items SET deleted_at = now(), deleted_by = v_uid
         WHERE id = ANY (v_removed_ids) AND patient_id = v_pid AND doctor_id = v_clinic AND deleted_at IS NULL;
      ELSIF v_key = 'payments' THEN
        UPDATE public.payments SET deleted_at = now(), deleted_by = v_uid
         WHERE id = ANY (v_removed_ids) AND patient_id = v_pid AND doctor_id = v_clinic AND deleted_at IS NULL;
      ELSIF v_key = 'consents' THEN
        UPDATE public.consent_forms SET deleted_at = now(), deleted_by = v_uid
         WHERE id = ANY (v_removed_ids) AND patient_id = v_pid AND doctor_id = v_clinic AND deleted_at IS NULL;
      ELSIF v_key = 'prescriptions' THEN
        UPDATE public.prescriptions SET deleted_at = now(), deleted_by = v_uid
         WHERE id = ANY (v_removed_ids) AND patient_id = v_pid AND doctor_id = v_clinic AND deleted_at IS NULL;
      ELSIF v_key = 'labWorks' THEN
        UPDATE public.lab_works SET deleted_at = now(), deleted_by = v_uid
         WHERE id = ANY (v_removed_ids) AND patient_id = v_pid AND doctor_id = v_clinic AND deleted_at IS NULL;
      END IF;
      GET DIAGNOSTICS v_n = ROW_COUNT;
      v_removed := v_removed + v_n;
      v_ignored := v_ignored + greatest(cardinality(v_removed_ids) - v_n, 0);
    END IF;

    v_expect := jsonb_array_length(v_items);
    IF v_expect = 0 THEN
      v_written := array_append(v_written, v_key);
      CONTINUE;
    END IF;

    IF v_key = 'payments' AND NOT v_is_manager THEN
      IF EXISTS (
        SELECT 1
          FROM jsonb_array_elements(v_items) e
          JOIN public.payments p ON p.id = (e->>'id')::uuid
         WHERE p.patient_id = v_pid AND p.doctor_id = v_clinic AND p.deleted_at IS NULL
           AND (
             p.amount IS DISTINCT FROM (e->>'amount')::numeric
             OR p.date IS DISTINCT FROM (e->>'date')
             OR p.method IS DISTINCT FROM (e->>'method')
           )
      ) THEN
        RAISE EXCEPTION 'FORBIDDEN: no puedes editar amount/date/method de pagos'
          USING ERRCODE = 'DL403';
      END IF;
    END IF;

    IF v_key = 'evolutionNotes' THEN
      INSERT INTO public.evolution_notes AS t (id, patient_id, doctor_id, date, content, procedure)
      SELECT (e->>'id')::uuid, v_pid, v_clinic, e->>'date', e->>'content', coalesce(e->>'procedure', '')
        FROM jsonb_array_elements(v_items) e
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date, content = EXCLUDED.content, procedure = EXCLUDED.procedure
      WHERE t.patient_id = v_pid AND t.doctor_id = v_clinic AND t.deleted_at IS NULL;
    ELSIF v_key = 'history' THEN
      INSERT INTO public.clinical_events AS t (id, patient_id, doctor_id, date, type, description, tooth_id)
      SELECT (e->>'id')::uuid, v_pid, v_clinic, e->>'date', e->>'type', e->>'description',
             nullif(e->>'toothId', '')::int
        FROM jsonb_array_elements(v_items) e
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date, type = EXCLUDED.type, description = EXCLUDED.description, tooth_id = EXCLUDED.tooth_id
      WHERE t.patient_id = v_pid AND t.doctor_id = v_clinic AND t.deleted_at IS NULL;
    ELSIF v_key = 'budget' THEN
      INSERT INTO public.budget_items AS t (id, patient_id, doctor_id, treatment, tooth_id, unit_cost, quantity, status, created_at)
      SELECT (e->>'id')::uuid, v_pid, v_clinic, e->>'treatment', nullif(e->>'toothId', '')::int,
             (e->>'unitCost')::numeric, coalesce((e->>'quantity')::int, 1), e->>'status',
             coalesce((e->>'createdAt')::timestamptz, now())
        FROM jsonb_array_elements(v_items) e
      ON CONFLICT (id) DO UPDATE SET
        treatment = EXCLUDED.treatment, tooth_id = EXCLUDED.tooth_id, unit_cost = EXCLUDED.unit_cost,
        quantity = EXCLUDED.quantity, status = EXCLUDED.status
      WHERE t.patient_id = v_pid AND t.doctor_id = v_clinic AND t.deleted_at IS NULL;
    ELSIF v_key = 'payments' THEN
      INSERT INTO public.payments AS t (id, patient_id, doctor_id, amount, method, note, date)
      SELECT (e->>'id')::uuid, v_pid, v_clinic, (e->>'amount')::numeric, e->>'method',
             nullif(e->>'note', ''), e->>'date'
        FROM jsonb_array_elements(v_items) e
      ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount, method = EXCLUDED.method, note = EXCLUDED.note, date = EXCLUDED.date
      WHERE t.patient_id = v_pid AND t.doctor_id = v_clinic AND t.deleted_at IS NULL;
    ELSIF v_key = 'consents' THEN
      INSERT INTO public.consent_forms AS t (id, patient_id, doctor_id, title, content, signature_data, signed_at, witness_name)
      SELECT (e->>'id')::uuid, v_pid, v_clinic, e->>'title', e->>'content', e->>'signatureData',
             e->>'signedAt', nullif(e->>'witnessName', '')
        FROM jsonb_array_elements(v_items) e
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, content = EXCLUDED.content, signature_data = EXCLUDED.signature_data,
        signed_at = EXCLUDED.signed_at, witness_name = EXCLUDED.witness_name
      WHERE t.patient_id = v_pid AND t.doctor_id = v_clinic AND t.deleted_at IS NULL;
    ELSIF v_key = 'prescriptions' THEN
      INSERT INTO public.prescriptions AS t (id, patient_id, doctor_id, date, diagnosis, medications, notes)
      SELECT (e->>'id')::uuid, v_pid, v_clinic, e->>'date', e->>'diagnosis',
             coalesce(e->'medications', '[]'::jsonb), nullif(e->>'notes', '')
        FROM jsonb_array_elements(v_items) e
      ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date, diagnosis = EXCLUDED.diagnosis, medications = EXCLUDED.medications, notes = EXCLUDED.notes
      WHERE t.patient_id = v_pid AND t.doctor_id = v_clinic AND t.deleted_at IS NULL;
    ELSIF v_key = 'labWorks' THEN
      INSERT INTO public.lab_works AS t (
        id, patient_id, doctor_id, description, lab_name, sent_date, expected_date, cost, status, updated_at
      )
      SELECT (e->>'id')::uuid, v_pid, v_clinic, e->>'description', e->>'labName', e->>'sentDate',
             nullif(e->>'expectedDate', ''), coalesce((e->>'cost')::numeric, 0),
             coalesce(e->>'status', 'pending'), now()
        FROM jsonb_array_elements(v_items) e
      ON CONFLICT (id) DO UPDATE SET
        description = EXCLUDED.description, lab_name = EXCLUDED.lab_name, sent_date = EXCLUDED.sent_date,
        expected_date = EXCLUDED.expected_date, cost = EXCLUDED.cost, status = EXCLUDED.status, updated_at = now()
      WHERE t.patient_id = v_pid AND t.doctor_id = v_clinic AND t.deleted_at IS NULL;
    END IF;

    GET DIAGNOSTICS v_n = ROW_COUNT;
    IF v_n IS DISTINCT FROM v_expect THEN
      RAISE EXCEPTION 'NOT_FOUND: upsert % escribió % de %', v_key, v_n, v_expect
        USING ERRCODE = 'DL404';
    END IF;
    v_written := array_append(v_written, v_key);
  END LOOP;

  RETURN jsonb_build_object(
    'patient_id', v_pid,
    'version', v_next_ver,
    'written', to_jsonb(v_written),
    'skipped', to_jsonb(v_skipped),
    'removed', v_removed,
    'ignored', v_ignored
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.save_patient(jsonb, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_patient(jsonb, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_patient(jsonb, integer) TO authenticated;
