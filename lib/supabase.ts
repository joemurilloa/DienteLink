import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Advertencia: Faltan variables de entorno de Supabase. Revisa tu archivo .env');
}

/**
 * HashRouter uses "#/path". Supabase's default detectSessionInUrl parses the
 * entire hash as an OAuth callback and can wipe a valid persisted session.
 * Only enable URL detection when this load actually looks like an auth redirect.
 */
export function isAuthCallbackUrl(href?: string): boolean {
  const raw = href ?? (typeof window !== 'undefined' ? window.location.href : '');
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(raw, 'http://localhost');
  } catch {
    return false;
  }
  const search = url.searchParams;
  if (search.has('code') || search.has('error') || search.has('error_description')) return true;
  const hash = url.hash;
  return hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('error_description');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isAuthCallbackUrl(),
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
  },
});
