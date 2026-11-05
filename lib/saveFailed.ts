import { rpcErrorCode, rpcErrorMessage } from './rpcErrors';

const TABLES = [
  'patients',
  'patient_clinical',
  'evolution_notes',
  'clinical_events',
  'budget_items',
  'payments',
  'consent_forms',
  'prescriptions',
  'lab_works',
  'appointments',
] as const;

export type SaveTable = (typeof TABLES)[number];

export function knownTable(value: string | undefined): SaveTable | 'desconocida' {
  return TABLES.includes(value as SaveTable) ? (value as SaveTable) : 'desconocida';
}

/** Fallo de guardado con tabla y código, sin meter el texto clínico en otro canal. */
export class SaveFailedError extends Error {
  readonly table: SaveTable | 'desconocida';
  readonly code?: string;

  constructor(table: string, cause: unknown, message?: string) {
    super(message ?? rpcErrorMessage(cause));
    this.name = 'SaveFailedError';
    this.table = knownTable(table);
    const code = rpcErrorCode(cause);
    if (code && /^[A-Za-z0-9]{2,12}$/.test(code)) this.code = code;
  }
}
