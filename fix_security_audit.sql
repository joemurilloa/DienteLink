-- =========================================================================
-- FIX DE SEGURIDAD: Restringir endpoint público + limitar SECURITY DEFINER
-- =========================================================================
-- Copia TODO y pégalo en el SQL Editor de app.supabase.com → Run
-- =========================================================================

-- 1. RESTRINGIR INSERT público de appointment_requests
-- Solo permite inserts para doctores que existan y fuerza status='pending'
DROP POLICY IF EXISTS "Public can submit appointment requests" ON appointment_requests;

CREATE POLICY "Public can submit appointment requests"
  ON appointment_requests FOR INSERT
  WITH CHECK (
    doctor_id IN (SELECT id FROM profiles)
    AND status = 'pending'
  );

-- 2. LIMITAR columnas expuestas en funciones SECURITY DEFINER
-- Primero DROP las funciones existentes (Supabase no permite cambiar return type con CREATE OR REPLACE)
DROP FUNCTION IF EXISTS get_public_booking_settings(UUID);
DROP FUNCTION IF EXISTS get_public_doctor_availability(UUID);

-- Recrear con columnas limitadas
CREATE FUNCTION get_public_booking_settings(p_doctor_id UUID)
RETURNS TABLE (
  doctor_name TEXT,
  clinic_name TEXT,
  description TEXT,
  available_types TEXT[],
  require_phone BOOLEAN,
  require_message BOOLEAN,
  confirmation_message TEXT,
  is_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT doctor_name, clinic_name, description, available_types,
         require_phone, require_message, confirmation_message, is_active
  FROM booking_settings
  WHERE doctor_id = p_doctor_id
  LIMIT 1;
$$;

CREATE FUNCTION get_public_doctor_availability(p_doctor_id UUID)
RETURNS TABLE (
  doctor_id UUID,
  weekly_schedule JSONB,
  slot_duration INTEGER,
  buffer_time INTEGER,
  advance_booking_days INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT doctor_id, weekly_schedule, slot_duration, buffer_time, advance_booking_days
  FROM doctor_availability
  WHERE doctor_id = p_doctor_id
  LIMIT 1;
$$;

-- Restaurar permisos de ejecución al rol anónimo
GRANT EXECUTE ON FUNCTION get_public_booking_settings(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_doctor_availability(UUID) TO anon;

-- 3. AGREGAR created_at a payments (faltante en schema original)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. AGREGAR has_completed_onboarding si falta
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT false;

-- 5. Forzar recarga de schema
NOTIFY pgrst, 'reload schema';
