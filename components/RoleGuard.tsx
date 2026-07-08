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

  const devRole = localStorage.getItem('DEV_ROLE');
  const userRole = (devRole as UserRole) || (profile?.role as UserRole) || 'owner';

  if (!allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hooks for more granular logic
export function useRoleAccess() {
  const { profile } = useAuth();
  const devRole = localStorage.getItem('DEV_ROLE');
  const userRole = (devRole as UserRole) || (profile?.role as UserRole) || 'owner';

  const isOwner        = userRole === 'owner';
  const isAdmin        = userRole === 'owner' || userRole === 'admin';
  const isAssistant    = userRole === 'assistant';
  const isReceptionist = userRole === 'receptionist';
  // Legacy/alternative role names that should have full clinical access (case-insensitive)
  const isDoctor = ['doctor', 'dr', 'odontologo', 'odontólogo'].includes(userRole.toLowerCase());

  return {
    role: userRole,
    // Admin-level: can manage team, billing, settings
    isAdmin,
    // Clinical access: can view/edit clinical records (odontogram, perio, notes, consents, prescriptions)
    canViewClinical : isOwner || isAdmin || isAssistant || isDoctor,
    canEditClinical : isOwner || isAdmin || isAssistant || isDoctor,
    // Financial access: can view/edit budgets, payments, dashboard financials
    canViewFinancial: isOwner || isAdmin || isDoctor,
    canEditFinancial: isOwner || isAdmin || isDoctor,
    // Appointments: everyone can manage appointments
    canManageAppointments: true,
    // Receptionist: limited to calendar + booking requests
    isReceptionist,
    isAssistant,
  };
}
