
import { PerioSite, PerioToothData, PeriodontogramData, PatientRecord, Appointment } from '../types';

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Safely extract initials from a name string. Handles empty strings, undefined, etc. */
export function getInitials(name: string | undefined | null, fallback = '??'): string {
  if (!name || !name.trim()) return fallback;
  return name.trim().split(' ').filter(w => w.length > 0).map(w => w[0]).join('').substring(0, 2).toUpperCase() || fallback;
}

// Default currency config — overridden by doctor profile
let _currencyCode = 'HNL';
let _currencyLocale = 'es-HN';

export function setCurrencyConfig(currency: string, locale: string) {
  _currencyCode = currency;
  _currencyLocale = locale;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(_currencyLocale, {
    style: 'currency',
    currency: _currencyCode,
  }).format(amount);
}

export function generateId(): string {
  return crypto.randomUUID();
}

/** Formats ISO dates ("YYYY-MM-DD") into human readable strings like "jueves 19 de marzo" for fast reading */
export function formatAppDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch(e) {
    return dateStr;
  }
}

/** Safely return YYYY-MM-DD in the user's local timezone instead of UTC */
export function getLocalISODate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// --- Periodontogram helpers ---

const DEFAULT_SITE: PerioSite = { depth: 0, recession: 0, bleeding: false };

export function createDefaultPeriodontogramData(): PeriodontogramData {
  return {
    teeth: Array.from({ length: 32 }, (_, i): PerioToothData => ({
      toothId: i + 1,
      buccal: [{ ...DEFAULT_SITE }, { ...DEFAULT_SITE }, { ...DEFAULT_SITE }],
      lingual: [{ ...DEFAULT_SITE }, { ...DEFAULT_SITE }, { ...DEFAULT_SITE }],
      mobility: 0,
      furcation: 0,
    })),
  };
}

export function migrateLegacyPeriodontogram(old: number[]): PeriodontogramData {
  return {
    teeth: Array.from({ length: 32 }, (_, i): PerioToothData => {
      const d = old[i] || 0;
      const site: PerioSite = { depth: d, recession: 0, bleeding: false };
      return {
        toothId: i + 1,
        buccal: [{ ...site }, { ...site }, { ...site }],
        lingual: [{ ...site }, { ...site }, { ...site }],
        mobility: 0,
        furcation: 0,
      };
    }),
  };
}

/** Detects old number[] format and converts to PeriodontogramData */
export function ensurePeriodontogramData(raw: any): PeriodontogramData {
  if (!raw) return createDefaultPeriodontogramData();
  if (Array.isArray(raw)) return migrateLegacyPeriodontogram(raw);
  if (raw.teeth && Array.isArray(raw.teeth)) return raw as PeriodontogramData;
  return createDefaultPeriodontogramData();
}

// ===================== CSV Export Helpers =====================

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCSV(filename: string, csvContent: string) {
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportPatientsCSV(patients: PatientRecord[]) {
  const headers = ['Nombre', 'Teléfono', 'Email', 'Género', 'Fecha Nacimiento', 'Dirección', 'Ocupación', 'Alergias', 'Motivo Consulta', 'Notas Evolución', 'Procedimientos', 'Total Presupuesto', 'Total Pagado', 'Saldo'];
  const rows = patients.map(p => {
    const budgetTotal = p.budget.reduce((s, b) => s + b.unitCost * b.quantity, 0);
    const paidTotal = (p.payments || []).reduce((s, pay) => s + pay.amount, 0);
    return [
      p.identification.fullName,
      p.identification.phone,
      p.identification.email,
      p.identification.gender,
      p.identification.birthDate,
      p.identification.address,
      p.identification.occupation,
      p.clinicalHistory.allergies.join('; '),
      p.clinicalHistory.motiveOfConsult,
      String(p.evolutionNotes.length),
      String(p.history.length),
      String(budgetTotal),
      String(paidTotal),
      String(Math.max(0, budgetTotal - paidTotal)),
    ].map(escapeCSV);
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(`pacientes_${date}.csv`, csv);
}

export function exportAppointmentsCSV(appointments: Appointment[]) {
  const headers = ['Paciente', 'Fecha', 'Hora', 'Tipo', 'Estado', 'Teléfono', 'Recordatorio'];
  const rows = appointments.map(a => [
    a.patientName,
    a.date,
    a.time,
    a.type,
    a.status,
    a.phoneNumber,
    a.reminderStatus,
  ].map(escapeCSV));
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const date = new Date().toISOString().split('T')[0];
  downloadCSV(`citas_${date}.csv`, csv);
}
