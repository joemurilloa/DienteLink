-- ============================================================
-- DienteLink — Cron Job de Expiración Automática
-- Run AFTER supabase_subscriptions_v2.sql
--
-- Requiere pg_cron activado en Supabase (está activo por defecto
-- en proyectos de Supabase desde 2023).
-- ============================================================

-- ============================================================
-- 1. FUNCIÓN que expira suscripciones vencidas
-- ============================================================

CREATE OR REPLACE FUNCTION public.expire_overdue_subscriptions()
RETURNS int   -- Retorna cuántas filas actualizó
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.subscriptions
  SET
    status     = 'expired',
    updated_at = now()
  WHERE
    status IN ('trial', 'active')          -- Solo si está activo o en trial
    AND current_period_end < now();        -- Y ya venció

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  -- Log opcional (útil para debugging)
  IF updated_count > 0 THEN
    RAISE NOTICE 'DienteLink: % suscripción(es) marcada(s) como expirada(s)', updated_count;
  END IF;

  RETURN updated_count;
END;
$$;

-- ============================================================
-- 2. CRON JOB: Corre todos los días a las 00:05 AM UTC
--    (aproximadamente las 6:05 PM Honduras, horario centroamerica)
-- ============================================================

-- Primero eliminar el job si ya existe para evitar duplicados
SELECT cron.unschedule('expire-overdue-subscriptions')
  WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-subscriptions'
  );

SELECT cron.schedule(
  'expire-overdue-subscriptions',    -- nombre del job
  '5 0 * * *',                       -- todos los días a las 00:05 UTC
  $$
    SELECT public.expire_overdue_subscriptions();
  $$
);

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Para verificar que el job está registrado:
--   SELECT * FROM cron.job WHERE jobname = 'expire-overdue-subscriptions';
--
-- Para correr manualmente (útil para testing):
--   SELECT public.expire_overdue_subscriptions();
--
-- Para ver historial de ejecuciones:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'expire-overdue-subscriptions')
--   ORDER BY start_time DESC LIMIT 10;
-- ============================================================
