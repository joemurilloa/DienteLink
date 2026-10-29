-- =============================================================
-- DienteLink: Public Booking RPC Functions
-- Estas funciones son la versión canónica.
-- Llevan search_path y exigen plan vigente.
-- Volver a ejecutar este archivo no quita ninguna de las dos.
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_public_doctor_availability(p_doctor_id uuid)
RETURNS SETOF public.doctor_availability
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.*
    FROM public.doctor_availability d
   WHERE d.doctor_id = p_doctor_id
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

CREATE OR REPLACE FUNCTION public.get_public_booking_settings(p_doctor_id uuid)
RETURNS SETOF public.booking_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.*
    FROM public.booking_settings b
   WHERE b.doctor_id = p_doctor_id
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

CREATE OR REPLACE FUNCTION public.get_public_appointments(p_doctor_id uuid)
RETURNS TABLE ("date" text, "time" text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.date, a.time
    FROM public.appointments a
    JOIN public.booking_settings b ON b.doctor_id = a.doctor_id
   WHERE a.doctor_id = p_doctor_id
     AND a.status IN ('Programada', 'Completada')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

CREATE OR REPLACE FUNCTION public.get_public_appointment_requests(p_doctor_id uuid)
RETURNS TABLE (id uuid, requested_date text, requested_time text, status text, appointment_type text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.id, ar.requested_date, ar.requested_time, ar.status, ar.appointment_type
    FROM public.appointment_requests ar
    JOIN public.booking_settings b ON b.doctor_id = ar.doctor_id
   WHERE ar.doctor_id = p_doctor_id
     AND ar.status IN ('pending', 'approved')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_doctor_availability(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_booking_settings(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_appointments(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_appointment_requests(uuid) TO anon, authenticated;
