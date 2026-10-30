import React from 'react';
import { useAuth } from '../services/authService';
import {
  canApproveBookingRequests,
  canSeeClinicMoney,
  canViewClinicalChart,
  normalizeClinicRole,
  profileRole,
} from '../lib/roles';
import { UserRole } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * Guard de UI (no sustituye RLS).
 * - loading: no renderiza privilegios (evita flash).
 * - sin rol canónico: niega (fail-closed). Nunca asume owner.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback = null }) => {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const normalized = normalizeClinicRole(profile?.role);
  if (!normalized) return <>{fallback}</>;

  const isFullAccess = normalized === 'owner' || normalized === 'admin';

  if (isFullAccess || allowedRoles.includes(normalized)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export function useRoleAccess() {
  const { profile, loading } = useAuth();
  const normalized = normalizeClinicRole(profile?.role);

  const isAssistant = normalized === 'assistant';
  const isReceptionist = normalized === 'receptionist';
  const hasFullAccess = normalized === 'owner' || normalized === 'admin';

  return {
    loading,
    /** Etiqueta; sin rol canónico no implica privilegios. */
    role: (normalized ?? profileRole(profile?.role)) as UserRole,
    hasRole: normalized !== null,
    isAdmin: hasFullAccess,
    canViewClinical: canViewClinicalChart(profile?.role),
    canEditClinical: canViewClinicalChart(profile?.role),
    canViewFinancial: canSeeClinicMoney(profile?.role),
    canEditFinancial: canSeeClinicMoney(profile?.role),
    canManageAppointments: normalized !== null,
    canApproveBookings: canApproveBookingRequests(profile?.role),
    isReceptionist,
    isAssistant,
  };
}
