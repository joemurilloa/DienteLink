/**
 * schemas.ts — Zod v4 validation schemas for all major domain objects.
 *
 * Every piece of user input that eventually gets persisted to Supabase must be
 * validated here BEFORE the mutation runs. This prevents:
 *  - Empty strings masquerading as valid data
 *  - Invalid dates reaching the DB
 *  - Malformed phone/email formats
 *  - Type coercion surprises (number fields sent as strings, etc.)
 *
 * NOTE: Uses Zod v4 API — error messages use `error:` (not `errorMap:`),
 * and ZodError exposes `.issues` (not `.errors`).
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** YYYY-MM-DD string */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (formato YYYY-MM-DD)');

/** YYYY-MM-DD string that is not in the future */
const pastOrPresentDate = isoDateString.refine(
  (val) => val <= new Date().toISOString().split('T')[0],
  'La fecha no puede ser futura',
);

/** HH:MM string */
const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Hora inválida (formato HH:MM)');

const phoneNumber = z
  .string()
  .min(1, 'El teléfono es obligatorio')
  .refine(
    (val) => val.replace(/[\s\-\+\(\)]/g, '').length >= 8,
    'Teléfono inválido (mínimo 8 dígitos)',
  );

const optionalEmail = z
  .string()
  .optional()
  .transform((v) => v?.trim() || undefined)
  .refine(
    (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    'Correo electrónico inválido',
  );

// ---------------------------------------------------------------------------
// Patient identification (new patient modal + edit)
// ---------------------------------------------------------------------------

export const PatientIdentificationSchema = z.object({
  fullName: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .min(3, 'Mínimo 3 caracteres')
    .transform((v) => v.trim()),
  birthDate: pastOrPresentDate,
  gender: z.string().optional().default(''),
  address: z.string().optional().default(''),
  phone: phoneNumber,
  email: optionalEmail.transform((v) => v ?? ''),
  occupation: z.string().optional().default(''),
});

export type PatientIdentificationInput = z.input<typeof PatientIdentificationSchema>;
export type PatientIdentificationOutput = z.output<typeof PatientIdentificationSchema>;

// ---------------------------------------------------------------------------
// Appointment (create / update)
// ---------------------------------------------------------------------------

const VALID_APPOINTMENT_TYPES = ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'] as const;

export const AppointmentSchema = z.object({
  patientName: z
    .string()
    .min(1, 'El nombre del paciente es obligatorio')
    .min(3, 'El nombre es demasiado corto (mínimo 3 caracteres)')
    .transform((v) => v.trim()),
  patientId: z.string().optional().default(''),
  date: isoDateString,
  time: timeString,
  type: z.enum(VALID_APPOINTMENT_TYPES, {
    error: 'Tipo de cita inválido',
  }),
  phoneNumber: z.string().optional().default(''),
});

export type AppointmentInput = z.input<typeof AppointmentSchema>;

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

const VALID_PAYMENT_METHODS = ['cash', 'card', 'transfer', 'other'] as const;

export const PaymentSchema = z.object({
  amount: z
    .number({ error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0'),
  method: z.enum(VALID_PAYMENT_METHODS, {
    error: 'Método de pago inválido',
  }),
  note: z.string().optional().default(''),
  date: isoDateString,
});

export type PaymentInput = z.input<typeof PaymentSchema>;

// ---------------------------------------------------------------------------
// Budget item
// ---------------------------------------------------------------------------

export const BudgetItemSchema = z.object({
  treatment: z.string().min(1, 'El tratamiento es obligatorio').transform((v) => v.trim()),
  toothId: z.number().int().min(1).max(32).optional(),
  unitCost: z
    .number({ error: 'El costo debe ser un número' })
    .min(0, 'El costo no puede ser negativo'),
  quantity: z
    .number({ error: 'La cantidad debe ser un número' })
    .int()
    .positive('La cantidad debe ser mayor a 0'),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
});

export type BudgetItemInput = z.input<typeof BudgetItemSchema>;

// ---------------------------------------------------------------------------
// Evolution note
// ---------------------------------------------------------------------------

export const EvolutionNoteSchema = z.object({
  date: isoDateString,
  content: z.string().min(1, 'El contenido de la nota es obligatorio').transform((v) => v.trim()),
  procedure: z.string().optional().default(''),
});

export type EvolutionNoteInput = z.input<typeof EvolutionNoteSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a ZodError to a flat Record<field, message> for UI display.
 * Uses `.issues` (Zod v4 API — v3 used `.errors`).
 */
export function zodErrorToFieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.map((issue) => [issue.path.join('.'), issue.message]),
  );
}

/**
 * Validates data with a Zod schema.
 * Returns `{ success: true, data }` or `{ success: false, errors }`.
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): { success: true; data: z.output<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, errors: zodErrorToFieldErrors(result.error) };
}
