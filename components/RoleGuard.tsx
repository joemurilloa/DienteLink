import React from 'react';
import { useAuth } from '../services/authService';
import { canSeeClinicMoney, normalizeClinicRole, profileRole } from '../lib/roles';
import { UserRole } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback = null }) => {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const normalized = normalizeClinicRole(profile?.role) ?? (profile?.role?.trim() ? null : 'owner');
  const isFullAccess = normalized === 'owner' || normalized === 'admin';

  if (isFullAccess || (normalized !== null && allowedRoles.includes(normalized))) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

export function useRoleAccess() {
  const { profile } = useAuth();
  const normalized = normalizeClinicRole(profile?.role) ?? (profile?.role?.trim() ? null : 'owner');
  const userRole = (normalized ?? profileRole(profile?.role)) as UserRole;

  const isAssistant = normalized === 'assistant';
  const isReceptionist = normalized === 'receptionist';
  const hasFullAccess = normalized === 'owner' || normalized === 'admin';

  return {
    role: userRole,
    isAdmin: hasFullAccess,
    canViewClinical: hasFullAccess || isAssistant,
    canEditClinical: hasFullAccess || isAssistant,
    canViewFinancial: canSeeClinicMoney(profile?.role),
    canEditFinancial: canSeeClinicMoney(profile?.role),
    canManageAppointments: true,
    isReceptionist,
    isAssistant,
  };
}
