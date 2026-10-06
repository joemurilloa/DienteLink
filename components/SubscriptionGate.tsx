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
 * Regla de acceso (una sola):
 * - Cargando, error de consulta, demo o miembro de equipo → NUNCA se bloquea.
 * - Trial/activa → acceso normal.
 * - Vencida → solo se permite /subscription (pantalla única de pago).
 */
export const SubscriptionGate: React.FC<Props> = ({ subscription, children }) => {
  const { profile, isGuest, user } = useAuth();
  const location = useLocation();
  const isTeamMember = !!profile?.clinic_id && profile.clinic_id !== profile?.id;

  if (isPlatformAdmin(user?.email)) return <>{children}</>;
  if (isGuest || isTeamMember || subscription.loading || subscription.error) return <>{children}</>;
  if (subscription.isActive) return <>{children}</>;

  const blocked = subscription.isExpired || subscription.status === 'inactive';
  if (!blocked) return <>{children}</>;

  if (location.pathname === '/subscription') return <>{children}</>;
  return <Navigate to="/subscription" replace />;
};

export default SubscriptionGate;
