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
  const { profile } = useAuth();
  // Map roles to standard system roles. If unknown or not set, default to admin (the clinic owner).
  const rawRole = (profile?.role || '').toLowerCase();
  
  let userRole: UserRole = 'admin';
  if (rawRole.includes('receptionist') || rawRole.includes('recep') || rawRole.includes('secretaria')) {
    userRole = 'receptionist';
  } else if (rawRole.includes('assistant') || rawRole.includes('asistente')) {
    userRole = 'assistant';
  }
  // All other roles (Odontólogo, Doctor, Admin, etc.) default to 'admin' for full access.

  return {
    role: userRole,
    isAdmin: userRole === 'admin',
    isReceptionist: userRole === 'receptionist',
    isAssistant: userRole === 'assistant',
    canViewClinical: ['admin', 'assistant'].includes(userRole),
    canEditClinical: ['admin', 'assistant'].includes(userRole),
    canViewFinancial: ['admin', 'receptionist'].includes(userRole),
    canManageAppointments: ['admin', 'receptionist', 'assistant'].includes(userRole),
  };
}
