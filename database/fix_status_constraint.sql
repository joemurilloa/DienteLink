-- =============================================
-- FIX: Eliminar el check constraint que bloquea 
-- los status en español (Programada, Eliminada, etc.)
-- =============================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Pega este código completo
-- 3. Haz clic en "Run"
-- =============================================

-- Paso 1: Eliminar el constraint que está causando el error
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Paso 2: Recrear el constraint permitiendo AMBOS formatos (español e inglés)
-- para compatibilidad futura
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
  CHECK (status IN (
    'Programada', 'Completada', 'Retrasada', 'Eliminada',
    'pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'delayed'
  ));

-- Verificar que funcionó
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'appointments'::regclass 
  AND contype = 'c';
