-- =============================================================
-- DienteLink: Public Booking RPC Functions
-- Run this in Supabase SQL Editor to enable secure public booking
-- =============================================================

DROP FUNCTION IF EXISTS get_public_doctor_availability(UUID);
DROP FUNCTION IF EXISTS get_public_booking_settings(UUID);
DROP FUNCTION IF EXISTS get_public_appointments(UUID);
DROP FUNCTION IF EXISTS get_public_appointment_requests(UUID);

-- 1. Get Doctor Availability for Public Page
-- Returns the configuration but runs as SECURITY DEFINER so anonymous users
-- can execute it even if the table has RLS restricting SELECT.
CREATE OR REPLACE FUNCTION get_public_doctor_availability(p_doctor_id UUID)
RETURNS SETOF doctor_availability
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM doctor_availability WHERE doctor_id = p_doctor_id;
$$;

-- 2. Get Booking Settings for Public Page
CREATE OR REPLACE FUNCTION get_public_booking_settings(p_doctor_id UUID)
RETURNS SETOF booking_settings
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM booking_settings WHERE doctor_id = p_doctor_id AND is_active = true;
$$;

-- 3. Get Confirmed Appointments for Public Page
-- ONLY returns date and time to prevent exposing patient names or data.
-- Used to calculate occupied time slots.
CREATE OR REPLACE FUNCTION get_public_appointments(p_doctor_id UUID)
RETURNS TABLE ("date" TEXT, "time" TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT a.date, a.time 
  FROM appointments a
  JOIN booking_settings b ON b.doctor_id = a.doctor_id
  WHERE a.doctor_id = p_doctor_id 
    AND a.status IN ('Programada', 'Completada')
    AND b.is_active = true;
$$;

-- 4. Get Pending Appointment Requests for Public Page
-- Returns limited information to prevent double-booking of pending slots.
CREATE OR REPLACE FUNCTION get_public_appointment_requests(p_doctor_id UUID)
RETURNS TABLE (id UUID, requested_date TEXT, requested_time TEXT, status TEXT, appointment_type TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ar.id, ar.requested_date, ar.requested_time, ar.status, ar.appointment_type 
  FROM appointment_requests ar
  JOIN booking_settings b ON b.doctor_id = ar.doctor_id
  WHERE ar.doctor_id = p_doctor_id 
    AND ar.status IN ('pending', 'approved')
    AND b.is_active = true;
$$;

-- Set correct permissions so unauthenticated (anon) users can execute these functions
GRANT EXECUTE ON FUNCTION get_public_doctor_availability(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_booking_settings(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_appointments(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_appointment_requests(UUID) TO anon, authenticated;
