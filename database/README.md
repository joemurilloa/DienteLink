# database/

Aqui viven todos los scripts SQL del proyecto **DienteLink**.

> Estos scripts se ejecutan manualmente en el SQL Editor de Supabase (app.supabase.com).
> No son migraciones automaticas -- deben aplicarse en el orden indicado.

## Orden recomendado (primera vez)

1. `supabase_schema.sql` -- Tablas base
2. `supabase_rls.sql` -- Row Level Security basico
3. `supabase_roles_migration.sql` -- Sistema de roles
4. `supabase_strict_rls.sql` -- RLS reforzado
5. `supabase_security_fixes.sql` -- Parches de seguridad
6. `supabase_subscriptions.sql` / `supabase_subscriptions_v2.sql` -- Suscripciones
7. `supabase_subscription_cron.sql` -- Cron de expiracion
8. `supabase_team_invitations.sql` -- Invitaciones de equipo
9. `supabase_public_booking_rpc.sql` -- RPC booking publico
10. `supabase_anti_spam.sql` -- Anti-spam
11. `supabase_storage_receipts.sql` -- Politicas de Storage
12. `create_trial_trigger.sql` -- Trigger trial gratuito
13. `migration_appointments.sql` -- Campos extra en citas
14. `setup_whatsapp_cron.sql` / `setup_email_reminders_cron.sql` -- Recordatorios

## Fixes puntuales (ya aplicados)
- `fix_cron_job.sql`  
- `fix_status_constraint.sql`  
- `setup_lab_works.sql`
