import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PLAN_DAYS, type PlanDays } from '../lib/billing';

export interface AdminReceipt {
  id: string;
  image_url: string | null;
  created_at: string;
  notes: string | null;
  status: string;
  amount_paid: number | null;
  email_referencia: string | null;
  reviewed_note: string | null;
  provisional_access_until: string | null;
}

export interface AdminClinic {
  clinic_id: string;
  full_name: string;
  clinic_name: string;
  email: string | null;
  status: string;
  is_trial: boolean;
  period_end: string | null;
  days_left: number;
  pending_receipts: number;
  last_payment_at: string | null;
  receipts: AdminReceipt[];
}

const POLL_MS = 20_000;
const TICK_MS = 15_000;

export function useAdminBilling(enabled: boolean) {
  const [clinics, setClinics] = useState<AdminClinic[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const { data, error: rpcError } = await supabase.rpc('admin_list_clinics');
    if (rpcError) {
      const missing = rpcError.message?.includes('Could not find') || rpcError.code === 'PGRST202';
      setError(missing
        ? 'Falta aplicar las migraciones de Supabase (npx supabase db push).'
        : rpcError.message);
      setClinics([]);
      setLoading(false);
      return;
    }
    setError(null);
    const rows = ((data as AdminClinic[]) ?? []).map((row) => ({
      ...row,
      receipts: Array.isArray(row.receipts) ? row.receipts : [],
    }));
    setClinics(rows);
    setNow(Date.now());
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const poll = window.setInterval(refresh, POLL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refresh]);

  const extend = useCallback(async (clinicId: string, days: PlanDays) => {
    if (!enabled) throw new Error('No autorizado');
    setExtendingId(clinicId);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_extend_subscription', {
        p_clinic_id: clinicId,
        p_days: days,
      });
      if (rpcError) throw rpcError;
      const result = data as { days_left: number; period_end: string; days_added: number };
      supabase.functions
        .invoke('notify-doctor-plan', {
          body: { clinicId, daysAdded: result.days_added, periodEnd: result.period_end },
        })
        .catch((e) => console.warn('[notify-doctor-plan]', e));
      await refresh();
      return result;
    } finally {
      setExtendingId(null);
    }
  }, [enabled, refresh]);

  const rejectPending = useCallback(async (clinicId: string, note?: string) => {
    if (!enabled) throw new Error('No autorizado');
    setExtendingId(clinicId);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_reject_pending_receipts', {
        p_clinic_id: clinicId,
        p_note: note ?? null,
      });
      if (rpcError) {
        const missing = rpcError.message?.includes('Could not find') || rpcError.code === 'PGRST202';
        throw new Error(missing
          ? 'Falta ejecutar database/admin_reject_pending_receipt.sql en Supabase.'
          : rpcError.message);
      }
      await refresh();
      return data as { rejected_count: number };
    } finally {
      setExtendingId(null);
    }
  }, [enabled, refresh]);

  return { clinics, loading, error, refresh, extend, rejectPending, extendingId, allowedDays: PLAN_DAYS, now };
}
