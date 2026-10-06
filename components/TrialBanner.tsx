import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionState } from '../hooks/useSubscription';
import { useAuth } from '../services/authService';
import { subscriptionBannerCopy } from '../lib/billing';

interface Props {
  subscription: SubscriptionState;
}

type DismissState = 'until_last_day' | 'done' | null;

export const TrialBanner: React.FC<Props> = ({ subscription }) => {
  const navigate = useNavigate();
  const { clinicId, user, isGuest } = useAuth();

  const storageKey = `dientelink_trial_hidden_${user?.id || clinicId || 'default'}`;

  const [dismissed, setDismissed] = useState<DismissState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === 'until_last_day' || saved === 'done' ? saved : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setDismissed(saved === 'until_last_day' || saved === 'done' ? saved : null);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const { daysLeft, isTrial, isActive } = subscription;

  useEffect(() => {
    if (daysLeft > 1 && dismissed === 'done') {
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      setDismissed(null);
    }
  }, [daysLeft, dismissed, storageKey]);

  if (isGuest || !isActive || daysLeft <= 0) return null;

  const isLastDay = daysLeft <= 1;
  if (dismissed === 'done') return null;
  if (dismissed === 'until_last_day' && !isLastDay) return null;

  const copy = subscriptionBannerCopy(daysLeft, isTrial);

  const handleDismiss = () => {
    const next: DismissState = isLastDay ? 'done' : 'until_last_day';
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // ignore
    }
    setDismissed(next);
  };

  return (
    <div className={`trial-banner ${copy.urgent ? 'trial-banner--urgent' : 'trial-banner--normal'}`}>
      <span className="trial-banner__dot" />
      <span className="trial-banner__msg">
        {copy.message}
      </span>
      <button
        className="trial-banner__action"
        onClick={() => navigate('/subscription')}
      >
        {copy.action} →
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
