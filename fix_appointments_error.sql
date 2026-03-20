-- =========================================================================
-- FIX: Faltaba la columna deleted_at en appointments
-- =========================================================================
-- Corre esto en el SQL Editor de Supabase para arreglar el error 400
-- =========================================================================

-- 1. Agregar la columna que falta
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Limpiar el caché de Supabase para que reconozca la nueva columna inmediatamente
NOTIFY pgrst, 'reload schema';
