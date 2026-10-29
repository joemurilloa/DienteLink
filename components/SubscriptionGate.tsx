import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/authService';
import type { SubscriptionState } from '../hooks/useSubscription';
import { isPlatformAdmin } from '../lib/billing';

interface Props {
  subscription: SubscriptionState;
  children: React.ReactNode;
}

/**
 * El expediente se abre solo con plan vigente.
 * Un error de consulta cierra. El equipo usa el plan de su clínica.
 * Demo y el admin de la plataforma siguen entrando.
 */
export const SubscriptionGate: React.FC<Props> = ({ subscription, children }) => {
  const { profile, isGuest, user } = useAuth();
  const location = useLocation();

  if (isPlatformAdmin(user?.email)) return <>{children}</>;
  if (isGuest) return <>{children}</>;

  if (!profile || subscription.loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-slate-400 font-medium">Comprobando tu plan...</p>
        </div>
      </div>
    );
  }

  if (subscription.isActive) return <>{children}</>;
  if (location.pathname === '/subscription') return <>{children}</>;
  return <Navigate to="/subscription" replace />;
};

export default SubscriptionGate;
