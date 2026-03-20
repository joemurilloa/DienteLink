-- =========================================================================
-- FIX: Políticas RLS para Doctores
-- =========================================================================
-- Al corregir la seguridad del endpoint público, probablemente bloqueamos
-- las acciones (UPDATE/DELETE) para el propio doctor.
-- Corre esto en el SQL Editor para garantizar que tienes acceso total a tus propios datos.
-- =========================================================================

-- Asegurar que los doctores tienen control TOTAL sobre sus appointment_requests
CREATE POLICY "Doctors can manage their own requests"
  ON appointment_requests
  FOR ALL
  USING (doctor_id = auth.uid());

-- Asegurar que los doctores tienen control TOTAL sobre sus appointments (citas reales)
CREATE POLICY "Doctors can manage their own appointments"
  ON appointments
  FOR ALL
  USING (doctor_id = auth.uid());

-- Forzar recarga
NOTIFY pgrst, 'reload schema';
