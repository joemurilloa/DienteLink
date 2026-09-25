-- ==============================================================================
-- FIX: Recrear el Cron Job con la URL correcta
-- ==============================================================================
-- 
-- La URL anterior tenía un typo: "pz1bc" en vez de "pzibc"
-- Este script elimina el cron viejo y crea uno nuevo con la URL correcta.
--
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Pega este código completo
-- 3. Haz clic en "Run"
-- ==============================================================================

-- Paso 1: Eliminar cron job anterior (si existe)
SELECT cron.unschedule('trigger-whatsapp-reminders');

-- Paso 2: Crear el cron job con la URL CORRECTA
SELECT cron.schedule(
  'trigger-whatsapp-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://jrzydxpcyonrzhbpzibc.supabase.co/functions/v1/whatsapp-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf'
    ),
    body   := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Paso 3: Verificar que el job se creó
SELECT jobid, jobname, schedule, command FROM cron.job;

-- Paso 4: Ver últimas ejecuciones (después de 5 min)
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
