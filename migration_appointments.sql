-- ==============================================================================
-- MIGRACIÓN: Actualización de la tabla 'appointments' para el nuevo flujo
-- ==============================================================================

-- 1. Modificar la columna 'status' en 'appointments'
-- Los estados anteriores eran 'Programada', 'Completada', 'Retrasada', 'Eliminada'.
-- Cambiamos a los nuevos estados unificados y usamos 'pending' como default.
ALTER TABLE appointments 
  ALTER COLUMN status SET DEFAULT 'pending';

-- 2. Agregar columna 'rejection_reason' para guardar el motivo cuando se rechaza
ALTER TABLE appointments 
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- OPCIONAL: Si deseas eliminar la antigua tabla 'appointment_requests' porque
-- ahora todo el flujo se manejará desde 'appointments':
-- DROP TABLE IF EXISTS appointment_requests CASCADE;

-- OPCIONAL: Migrar datos existentes (si los hay) al nuevo formato en inglés:
-- UPDATE appointments SET status = 'confirmed' WHERE status = 'Programada';
-- UPDATE appointments SET status = 'completed' WHERE status = 'Completada';
-- UPDATE appointments SET status = 'cancelled' WHERE status = 'Eliminada';
-- UPDATE appointments SET status = 'delayed' WHERE status = 'Retrasada';
