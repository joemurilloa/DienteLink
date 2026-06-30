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

  // RESTRICCIONES DESACTIVADAS TEMPORALMENTE A PETICIÓN DEL USUARIO
  // El código original comprobaba si `allowedRoles.includes(userRole)`
  return <>{children}</>;
};

// Hooks for more granular logic
export function useRoleAccess() {
  const { profile } = useAuth();
  const devRole = localStorage.getItem('DEV_ROLE');
  const userRole = (devRole as UserRole) || (profile?.role as UserRole) || 'owner';

  // RESTRICCIONES DESACTIVADAS TEMPORALMENTE A PETICIÓN DEL USUARIO
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
