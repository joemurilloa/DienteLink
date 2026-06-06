import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../services/authService';

// ─── Plan Limits ──────────────────────────────────────────────────────────────

export const FREE_PATIENT_LIMIT = 10;
export const TRIAL_DAILY_EMAIL_LIMIT = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionPlan = 'active' | 'inactive' | 'pending' | 'trial';

export interface SubscriptionData {
  status: SubscriptionPlan;
  plan: string;
  amount: number;
  currency: string;
  current_period_end: string | null;
  last_payment_at: string | null;
  is_active: boolean;
  expires_soon: boolean;
}

export type ProFeature =
  | 'unlimited_patients'
  | 'auto_email_reminders'
  | 'auto_whatsapp_reminders'
  | 'csv_export'
  | 'pdf_export'
  | 'public_booking';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSubscription() {
  const { user, clinicId } = useAuth();

  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscription', clinicId],
    queryFn: async (): Promise<SubscriptionData | null> => {
      if (!clinicId) return null;

      const { data, error } = await supabase
        .from('subscription_status')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data as SubscriptionData | null;
    },
    enabled: !!clinicId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // ─── Derived State ────────────────────────────────────────────────────────

  const status: SubscriptionPlan = sub?.status ?? 'inactive';

  // Active means: paying customer with valid period
  const isPro = status === 'active' && (sub?.is_active ?? false);

  // Trial means: trial status with valid period (not expired)
  const isTrial = status === 'trial' && (sub?.is_active ?? false);

  // Has any valid access (pro OR active trial)
  const hasAccess = isPro || isTrial;

  // Is expired (was trial or active but period ended, or just inactive)
  const isExpired = !hasAccess && status !== 'pending';

  // Days remaining in current period
  const daysLeft = (() => {
    if (!sub?.current_period_end) return 0;
    const diff = new Date(sub.current_period_end).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  // Expires soon (within 3 days for trial, 7 days for pro)
  const expiresSoon = hasAccess && daysLeft <= (isTrial ? 3 : 7);

  // ─── Feature Gating ──────────────────────────────────────────────────────

  const canUseFeature = (feature: ProFeature): boolean => {
    switch (feature) {
      case 'auto_whatsapp_reminders':
        // WhatsApp auto costs money → ONLY for Pro (paying customers)
        return isPro;

      case 'unlimited_patients':
      case 'auto_email_reminders':
      case 'csv_export':
      case 'pdf_export':
      case 'public_booking':
        // These work during trial + pro
        return hasAccess;

      default:
        return hasAccess;
    }
  };

  return {
    // Raw data
    subscription: sub,
    loading: isLoading,

    // Computed states
    status,
    isPro,
    isTrial,
    hasAccess,
    isExpired,
    daysLeft,
    expiresSoon,

    // Feature check
    canUseFeature,
  };
}
