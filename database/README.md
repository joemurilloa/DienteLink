# Scripts históricos (`database/`)

**No ejecutes estos archivos en producción.**

La fuente de verdad es `supabase/migrations/`. Todo lo de esta carpeta es historial previo al baseline y puede **revertir** endurecimientos de seguridad (RLS abierta, `activate_subscription` sin admin, keys en claro, etc.).

Si necesitas un cambio de esquema: crea una migración nueva en `supabase/migrations/` y aplícala con `npx supabase db push`.
