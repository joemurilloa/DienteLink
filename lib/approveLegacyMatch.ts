export type BookingPatientRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
};

export function normalizePersonName(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function phoneDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Una coincidencia se reutiliza. Varias: expediente nuevo, sin mezclar historiales. */
export function pickBookingPatient(
  rows: BookingPatientRow[],
  name: string,
  email: string | null | undefined,
  phone: string | null | undefined,
): { kind: 'one'; id: string } | { kind: 'many' } | { kind: 'none' } {
  const emailNorm = (email ?? '').trim().toLowerCase();
  const phoneNorm = phoneDigits(phone);
  const nameNorm = normalizePersonName(name);
  const hits = rows.filter((row) => {
    const rowEmail = (row.email ?? '').trim().toLowerCase();
    if (emailNorm && rowEmail === emailNorm) return true;
    return (
      phoneNorm.length > 0 &&
      phoneDigits(row.phone) === phoneNorm &&
      normalizePersonName(row.full_name) === nameNorm &&
      nameNorm !== ''
    );
  });
  if (hits.length === 1) return { kind: 'one', id: hits[0].id };
  if (hits.length > 1) return { kind: 'many' };
  return { kind: 'none' };
}

/** Misma regla que approve_appointment_request: esas citas no ocupan el hueco. */
export function appointmentBlocksSlot(status: string | null | undefined): boolean {
  const value = (status ?? '').trim().toLowerCase();
  return !['eliminada', 'cancelled', 'canceled', 'rejected'].includes(value);
}
