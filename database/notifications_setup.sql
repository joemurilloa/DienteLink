-- ============================================================
-- Avisos por correo: solicitud nueva -> doctor (+ acuse al paciente)
-- Ejecutar en el SQL Editor de Supabase. Es idempotente.
-- Requiere la extensión pg_net (Database -> Extensions).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Marca para no avisar dos veces la misma solicitud
ALTER TABLE public.appointment_requests
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- 2. Quitar disparadores antiguos tipo webhook (guardaban la clave interna en la base)
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT tg.tgname
    FROM pg_trigger tg
    JOIN pg_proc p ON p.oid = tg.tgfoid
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE tg.tgrelid = 'public.appointment_requests'::regclass
      AND NOT tg.tgisinternal
      AND n.nspname = 'supabase_functions'
      AND p.proname = 'http_request'
  LOOP
    EXECUTE format('DROP TRIGGER %I ON public.appointment_requests', t.tgname);
  END LOOP;
END $$;

-- 3. Nuevo disparador: solo envía el id; la función valida todo contra la base.
--    Usa la clave pública (anon/publishable), no la service_role.
CREATE OR REPLACE FUNCTION public.notify_new_appointment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url     := 'https://jrzydxpcyonrzhbpzibc.supabase.co/functions/v1/notify-doctor-new-request',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf'
      ),
      body    := jsonb_build_object('record', jsonb_build_object('id', NEW.id))
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- un fallo de correo nunca debe impedir guardar la solicitud
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_appointment_request ON public.appointment_requests;
CREATE TRIGGER trg_notify_new_appointment_request
AFTER INSERT ON public.appointment_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_appointment_request();

-- 4. Quitar el reloj horario contra la función vacía (llena el historial de cron)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE $cron$
      SELECT cron.unschedule(jobid)
      FROM cron.job
      WHERE jobname = 'process-email-reminders'
    $cron$;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo quitar el cron: %', SQLERRM;
END $$;

-- Limpieza opcional del historial acumulado:
-- DELETE FROM cron.job_run_details WHERE end_time < now() - interval '1 day';
