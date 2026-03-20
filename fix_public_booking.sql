-- =========================================================================
-- FIX DEFINITIVO: Reparar enlace público de citas y Sincronización
-- =========================================================================
-- PASO 1: Copia TODO y pégalo en el SQL Editor de app.supabase.com
-- PASO 2: Dale "Run"
-- =========================================================================

-- Función para leer booking_settings públicamente
CREATE OR REPLACE FUNCTION get_public_booking_settings(p_doctor_id UUID)
RETURNS SETOF booking_settings
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM booking_settings WHERE doctor_id = p_doctor_id LIMIT 1;
$$;

-- Función para leer doctor_availability públicamente
CREATE OR REPLACE FUNCTION get_public_doctor_availability(p_doctor_id UUID)
RETURNS SETOF doctor_availability
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM doctor_availability WHERE doctor_id = p_doctor_id LIMIT 1;
$$;

-- NUEVO: Función para leer solicitudes de cita (solo fechas y horas)
CREATE OR REPLACE FUNCTION get_public_appointment_requests(p_doctor_id UUID)
RETURNS TABLE (id UUID, requested_date TEXT, requested_time TEXT, status TEXT, appointment_type TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, requested_date, requested_time, status, appointment_type 
  FROM appointment_requests 
  WHERE doctor_id = p_doctor_id AND status IN ('pending', 'approved');
$$;

-- NUEVO: Función para leer citas confirmadas (solo fechas y horas)
CREATE OR REPLACE FUNCTION get_public_appointments(p_doctor_id UUID)
RETURNS TABLE (date TEXT, time TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date, time 
  FROM appointments 
  WHERE doctor_id = p_doctor_id AND status IN ('Programada', 'Completada');
$$;

-- Dar permisos de ejecución al rol anónimo
GRANT EXECUTE ON FUNCTION get_public_booking_settings(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_doctor_availability(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_appointment_requests(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_appointments(UUID) TO anon;

-- Forzar recarga de schema
NOTIFY pgrst, 'reload schema';
