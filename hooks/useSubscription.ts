import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { computeTrialDaysLeft, trialEndFromStart } from '../lib/billing';

export interface SubscriptionState {
  status: 'trial' | 'active' | 'expired' | 'inactive' | 'pending' | null;
  isActive: boolean;      // trial o active y no venció
  isTrial: boolean;
  isExpired: boolean;
  daysLeft: number;       // días restantes (0 si venció)
  expiresSoon: boolean;   // vence en 4 días o menos
  expiresAt: Date | null;
  trialStartedAt: Date | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // refresca cada 5 min en background

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function fetchSubscriptionRow(clinicId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('clinic_id', clinicId)
    .maybeSingle();
  if (error) {
    console.error('[useSubscription] Error fetching subscriptions row:', error);
    return null;
  }
  return data;
}

export function useSubscription(clinicId: string | null, accountCreatedAt?: string | null): SubscriptionState {
  const [state, setState] = useState<Omit<SubscriptionState, 'refresh'>>({
    status: null,
    isActive: false,
    isTrial: false,
    isExpired: false,
    daysLeft: 0,
    expiresSoon: false,
    expiresAt: null,
    trialStartedAt: null,
    loading: true,
    error: null,
  });

  const fetchSubscription = useCallback(async () => {
    if (!clinicId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    // Guest/demo mode: return a fully active subscription (no Supabase call)
    if (clinicId === 'demo') {
      setState({
        status: 'active',
        isActive: true,
        isTrial: false,
        isExpired: false,
        daysLeft: 999,
        expiresSoon: false,
        expiresAt: null,
        trialStartedAt: null,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_status')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[useSubscription] Error fetching subscription:', error);
      }

      const row = (!error && data) ? data : await fetchSubscriptionRow(clinicId);
      const accountStart = accountCreatedAt ? new Date(accountCreatedAt) : null;

      if (!row) {
        // Sin fila: la prueba corre desde que se creó la cuenta, no un 14 eterno.
        const daysLeft = computeTrialDaysLeft({
          isTrial: true,
          accountCreatedAt: accountStart,
        });
        setState({
          status: 'trial',
          isActive: daysLeft > 0,
          isTrial: true,
          isExpired: daysLeft <= 0,
          daysLeft,
          expiresSoon: daysLeft > 0 && daysLeft <= 4,
          expiresAt: accountStart ? trialEndFromStart(accountStart) : null,
          trialStartedAt: accountStart,
          loading: false,
          error: null,
        });
        return;
      }

      const trialStartedAt = parseDate(row.trial_started_at);
      const periodStart = parseDate(row.current_period_start);
      const expiresAt = parseDate(row.current_period_end);
      const isTrial = row.is_trial ?? row.status === 'trial';
      const daysLeft = computeTrialDaysLeft({
        isTrial,
        expiresAt,
        trialStartedAt,
        periodStart,
        accountCreatedAt: accountStart,
      });
      const isExpired = row.is_expired ?? daysLeft <= 0;
      const isActive = row.is_active ?? ((row.status === 'active' || row.status === 'trial') && daysLeft > 0);

      setState({
        status: row.status as SubscriptionState['status'],
        isActive,
        isTrial,
        isExpired,
        daysLeft,
        expiresSoon: daysLeft > 0 && daysLeft <= 4,
        expiresAt,
        trialStartedAt,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('[useSubscription] Unexpected error:', err);
      // En caso de error inesperado, no bloquear al usuario
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Error al verificar suscripción',
        isActive: true,
        isExpired: false,
      }));
    }
  }, [clinicId, accountCreatedAt]);

  useEffect(() => {
    fetchSubscription();

    const interval = setInterval(fetchSubscription, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchSubscription();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchSubscription]);

  return { ...state, refresh: fetchSubscription };
}
