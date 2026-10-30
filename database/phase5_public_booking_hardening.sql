-- ARCHIVO HIST�RICO. NO EJECUTAR EN PRODUCCI�N.
-- Fuente de verdad: supabase/migrations/
-- Ver database/README.md
-- ============================================================
-- DienteLink — Fase 5
-- Pegar en el SQL Editor DESPUÉS de phase4_user_notifications.sql.
-- No reejecutes los scripts 01–33 encima de esto.
--
-- 1) La página pública ya no recibe el id de la solicitud.
-- 2) Solo ocupa hueco una cita Programada de hoy en adelante.
-- 3) El aviso por correo exige el secreto de Vault.
--
-- Antes de pegar este archivo, crea el secreto (una sola vez)
-- y pon EL MISMO valor en la edge function:
--
--   select vault.create_secret(
--     'PEGA_UN_SECRETO_LARGO',
--     'notify_webhook_secret',
--     'Header x-notify-secret de notify-doctor-new-request'
--   );
--
-- Supabase → Edge Functions → notify-doctor-new-request → Secrets
--   NOTIFY_WEBHOOK_SECRET = el mismo valor
--
-- Sin ese par, la solicitud se guarda y el correo no sale.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS vault;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- ------------------------------------------------------------
-- 1. Citas públicas: solo Programada, desde hoy (Honduras)
-- ------------------------------------------------------------
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
     AND a.status = 'Programada'
     AND a.date >= to_char((now() AT TIME ZONE 'America/Tegucigalpa')::date, 'YYYY-MM-DD')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

-- La firma cambia (se quita el uuid). CREATE OR REPLACE no puede hacerlo.
DROP FUNCTION IF EXISTS public.get_public_appointment_requests(uuid);

CREATE FUNCTION public.get_public_appointment_requests(p_doctor_id uuid)
RETURNS TABLE (requested_date text, requested_time text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.requested_date, ar.requested_time
    FROM public.appointment_requests ar
    JOIN public.booking_settings b ON b.doctor_id = ar.doctor_id
   WHERE ar.doctor_id = p_doctor_id
     AND ar.status IN ('pending', 'approved')
     AND ar.requested_date >= to_char((now() AT TIME ZONE 'America/Tegucigalpa')::date, 'YYYY-MM-DD')
     AND b.is_active = true
     AND public.clinic_has_paid_access(p_doctor_id);
$$;

REVOKE ALL ON FUNCTION public.get_public_appointments(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_appointment_requests(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_appointments(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_appointment_requests(uuid) TO anon, authenticated;

-- ------------------------------------------------------------
-- 2. El disparador manda el secreto. Un fallo de correo no
--    impide guardar la solicitud.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_appointment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
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
        'apikey', current_setting('app.settings.supabase_publishable_key', true),
        'x-notify-secret', hook_secret
      ),
      body    := jsonb_build_object('record', jsonb_build_object('id', NEW.id))
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo avisar la solicitud nueva: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
