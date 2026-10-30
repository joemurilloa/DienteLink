export const CLINIC_ROLES = ['owner', 'admin', 'assistant', 'receptionist'] as const;

export type ClinicRole = (typeof CLINIC_ROLES)[number];

const LEGACY_OWNER = new Set(['doctor', 'dr', 'odontologo', 'odontólogo']);

/** Roles que pueden aprobar solicitudes de reserva pública. */
export const BOOKING_APPROVER_ROLES: readonly ClinicRole[] = ['owner', 'admin', 'receptionist'];

/** Rol canónico. Los alias viejos cuentan como dueño. Un texto desconocido no se promueve. */
export function normalizeClinicRole(role: string | null | undefined): ClinicRole | null {
  const value = (role ?? '').trim().toLowerCase();
  if ((CLINIC_ROLES as readonly string[]).includes(value)) return value as ClinicRole;
  if (LEGACY_OWNER.has(value)) return 'owner';
  return null;
}

/**
 * Rol que muestra la app.
 * Sin rol en el perfil → etiqueta de dueño (el alta en Postgres asigna owner).
 * Un valor desconocido se conserva y no recibe privilegios.
 */
export function profileRole(role: string | null | undefined): string {
  return normalizeClinicRole(role) ?? (role?.trim() ? role.trim().toLowerCase() : 'owner');
}

/**
 * Privilegios fallan cerrados: sin rol canónico → sin acceso.
 * No asumir owner por string vacío (eso es solo etiqueta en profileRole).
 */
export function canSeeClinicMoney(role: string | null | undefined): boolean {
  const normalized = normalizeClinicRole(role);
  return normalized === 'owner' || normalized === 'admin';
}

/** Notas, eventos, consentimientos y recetas. La recepcionista no los ve. */
export function canViewClinicalChart(role: string | null | undefined): boolean {
  const normalized = normalizeClinicRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'assistant';
}

export function canApproveBookingRequests(role: string | null | undefined): boolean {
  const normalized = normalizeClinicRole(role);
  return normalized !== null && (BOOKING_APPROVER_ROLES as readonly string[]).includes(normalized);
}

export const ROLE_LABELS: Record<ClinicRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  assistant: 'Asistente clínico',
  receptionist: 'Recepcionista',
};

export function roleLabel(role: string | null | undefined): string {
  const normalized = normalizeClinicRole(role);
  if (normalized) return ROLE_LABELS[normalized];
  if (role?.trim()) return role.trim();
  return 'Sin rol';
}
