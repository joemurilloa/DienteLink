import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionState } from '../hooks/useSubscription';

interface Props {
  subscription: SubscriptionState;
}

export const TrialBanner: React.FC<Props> = ({ subscription }) => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  if (!subscription.isTrial || !subscription.isActive) return null;
  if (dismissed) return null;

  const { daysLeft } = subscription;
  const isUrgent = daysLeft <= 4;

  return (
    <div className={`trial-banner ${isUrgent ? 'trial-banner--urgent' : 'trial-banner--normal'}`}>
      <span className="trial-banner__dot" />
      <span className="trial-banner__msg">
        {isUrgent
          ? `⚠️ Tu prueba gratuita vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
          : `Período de prueba · ${daysLeft} días restantes`}
      </span>
      <button
        className="trial-banner__action"
        onClick={() => navigate('/subscription')}
      >
        Activar suscripción →
      </button>
      {!isUrgent && (
        <button
          className="trial-banner__close"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default TrialBanner;
