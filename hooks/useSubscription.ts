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
  isProvisional: boolean;
  provisionalUntil: Date | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
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

async function fetchProvisionalAccess(clinicId: string): Promise<Date | null> {
  const { data, error } = await supabase
    .from('payment_receipts')
    .select('provisional_access_until')
    .eq('clinic_id', clinicId)
    .eq('status', 'pending')
    .not('provisional_access_until', 'is', null)
    .order('provisional_access_until', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[useSubscription] Error fetching provisional access:', error);
    return null;
  }
  return parseDate(data?.provisional_access_until);
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
    isProvisional: false,
    provisionalUntil: null,
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
        isProvisional: false,
        provisionalUntil: null,
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
      // Consulta independiente como respaldo: evita depender de que la caché
      // de esquema de PostgREST ya exponga las columnas nuevas de la vista.
      const receiptProvisionalUntil = await fetchProvisionalAccess(clinicId);
      const accountStart = accountCreatedAt ? new Date(accountCreatedAt) : null;

      if (!row) {
        // Sin fila: la prueba corre desde que se creó la cuenta, no un 14 eterno.
        const trialDaysLeft = computeTrialDaysLeft({
          isTrial: true,
          accountCreatedAt: accountStart,
        });
        const isProvisional = !!receiptProvisionalUntil && receiptProvisionalUntil.getTime() > Date.now();
        const provisionalDaysLeft = isProvisional
          ? Math.ceil((receiptProvisionalUntil.getTime() - Date.now()) / 86_400_000)
          : 0;
        const daysLeft = Math.max(trialDaysLeft, provisionalDaysLeft);
        setState({
          status: 'trial',
          isActive: daysLeft > 0,
          isTrial: trialDaysLeft > 0,
          isExpired: daysLeft <= 0,
          daysLeft,
          expiresSoon: daysLeft > 0 && daysLeft <= 4,
          expiresAt: isProvisional ? receiptProvisionalUntil : (accountStart ? trialEndFromStart(accountStart) : null),
          trialStartedAt: accountStart,
          isProvisional,
          provisionalUntil: receiptProvisionalUntil,
          loading: false,
          error: null,
        });
        return;
      }

      const trialStartedAt = parseDate(row.trial_started_at);
      const periodStart = parseDate(row.current_period_start);
      const expiresAt = parseDate(row.current_period_end);
      const provisionalUntil = receiptProvisionalUntil ?? parseDate(row.provisional_access_until);
      const isTrial = row.is_trial ?? row.status === 'trial';
      const isProvisional = (
        !!provisionalUntil
        && provisionalUntil.getTime() > Date.now()
        && (!expiresAt || provisionalUntil.getTime() > expiresAt.getTime())
      );
      const daysLeft = computeTrialDaysLeft({
        isTrial,
        expiresAt,
        trialStartedAt,
        periodStart,
        accountCreatedAt: accountStart,
      });
      const isExpired = isProvisional ? false : (row.is_expired ?? daysLeft <= 0);
      const isActive = isProvisional || (row.is_active ?? ((row.status === 'active' || row.status === 'trial') && daysLeft > 0));
      const effectiveDaysLeft = isProvisional && provisionalUntil
        ? Math.max(daysLeft, Math.ceil((provisionalUntil.getTime() - Date.now()) / 86_400_000))
        : daysLeft;

      setState({
        status: row.status as SubscriptionState['status'],
        isActive,
        isTrial,
        isExpired,
        daysLeft: effectiveDaysLeft,
        expiresSoon: effectiveDaysLeft > 0 && effectiveDaysLeft <= 4,
        expiresAt,
        trialStartedAt,
        isProvisional,
        provisionalUntil,
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
    const onSubscriptionChanged = () => {
      fetchSubscription();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('dientelink:subscription-changed', onSubscriptionChanged);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('dientelink:subscription-changed', onSubscriptionChanged);
    };
  }, [fetchSubscription]);

  return { ...state, refresh: fetchSubscription };
}
