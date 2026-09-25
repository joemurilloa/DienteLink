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

  // Por defecto, cualquier usuario registrado es propietario/doctor con acceso total
  const userRole = (profile?.role as UserRole) || 'owner';
  const isFullAccess = ['owner', 'admin', 'doctor', 'dr', 'odontologo', 'odontólogo'].includes(userRole.toLowerCase());

  if (isFullAccess || allowedRoles.includes(userRole)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

// Hooks for more granular logic
export function useRoleAccess() {
  const { profile } = useAuth();
  // Por defecto el usuario es propietario con acceso completo (Opción A)
  const userRole = (profile?.role as UserRole) || 'owner';

  const isAssistant    = userRole === 'assistant';
  const isReceptionist = userRole === 'receptionist';

  // Si no es explícitamente recepcionista o asistente invitado, tiene acceso total a clínica, finanzas y administración
  const hasFullAccess  = !isAssistant && !isReceptionist;

  return {
    role: userRole,
    // Admin-level: puede gestionar equipo, facturación y ajustes
    isAdmin: hasFullAccess,
    // Clinical access: odontograma, periodontograma, notas, recetas, etc.
    canViewClinical : hasFullAccess || isAssistant,
    canEditClinical : hasFullAccess || isAssistant,
    // Financial access: presupuestos, pagos, métricas financieras
    canViewFinancial: hasFullAccess,
    canEditFinancial: hasFullAccess,
    // Citas: todos pueden agendar y ver la agenda
    canManageAppointments: true,
    // Indicadores específicos
    isReceptionist,
    isAssistant,
  };
}
