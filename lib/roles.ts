export const CLINIC_ROLES = ['owner', 'admin', 'assistant', 'receptionist'] as const;

export type ClinicRole = (typeof CLINIC_ROLES)[number];

const LEGACY_OWNER = new Set(['doctor', 'dr', 'odontologo', 'odontólogo']);

/** Rol canónico. Los alias viejos cuentan como dueño. Un texto desconocido no se promueve. */
export function normalizeClinicRole(role: string | null | undefined): ClinicRole | null {
  const value = (role ?? '').trim().toLowerCase();
  if ((CLINIC_ROLES as readonly string[]).includes(value)) return value as ClinicRole;
  if (LEGACY_OWNER.has(value)) return 'owner';
  return null;
}

/**
 * Rol que muestra la app.
 * Si el perfil no trae rol, es dueño: el alta en Postgres hace lo mismo.
 * Un valor desconocido se conserva y no recibe privilegios de dueño.
 */
export function profileRole(role: string | null | undefined): string {
  return normalizeClinicRole(role) ?? (role?.trim() ? role.trim().toLowerCase() : 'owner');
}

export function canSeeClinicMoney(role: string | null | undefined): boolean {
  const normalized = normalizeClinicRole(role) ?? (role?.trim() ? null : 'owner');
  return normalized === 'owner' || normalized === 'admin';
}

/** Notas, eventos, consentimientos y recetas. La recepcionista no los ve. */
export function canViewClinicalChart(role: string | null | undefined): boolean {
  const normalized = normalizeClinicRole(role) ?? (role?.trim() ? null : 'owner');
  return normalized === 'owner' || normalized === 'admin' || normalized === 'assistant';
}

export const ROLE_LABELS: Record<ClinicRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  assistant: 'Asistente clínico',
  receptionist: 'Recepcionista',
};

export function roleLabel(role: string | null | undefined): string {
  const normalized = normalizeClinicRole(role) ?? (role?.trim() ? null : 'owner');
  if (normalized) return ROLE_LABELS[normalized];
  return role?.trim() || 'Propietario';
}
