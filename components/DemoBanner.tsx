import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authService';

/** Franja fija: deja claro que la clínica en pantalla es de prueba. */
export const DemoBanner: React.FC = () => {
  const { isGuest, user, exitGuestMode } = useAuth();
  const navigate = useNavigate();

  if (!isGuest) return null;

  const leaveDemo = () => {
    exitGuestMode();
    navigate(user ? '/' : '/welcome', { replace: true });
  };

  return (
    <div
      className="demo-banner"
      role="status"
    >
      <span className="demo-banner__msg">Estás viendo datos de prueba</span>
      <button type="button" className="demo-banner__action" onClick={leaveDemo}>
        Salir del demo
      </button>
    </div>
  );
};

export default DemoBanner;
