-- Sprint 1: se eliminó la API de WhatsApp. Ejecutar una vez en Supabase SQL Editor.
SELECT cron.unschedule('trigger-whatsapp-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'trigger-whatsapp-reminders');

-- Y desde la terminal, borrar las funciones desplegadas:
--   supabase functions delete whatsapp-reminder
--   supabase functions delete whatsapp-confirmation
--   supabase functions delete whatsapp-webhook
