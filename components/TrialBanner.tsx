import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionState } from '../hooks/useSubscription';
import { useAuth } from '../services/authService';

interface Props {
  subscription: SubscriptionState;
}

export const TrialBanner: React.FC<Props> = ({ subscription }) => {
  const navigate = useNavigate();
  const { clinicId, user } = useAuth();

  const storageKey = `dientelink_trial_dismissed_${clinicId || user?.id || 'default'}`;

  const [dismissedMilestone, setDismissedMilestone] = useState<string | null>(() => {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setDismissedMilestone(saved);
    } catch {
      // ignore
    }
  }, [storageKey]);

  if (!subscription.isTrial || !subscription.isActive) return null;

  const { daysLeft } = subscription;

  // Hitos de aparición:
  // 1. Inicial (al crear cuenta / > 7 días restantes)
  // 2. A los 7 días restantes (entre 2 y 7 días)
  // 3. Al último día (1 día o menos restante)
  const currentMilestone = daysLeft > 7 ? '14' : daysLeft > 1 ? '7' : '1';

  // Si el usuario ya cerró este hito con la 'X', se oculta hasta el siguiente hito
  if (dismissedMilestone === currentMilestone) return null;

  const isUrgent = daysLeft <= 1;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, currentMilestone);
    } catch {
      // ignore
    }
    setDismissedMilestone(currentMilestone);
  };

  const getMessage = () => {
    if (daysLeft <= 0) {
      return '⚠️ Tu prueba gratuita vence hoy';
    }
    if (daysLeft === 1) {
      return '⚠️ Tu prueba gratuita vence en 1 día';
    }
    return `Período de prueba · ${daysLeft} días restantes`;
  };

  return (
    <div className={`trial-banner ${isUrgent ? 'trial-banner--urgent' : 'trial-banner--normal'}`}>
      <span className="trial-banner__dot" />
      <span className="trial-banner__msg">
        {getMessage()}
      </span>
      <button
        className="trial-banner__action"
        onClick={() => navigate('/subscription')}
      >
        Activar suscripción →
      </button>
      <button
        className="trial-banner__close"
        onClick={handleDismiss}
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
};

export default TrialBanner;

