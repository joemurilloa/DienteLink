import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { computeTrialDaysLeft, daysRemaining, trialEndFromStart } from '../lib/billing';

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
  lastReceiptStatus: 'pending' | 'approved' | 'rejected' | null;
  lastReceiptNote: string | null;
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

async function fetchLatestReceipt(clinicId: string) {
  const { data, error } = await supabase
    .from('payment_receipts')
    .select('status, reviewed_note, provisional_access_until')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[useSubscription] Error fetching latest receipt:', error);
    return null;
  }
  return data as {
    status: 'pending' | 'approved' | 'rejected';
    reviewed_note: string | null;
    provisional_access_until: string | null;
  } | null;
}

function isMissingRpc(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === 'PGRST202' || /could not find the function|schema cache/i.test(error.message || '');
}

export function useSubscription(clinicId: string | null, accountCreatedAt?: string | null, accountUserId?: string | null): SubscriptionState {
  const confirmed = useRef(false);
  const seenClinic = useRef<string | null>(null);
  if (seenClinic.current !== clinicId) {
    seenClinic.current = clinicId;
    confirmed.current = false;
  }
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
    lastReceiptStatus: null,
    lastReceiptNote: null,
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
        lastReceiptStatus: null,
        lastReceiptNote: null,
        loading: false,
        error: null,
      });
      return;
    }

    const deny = (message: string) => {
      setState(prev => {
        if (confirmed.current) return { ...prev, loading: false };
        return {
          ...prev,
          status: 'inactive',
          isActive: false,
          isTrial: false,
          isExpired: true,
          daysLeft: 0,
          expiresSoon: false,
          loading: false,
          error: message,
        };
      });
    };

    try {
      const view = await supabase
        .from('subscription_status')
        .select('*')
        .maybeSingle();

      if (view.error) {
        console.error('[useSubscription] Error fetching subscription:', view.error);
      }

      let row = !view.error && view.data ? view.data : null;
      let tableError = false;
      if (!row) {
        const table = await supabase
          .from('subscriptions')
          .select('*')
          .eq('clinic_id', clinicId)
          .maybeSingle();
        if (table.error) {
          tableError = true;
          console.error('[useSubscription] Error fetching subscriptions row:', table.error);
        } else {
          row = table.data;
        }
      }

      if (!row && view.error && tableError) {
        deny('No se pudo verificar la suscripción. Reintenta en un momento.');
        return;
      }

      if (!row) {
        const access = await supabase.rpc('clinic_access_until', { p_clinic_id: clinicId });
        const isOwner = !!accountUserId && clinicId === accountUserId;
        if (access.error && !(isMissingRpc(access.error) && isOwner)) {
          deny('No se pudo verificar la suscripción de este consultorio.');
          return;
        }
        if (!access.error) {
          const until = parseDate(access.data as string | null);
          const daysLeft = daysRemaining(until);
          confirmed.current = true;
          setState({
            status: daysLeft > 0 ? 'trial' : 'inactive',
            isActive: daysLeft > 0,
            isTrial: daysLeft > 0,
            isExpired: daysLeft <= 0,
            daysLeft,
            expiresSoon: daysLeft > 0 && daysLeft <= 4,
            expiresAt: until,
            trialStartedAt: null,
            isProvisional: false,
            provisionalUntil: null,
            lastReceiptStatus: null,
            lastReceiptNote: null,
            loading: false,
            error: null,
          });
          return;
        }
      }
      // Consulta independiente como respaldo: evita depender de que la caché
      // de esquema de PostgREST ya exponga las columnas nuevas de la vista.
      const latestReceipt = await fetchLatestReceipt(clinicId);
      const receiptProvisionalUntil = latestReceipt?.status === 'pending'
        ? parseDate(latestReceipt.provisional_access_until)
        : null;
      const lastReceiptStatus = latestReceipt?.status ?? null;
      const lastReceiptNote = latestReceipt?.reviewed_note ?? null;
      const accountStart = accountCreatedAt ? new Date(accountCreatedAt) : null;

      if (!row) {
        // Solo el dueño, y solo si todavía no está la función en Supabase.
        // Cuenta los 14 días desde la creación de SU cuenta.
        if (!accountUserId || clinicId !== accountUserId) {
          deny('No se pudo verificar la suscripción de este consultorio.');
          return;
        }
        const trialDaysLeft = computeTrialDaysLeft({
          isTrial: true,
          accountCreatedAt: accountStart,
        });
        const isProvisional = !!receiptProvisionalUntil && receiptProvisionalUntil.getTime() > Date.now();
        const provisionalDaysLeft = isProvisional
          ? Math.ceil((receiptProvisionalUntil.getTime() - Date.now()) / 86_400_000)
          : 0;
        const daysLeft = Math.max(trialDaysLeft, provisionalDaysLeft);
        confirmed.current = true;
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
          lastReceiptStatus,
          lastReceiptNote,
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

      confirmed.current = true;
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
        lastReceiptStatus,
        lastReceiptNote,
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('[useSubscription] Unexpected error:', err);
      deny('No se pudo verificar la suscripción. Reintenta en un momento.');
    }
  }, [clinicId, accountCreatedAt, accountUserId]);

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
