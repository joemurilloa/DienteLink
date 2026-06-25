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
  // Role string from DB: 'owner', 'admin', 'assistant', 'receptionist'
  const devRole = localStorage.getItem('DEV_ROLE');
  const userRole = (devRole as UserRole) || (profile?.role as UserRole) || 'owner';

  const isAdmin = userRole === 'admin' || userRole === 'owner';
  const isReceptionist = userRole === 'receptionist';
  const isAssistant = userRole === 'assistant';

  return {
    role: userRole,
    isAdmin,
    isReceptionist,
    isAssistant,
    // Receptionist shouldn't see clinical charts
    canViewClinical: isAdmin || isAssistant,
    // Receptionist shouldn't edit clinical charts
    canEditClinical: isAdmin || isAssistant,
    // Assistant shouldn't see money. Receptionist shouldn't see money either (only for scheduling).
    canViewFinancial: isAdmin,
    // Everyone can see and manage appointments
    canManageAppointments: true,
  };
}
