-- =========================================================================
-- SCRIPT DEFINITIVO DE RESERVAS Y CITAS
-- =========================================================================
-- Esto soluciona los dos problemas exactos:
-- 1. "Las citas aprobadas no aparecen" -> Faltaba la columna deleted_at
-- 2. "Borro las solicitudes y no se borran" -> Bloqueo oculto de permisos RLS
-- =========================================================================

-- PARTE 1: Arreglar el Guardado de Citas (Agrega la columna faltante)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- PARTE 2: Arreglar el Borrado de Solicitudes (Abre los permisos para Ti como Doctor)
-- Primero, asegurarnos de que RLS esté activado
ALTER TABLE appointment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 2a) Permisos totales para el Doctor en sus Solicitudes (Ver, Actualizar, Borrar)
DROP POLICY IF EXISTS "Doctors can manage their own requests" ON appointment_requests;
CREATE POLICY "Doctors can manage their own requests"
  ON appointment_requests FOR ALL
  USING (doctor_id = auth.uid());

-- 2b) Permisos totales para el Doctor en sus Citas Reales
DROP POLICY IF EXISTS "Doctors can manage their own appointments" ON appointments;
CREATE POLICY "Doctors can manage their own appointments"
  ON appointments FOR ALL
  USING (doctor_id = auth.uid());

-- PARTE 3: Refrescar caché del servidor para aplicar INMEDIATAMENTE
NOTIFY pgrst, 'reload schema';
