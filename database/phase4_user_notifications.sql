-- ============================================================
-- DienteLink — Fase 4: avisos de la app por usuario
-- Pegar en el SQL Editor de Supabase y ejecutar (Run).
-- Cada persona ve los suyos en cualquier computadora.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  is_read     boolean NOT NULL DEFAULT false,
  action_path text,
  dedupe_key  text
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_dedupe
  ON public.user_notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.user_notifications;
CREATE POLICY "Users read own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own notifications" ON public.user_notifications;
CREATE POLICY "Users insert own notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notifications" ON public.user_notifications;
CREATE POLICY "Users update own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own notifications" ON public.user_notifications;
CREATE POLICY "Users delete own notifications"
  ON public.user_notifications
  FOR DELETE
  USING (user_id = auth.uid());

DO $$
BEGIN
  IF to_regprocedure('public.current_clinic_has_paid_access()') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Avisos requieren plan vigente" ON public.user_notifications;
    CREATE POLICY "Avisos requieren plan vigente"
      ON public.user_notifications
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (public.current_clinic_has_paid_access())
      WITH CHECK (public.current_clinic_has_paid_access());
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notifications TO authenticated;
