-- =============================================================
-- DienteLink: Anti-Spam Trigger para Citas Públicas (SEC-09)
-- Previene ataques DoS o saturación de la base de datos limitando
-- los INSERTS en la tabla `appointment_requests`.
-- =============================================================

CREATE OR REPLACE FUNCTION check_appointment_request_spam()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count INT;
BEGIN
  -- Regla 1: Limitar a 3 solicitudes pendientes por correo electrónico para cada clínica
  -- Esto evita que un mismo usuario/bot envíe docenas de peticiones ignoradas.
  SELECT count(*) INTO pending_count
  FROM appointment_requests
  WHERE doctor_id = NEW.doctor_id
    AND patient_email = NEW.patient_email
    AND status = 'pending';
    
  IF pending_count >= 3 THEN
    RAISE EXCEPTION 'Has alcanzado el límite de solicitudes pendientes para esta clínica. Por favor espera a que te respondan.';
  END IF;

  -- Regla 2: Protección global anti-DDoS por clínica
  -- Una clínica normal no debería tener más de 500 solicitudes pendientes activas al mismo tiempo.
  SELECT count(*) INTO pending_count
  FROM appointment_requests
  WHERE doctor_id = NEW.doctor_id
    AND status = 'pending';
    
  IF pending_count >= 500 THEN
    RAISE EXCEPTION 'Esta clínica está saturada y no puede recibir más solicitudes en este momento.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Asociar el trigger a la tabla `appointment_requests`
DROP TRIGGER IF EXISTS trigger_check_appointment_request_spam ON appointment_requests;
CREATE TRIGGER trigger_check_appointment_request_spam
BEFORE INSERT ON appointment_requests
FOR EACH ROW
EXECUTE FUNCTION check_appointment_request_spam();

-- =============================================================
-- Completado
-- =============================================================
