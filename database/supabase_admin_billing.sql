-- ============================================================
-- DienteLink — Panel interno de cobros
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de
-- supabase_subscriptions_v2.sql
--
-- SEGURIDAD:
--   Activar días SOLO es posible si la sesión autenticada
--   pertenece a joemurilloa@gmail.com (email confirmado en
--   auth.users + mismo email en el JWT firmado por Supabase).
--   Cualquier otro usuario recibe "No autorizado".
--
-- REGLA DE ORO:
--   Expirar o dejar de pagar NUNCA borra pacientes, citas,
--   expedientes ni comprobantes. Solo se corta el ACCESO.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = 'joemurilloa@gmail.com'
      AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'joemurilloa@gmail.com'
      AND u.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_clinics();

CREATE OR REPLACE FUNCTION public.admin_list_clinics()
RETURNS TABLE (
  clinic_id uuid,
  full_name text,
  clinic_name text,
  email text,
  status text,
  is_trial boolean,
  period_end timestamptz,
  days_left int,
  pending_receipts int,
  last_payment_at timestamptz,
  receipts jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.admin_list_clinics() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_clinics() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_clinics() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_extend_subscription(
  p_clinic_id uuid,
  p_days int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.admin_extend_subscription(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_extend_subscription(uuid, int) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_extend_subscription(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
