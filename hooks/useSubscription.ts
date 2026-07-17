import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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

export function useSubscription(clinicId: string | null): SubscriptionState {
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

    try {
      const { data, error } = await supabase
        .from('subscription_status')
        .select('*')
        .maybeSingle();

      if (error) {
        console.error('[useSubscription] Error fetching subscription:', error);
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message,
          // Si hay error de consulta, no bloquear el acceso
          isActive: true,
          isExpired: false,
        }));
        return;
      }

      if (!data) {
        // No existe suscripción — usuario muy nuevo, el trigger debería haberla creado
        // Dar acceso por defecto para no bloquear al usuario
        setState({
          status: 'trial',
          isActive: true,
          isTrial: true,
          isExpired: false,
          daysLeft: 14,
          expiresSoon: false,
          expiresAt: null,
          trialStartedAt: null,
          loading: false,
          error: null,
        });
        return;
      }

      setState({
        status: data.status as SubscriptionState['status'],
        isActive: data.is_active ?? false,
        isTrial: data.is_trial ?? false,
        isExpired: data.is_expired ?? false,
        daysLeft: data.days_left ?? 0,
        expiresSoon: data.expires_soon ?? false,
        expiresAt: data.current_period_end ? new Date(data.current_period_end) : null,
        trialStartedAt: data.trial_started_at ? new Date(data.trial_started_at) : null,
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
  }, [clinicId]);

  useEffect(() => {
    fetchSubscription();

    // Refrescar en background cada 5 minutos
    const interval = setInterval(fetchSubscription, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchSubscription]);

  return { ...state, refresh: fetchSubscription };
}
