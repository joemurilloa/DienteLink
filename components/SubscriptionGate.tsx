import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../services/authService';
import type { SubscriptionState } from '../hooks/useSubscription';
interface Props {
  subscription: SubscriptionState;
  children: React.ReactNode;
}

/**
 * El trabajo del día pide plan vigente, con 7 días de gracia que vienen de la base.
 * Un fallo de red no se trata como plan vencido.
 * Ajustes sigue abierto para bajar la copia aunque el plan ya haya vencido.
 * Demo y el admin de la plataforma siguen entrando.
 */
export const SubscriptionGate: React.FC<Props> = ({ subscription, children }) => {
  const { profile, isGuest, isPlatformAdmin } = useAuth();
  const location = useLocation();

  if (isPlatformAdmin) return <>{children}</>;
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

  if (subscription.error && !subscription.isActive && !subscription.isExpired) {
    return (
      <div className="flex items-center justify-center w-full h-full px-6">
        <div className="text-center max-w-sm">
          <p className="text-sm font-semibold text-slate-800 mb-2">No se pudo comprobar el plan</p>
          <p className="text-sm text-slate-500 mb-4">{subscription.error}</p>
          <button
            type="button"
            onClick={() => { void subscription.refresh(); }}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (subscription.isActive) return <>{children}</>;
  if (location.pathname === '/subscription' || location.pathname === '/settings') return <>{children}</>;
  return <Navigate to="/subscription" replace />;
};

export default SubscriptionGate;
