-- ============================================================
-- DienteLink — Subscriptions v2 + Payment Receipts
-- Run this in the Supabase SQL Editor
--
-- PRINCIPIO FUNDAMENTAL:
--   Los datos de pacientes NUNCA se borran.
--   La suscripción solo controla el ACCESO, no los datos.
--   Los datos se conservan mínimo 10 años por ley médica.
-- ============================================================

-- ============================================================
-- 1. ACTUALIZAR tabla subscriptions existente
-- ============================================================

-- Agregar columna trial_started_at si no existe
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz DEFAULT now();

-- Ampliar el CHECK para incluir 'expired'
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'inactive', 'pending', 'trial', 'expired'));

-- ============================================================
-- 2. TABLA payment_receipts — Comprobantes de pago
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  -- ON DELETE RESTRICT: nunca borrar si hay comprobantes
  email_referencia  text NOT NULL,         -- Email que el doctor puso como referencia
  amount_paid       numeric(10,2),         -- Monto que dice haber pagado
  image_url         text,                  -- URL del comprobante en Supabase Storage
  storage_path      text,                  -- Path interno en Storage
  notes             text,                  -- Nota opcional del doctor
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at       timestamptz,           -- Cuándo lo revisaste
  reviewed_note     text,                  -- Nota tuya al revisar
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Índice para buscar comprobantes por clínica
CREATE INDEX IF NOT EXISTS idx_payment_receipts_clinic_id
  ON public.payment_receipts(clinic_id);

-- Índice para buscar por status (pendientes primero)
CREATE INDEX IF NOT EXISTS idx_payment_receipts_status
  ON public.payment_receipts(status, created_at DESC);

-- ============================================================
-- 3. RLS para payment_receipts
-- ============================================================

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Doctor solo ve sus propios comprobantes
DROP POLICY IF EXISTS "Doctors can view own receipts" ON public.payment_receipts;
CREATE POLICY "Doctors can view own receipts"
  ON public.payment_receipts FOR SELECT
  USING (auth.uid() = clinic_id);

-- Doctor puede insertar sus propios comprobantes
DROP POLICY IF EXISTS "Doctors can insert own receipts" ON public.payment_receipts;
CREATE POLICY "Doctors can insert own receipts"
  ON public.payment_receipts FOR INSERT
  WITH CHECK (auth.uid() = clinic_id);

-- Solo el service role puede actualizar (para que el admin revise)
-- No hay política de UPDATE para el cliente → solo service role puede

GRANT SELECT, INSERT ON public.payment_receipts TO authenticated;

-- ============================================================
-- 4. VISTA MEJORADA: subscription_status
-- ============================================================

-- Eliminar la vista existente primero (PostgreSQL no permite cambiar
-- columnas con CREATE OR REPLACE si el orden o los nombres cambian)
DROP VIEW IF EXISTS public.subscription_status;

CREATE OR REPLACE VIEW public.subscription_status WITH (security_invoker = true) AS
  SELECT
    s.clinic_id,
    s.status,
    s.plan,
    s.amount,
    s.currency,
    s.trial_started_at,
    s.current_period_start,
    s.current_period_end,
    s.last_payment_at,
    -- ¿Está activo ahora mismo?
    CASE
      WHEN s.status IN ('active', 'trial') AND s.current_period_end > now() THEN true
      ELSE false
    END AS is_active,
    -- ¿Es trial?
    CASE WHEN s.status = 'trial' THEN true ELSE false END AS is_trial,
    -- ¿Está expirado?
    CASE
      WHEN s.status = 'expired' THEN true
      WHEN s.current_period_end <= now() THEN true
      ELSE false
    END AS is_expired,
    -- Días restantes (0 si ya venció)
    GREATEST(0, EXTRACT(DAY FROM (s.current_period_end - now()))::int) AS days_left,
    -- ¿Vence pronto? (dentro de 4 días)
    CASE
      WHEN s.current_period_end BETWEEN now() AND now() + interval '4 days' THEN true
      ELSE false
    END AS expires_soon
  FROM public.subscriptions s
  WHERE s.clinic_id = auth.uid();

GRANT SELECT ON public.subscription_status TO authenticated;


-- ============================================================
-- 5. FUNCIÓN para activar suscripción (usada por el admin)
--    Llamar con service role key desde Supabase Dashboard o
--    desde una Edge Function futura de admin.
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_clinic_id uuid,
  p_months int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================================
-- NOTA DE SEGURIDAD DE DATOS:
--   - ON DELETE RESTRICT en payment_receipts impide borrar
--     usuarios que tengan comprobantes.
--   - Los datos de pacientes (tabla patients) tienen sus
--     propias políticas RLS pero NUNCA se borran por este
--     sistema de suscripciones.
--   - El acceso se controla en el FRONTEND via SubscriptionGate,
--     no borrando datos del backend.
-- ============================================================
