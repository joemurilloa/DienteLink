import React from 'react';
import { useAuth } from '../services/authService';
import { UserRole } from '../types';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback = null }) => {
  const { profile, loading } = useAuth();

  if (loading) return null;

  const userRole = (profile?.role as UserRole) || 'admin';

  if (allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

// Hooks for more granular logic
export function useRoleAccess() {
  const userRole: UserRole = 'admin';

  return {
    role: userRole,
    isAdmin: true,
    isReceptionist: false,
    isAssistant: false,
    canViewClinical: true,
    canEditClinical: true,
    canViewFinancial: true,
    canManageAppointments: true,
  };
}
