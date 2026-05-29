-- ==============================================================================
-- SETUP: Cron Job para disparar recordatorios de WhatsApp automáticamente
-- ==============================================================================
-- 
-- PREREQUISITOS (hacer desde Supabase Dashboard):
--   1. Ir a Database → Extensions
--   2. Buscar y activar: pg_cron
--   3. Buscar y activar: pg_net  (necesario para hacer HTTP requests desde SQL)
--
-- Luego ejecutar este script en: SQL Editor (Supabase Dashboard)
-- ==============================================================================

-- ── 1. Habilitar extensiones (si no están habilitadas via Dashboard) ──────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── 2. Crear el cron job que invoca la Edge Function cada 5 minutos ──────────
-- 
-- IMPORTANTE: Reemplaza TU_ANON_KEY_AQUI con tu Supabase Anon Key.
-- La encuentras en: Dashboard → Settings → API → anon public key
--
-- El URL del proyecto ya está incluido basado en tu dashboard.
-- ==============================================================================

SELECT cron.schedule(
  'trigger-whatsapp-reminders',     -- nombre del job
  '*/5 * * * *',                    -- cada 5 minutos
  $$
  SELECT net.http_post(
    url    := 'https://jrzydxpcyonrzhbpz1bc.supabase.co/functions/v1/whatsapp-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf'
    ),
    body   := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── 3. Verificar que el job se creó ──────────────────────────────────────────
-- Ejecuta esto para ver tus cron jobs activos:
SELECT * FROM cron.job;

-- ── COMANDOS ÚTILES ──────────────────────────────────────────────────────────
-- 
-- Ver historial de ejecuciones:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- Pausar el job:
--   SELECT cron.unschedule('trigger-whatsapp-reminders');
--
-- Cambiar frecuencia a cada 10 minutos:
--   SELECT cron.alter_job(
--     job_id := (SELECT jobid FROM cron.job WHERE jobname = 'trigger-whatsapp-reminders'),
--     schedule := '*/10 * * * *'
--   );
-- ==============================================================================
