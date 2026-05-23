-- =============================================================
-- DienteLink: Public Booking RPC Functions
-- Run this in Supabase SQL Editor to enable secure public booking
-- =============================================================

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
RETURNS TABLE (date TEXT, time TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT date, time 
  FROM appointments 
  WHERE doctor_id = p_doctor_id 
    AND status IN ('Programada', 'Completada');
$$;

-- 4. Get Pending Appointment Requests for Public Page
-- Returns limited information to prevent double-booking of pending slots.
CREATE OR REPLACE FUNCTION get_public_appointment_requests(p_doctor_id UUID)
RETURNS TABLE (id UUID, requested_date TEXT, requested_time TEXT, status TEXT, appointment_type TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, requested_date, requested_time, status, appointment_type 
  FROM appointment_requests 
  WHERE doctor_id = p_doctor_id 
    AND status IN ('pending', 'approved');
$$;

-- Set correct permissions so unauthenticated (anon) users can execute these functions
GRANT EXECUTE ON FUNCTION get_public_doctor_availability(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_booking_settings(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_appointments(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_public_appointment_requests(UUID) TO anon, authenticated;
