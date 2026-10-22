import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { isAuthCallbackUrl, supabase } from '../lib/supabase';
import { setCurrencyConfig } from '../lib/utils';
import { queryClient } from '../lib/queryClient';
import { bookingService } from './bookingService';
import { redeemPendingInvitation } from './redeemInvitation';
import type { User, Session } from '@supabase/supabase-js';
import { DEMO_PROFILE } from '../lib/demoData';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DoctorProfile | null;
  clinicId: string | null;
  loading: boolean;
  isGuest: boolean;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<DoctorProfile>) => Promise<void>;
  signInWithGoogle: (options?: { chooseAccount?: boolean }) => Promise<void>;
}

export interface DoctorProfile {
  id: string;
  full_name: string;
  role: string;
  clinic_id?: string;
  clinic_name: string;
  phone: string | null;
  currency: string;
  locale: string;
  theme_color?: string;
  has_completed_onboarding?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Una sola escucha de la sesión. Si se abre dos veces al cargar la página,
// Supabase invalida el acceso guardado y el doctor tiene que entrar de nuevo
// al reabrir el navegador.
type AuthHandler = (event: string, nextSession: Session | null) => void;
const authHandlers = new Set<AuthHandler>();
let authBridgeStarted = false;
let lastAuthEvent: { event: string; session: Session | null } | null = null;

function subscribeAuth(handler: AuthHandler) {
  authHandlers.add(handler);
  if (!authBridgeStarted) {
    authBridgeStarted = true;
    supabase.auth.onAuthStateChange((event, nextSession) => {
      lastAuthEvent = { event, session: nextSession };
      authHandlers.forEach((listener) => listener(event, nextSession));
    });
  } else if (lastAuthEvent) {
    handler(lastAuthEvent.event, lastAuthEvent.session);
  }
  return () => {
    authHandlers.delete(handler);
  };
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const isGuestRef = useRef(false);
  const savedProfileRef = useRef<DoctorProfile | null>(null);

  const enterGuestMode = () => {
    isGuestRef.current = true;
    setIsGuest(true);
    setProfile(prev => {
      if (prev && prev.id !== 'demo') savedProfileRef.current = prev;
      return DEMO_PROFILE;
    });
    setCurrencyConfig(DEMO_PROFILE.currency, DEMO_PROFILE.locale);
    document.documentElement.setAttribute('data-theme', DEMO_PROFILE.theme_color || 'blue');
  };

  // Fetch doctor profile from profiles table
  const fetchProfile = async (userId: string, email?: string, isNewAccount?: boolean) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Supabase profile error:", error);
        return; // Profile will remain null, UI should handle it or user can log out
      }

      if (data) {
        // 1. The user has no clinic_id (not yet linked to a clinic)
        // 2. AND this is a newly created account (to avoid querying team_invitations on every owner login)
        if (!data.clinic_id && email && isNewAccount) {
          try {
            const redeemed = await redeemPendingInvitation(userId, email);
            if (redeemed) {
              // Re-fetch to get updated clinic_id + role
              const { data: updatedData } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
              if (updatedData) {
                const prof: DoctorProfile = {
                  ...updatedData as DoctorProfile,
                  role: updatedData.role || 'owner',
                  currency: updatedData.currency || 'HNL',
                  locale: updatedData.locale || 'es-HN',
                  theme_color: updatedData.theme_color || 'blue',
                  has_completed_onboarding: updatedData.has_completed_onboarding || false,
                };
                if (isGuestRef.current) {
                  savedProfileRef.current = prof;
                  return;
                }
                document.documentElement.setAttribute('data-theme', prof.theme_color || 'blue');
                setProfile(prof);
                setCurrencyConfig(prof.currency, prof.locale);
                return;
              }
            }
          } catch (redeemErr) {
            console.error("Error in redeemPendingInvitation:", redeemErr);
          }
        }

        const prof: DoctorProfile = {
          ...data as DoctorProfile,
          role: data.role || 'owner',
          currency: data.currency || 'HNL',
          locale: data.locale || 'es-HN',
          theme_color: data.theme_color || 'blue',
          has_completed_onboarding: data.has_completed_onboarding || false,
        };

        if (isGuestRef.current) {
          savedProfileRef.current = prof;
          return;
        }

        document.documentElement.setAttribute('data-theme', prof.theme_color || 'blue');
        setProfile(prof);
        setCurrencyConfig(prof.currency, prof.locale);
      }
    } catch (err) {
      console.error("Unexpected error in fetchProfile:", err);
    }
  };

  const exitGuestMode = () => {
    isGuestRef.current = false;
    setIsGuest(false);
    const restored = savedProfileRef.current;
    savedProfileRef.current = null;
    if (restored) {
      setProfile(restored);
      setCurrencyConfig(restored.currency, restored.locale);
      document.documentElement.setAttribute('data-theme', restored.theme_color || 'blue');
      return;
    }
    setProfile(null);
    if (user) fetchProfile(user.id, user.email);
  };


  useEffect(() => {
    let cancelled = false;
    const waitingForOAuth = isAuthCallbackUrl();

    // Limpia refresh tokens viejos (p. ej. tras cerrar sesión o revocar en otro dispositivo).
    // Evita el ruido AuthApiError: Invalid Refresh Token en /welcome.
    void supabase.auth.getSession().then(async ({ error }) => {
      if (cancelled || !error) return;
      if (/refresh token/i.test(error.message || '')) {
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch { /* ignore */ }
      }
    });

    const unsubscribe = subscribeAuth((event, nextSession) => {
      if (cancelled) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        const shouldLoadProfile = event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED';
        if (shouldLoadProfile) {
          const createdAt = new Date(nextSession.user.created_at).getTime();
          const isNewAccount = event === 'SIGNED_IN' && Date.now() - createdAt < 10 * 60 * 1000;
          fetchProfile(nextSession.user.id, nextSession.user.email, isNewAccount).finally(() => {
            if (!cancelled && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
              setLoading(false);
            }
          });
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        setProfile(null);
      }

      const stillExchangingCode = waitingForOAuth && event === 'INITIAL_SESSION';
      if (!stillExchangingCode && (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT')) {
        setLoading(false);
      }
    });

    const safetyTimer = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, 8000);

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    flushSync(() => {
      setSession(null);
      setUser(null);
      setProfile(null);
    });
    await queryClient.cancelQueries();
    queryClient.clear();
    bookingService.reset();
    try {
      ['dientelink_notifications_v2', 'dientelink_last_backup', 'dientelink_shown_tips'].forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) {
      await supabase.auth.signOut({ scope: 'local' });
    }
  };

  const updateProfile = async (updates: Partial<DoctorProfile>) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    
    if (error) {
      console.error('Update Profile Error:', error);
      throw error;
    }

    const updated = profile ? { ...profile, ...updates } : null;
    setProfile(updated);
    if (updated) {
      setCurrencyConfig(updated.currency, updated.locale);
      document.documentElement.setAttribute('data-theme', updated.theme_color || 'blue');
    }
  };

  const signInWithGoogle = async (options?: { chooseAccount?: boolean }) => {
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        ...(options?.chooseAccount ? { queryParams: { prompt: 'select_account' } } : {}),
      }
    });
    if (error) throw error;
  };

  // Single-user clinic namespace. If user is invited, use their clinic_id.
  // In guest mode, always use 'demo' as clinicId so hooks can detect it.
  const clinicId = isGuest ? 'demo' : (profile?.clinic_id || profile?.id || null);

  return (
    <AuthContext.Provider value={{ user, session, profile, clinicId, loading, isGuest, enterGuestMode, exitGuestMode, signOut, updateProfile, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};
