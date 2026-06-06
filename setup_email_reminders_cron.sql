-- ============================================================
-- DienteLink — Cron Job for Email Reminders
-- Run this in the Supabase SQL Editor
-- ============================================================
--
-- PREREQUISITES (from Supabase Dashboard → Database → Extensions):
--   1. Enable: pg_cron
--   2. Enable: pg_net
--
-- This creates a cron job that invokes the 'process-reminders'
-- Edge Function every hour. The function handles:
--   - Querying tomorrow's appointments
--   - Checking subscription status (trial/pro)
--   - Sending email reminders via Resend
--   - Skipping free/expired users
-- ============================================================

-- 1. Enable extensions (if not already via Dashboard)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Remove existing job if any
SELECT cron.unschedule('process-email-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-reminders');

-- 3. Create cron job — runs every hour at minute 0
-- IMPORTANT: Replace YOUR_SUPABASE_URL and YOUR_ANON_KEY below.
-- Find them in: Dashboard → Settings → API

SELECT cron.schedule(
  'process-email-reminders',          -- job name
  '0 * * * *',                        -- every hour at :00
  $$
  SELECT net.http_post(
    url    := 'https://jrzydxpcyonrzhbpzibc.supabase.co/functions/v1/process-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf'
    ),
    body   := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================
-- VERIFICATION
-- ============================================================
-- Check that the job was created:
--   SELECT * FROM cron.job WHERE jobname = 'process-email-reminders';
--
-- Check execution history:
--   SELECT * FROM cron.job_run_details 
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-email-reminders')
--   ORDER BY start_time DESC LIMIT 10;
--
-- To pause:
--   SELECT cron.unschedule('process-email-reminders');
-- ============================================================
