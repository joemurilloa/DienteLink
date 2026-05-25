import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// ---------- Types ----------

export interface SubscriptionStatus {
  status: 'active' | 'inactive' | 'pending' | 'trial';
  plan: string;
  amount: number;
  currency: string;
  current_period_end: string | null;
  last_payment_at: string | null;
  is_active: boolean;
  expires_soon: boolean;
}

export interface CheckoutResult {
  paymentUrl: string;
  token: string;
}

// ---------- Helpers ----------

function edgeFunctionUrl(name: string): string {
  if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL env for Pagadito edge functions');
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

async function callEdgeFunction<T>(name: string, body: object): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (SUPABASE_ANON_KEY) headers['apikey'] = SUPABASE_ANON_KEY;

  const res = await fetch(edgeFunctionUrl(name), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Edge function ${name} failed with status ${res.status}`);
  }
  return data as T;
}

// ---------- Public API ----------

/**
 * Start a Pagadito checkout session.
 * Returns the Pagadito-hosted payment URL to redirect the user to.
 */
export async function initCheckout(clinicId: string, appUrl?: string): Promise<CheckoutResult> {
  return callEdgeFunction<CheckoutResult>('pagadito-checkout', {
    clinicId,
    amount: 15.00,
    description: 'Suscripción mensual DienteLink',
    appUrl: appUrl ?? window.location.origin,
  });
}

/**
 * Verify a Pagadito payment after the user returns from the payment page.
 * Pass the token from the URL query param.
 */
export async function verifyPayment(token: string, clinicId: string): Promise<{
  success: boolean;
  status: string;
  periodEnd?: string;
  message: string;
}> {
  return callEdgeFunction('pagadito-confirm', { token, clinicId });
}

/**
 * Fetch the current subscription status for the logged-in clinic.
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus | null> {
  const { data, error } = await supabase
    .from('subscription_status')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
  return data as SubscriptionStatus | null;
}

/**
 * Verify a pending payment by pulling the token from the database.
 */
export async function verifyPendingPayment(clinicId: string): Promise<{
  success: boolean;
  status: string;
  message: string;
}> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('pagadito_token')
    .eq('clinic_id', clinicId)
    .single();
    
  if (error || !data?.pagadito_token) {
    throw new Error("No hay un pago pendiente registrado para verificar.");
  }

  return verifyPayment(data.pagadito_token, clinicId);
}
