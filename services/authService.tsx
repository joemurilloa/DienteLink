import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { setCurrencyConfig } from '../lib/utils';
import { queryClient } from '../lib/queryClient';
import { bookingService } from './bookingService';
import { redeemPendingInvitation } from '../hooks/useTeam';
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
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<DoctorProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<void>;
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

  const enterGuestMode = () => {
    setIsGuest(true);
    setProfile(DEMO_PROFILE);
    setCurrencyConfig(DEMO_PROFILE.currency, DEMO_PROFILE.locale);
    document.documentElement.setAttribute('data-theme', DEMO_PROFILE.theme_color || 'blue');
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    setProfile(null);
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
                  currency: updatedData.currency || 'HNL',
                  locale: updatedData.locale || 'es-HN',
                  theme_color: updatedData.theme_color || 'blue',
                  has_completed_onboarding: updatedData.has_completed_onboarding || false,
                };
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
          currency: data.currency || 'HNL',
          locale: data.locale || 'es-HN',
          theme_color: data.theme_color || 'blue',
          has_completed_onboarding: data.has_completed_onboarding || false,
        };

        document.documentElement.setAttribute('data-theme', prof.theme_color || 'blue');

        setProfile(prof);
        setCurrencyConfig(prof.currency, prof.locale);
      }
    } catch (err) {
      console.error("Unexpected error in fetchProfile:", err);
    }
  };


  useEffect(() => {
    // Get initial session.
    // IMPORTANT: setLoading(false) is called AFTER fetchProfile resolves so that
    // clinicId (derived from profile) is fully settled before the app renders.
    // This prevents team members from briefly seeing their own profile.id as clinicId
    // while redeemInvitation is still running.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Detect if this is a brand-new account (registered in the last 10 minutes)
        const createdAt = new Date(session.user.created_at).getTime();
        const isNewAccount = Date.now() - createdAt < 10 * 60 * 1000;
        fetchProfile(session.user.id, session.user.email, isNewAccount).finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (sign-in / sign-out / token refresh).
    // On sign-in: fetchProfile resolves before components can query data.
    // On sign-out: clear cache and profile immediately.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Re-fetch profile on every auth change (e.g. Google OAuth redirect).
        // Do NOT block loading state here — initial load already covers this.
        fetchProfile(session.user.id, session.user.email);
      } else {
        queryClient.clear();
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (error) return { error: error.message };
    return { error: null };
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    queryClient.clear();
    bookingService.reset();
    await supabase.auth.signOut();
    setProfile(null);
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

  const resetPassword = async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signInWithGoogle = async () => {
    // Determine redirect URL. On Vercel, window.location.origin should be used.
    // Ensure this match EXACTLY with the "Redirect URLs" in Supabase Dashboard.
    const redirectTo = window.location.origin;
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
  };

  // Single-user clinic namespace. If user is invited, use their clinic_id.
  // In guest mode, always use 'demo' as clinicId so hooks can detect it.
  const clinicId = isGuest ? 'demo' : (profile?.clinic_id || profile?.id || null);

  return (
    <AuthContext.Provider value={{ user, session, profile, clinicId, loading, isGuest, enterGuestMode, exitGuestMode, signUp, signIn, signOut, updateProfile, resetPassword, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};
