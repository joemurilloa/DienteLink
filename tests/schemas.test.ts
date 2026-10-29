/**
 * tests/schemas.test.ts
 * Unit tests for the Zod validation schemas.
 */
import { describe, it, expect } from 'vitest';
import {
  PatientIdentificationSchema,
  AppointmentSchema,
  PaymentSchema,
  BudgetItemSchema,
  zodErrorToFieldErrors,
  validate,
} from '../lib/schemas';

// ---------------------------------------------------------------------------
// PatientIdentificationSchema
// ---------------------------------------------------------------------------

describe('PatientIdentificationSchema', () => {
  const valid = {
    fullName: 'Carlos Rodríguez',
    birthDate: '1990-05-15',
    gender: 'Masculino',
    address: 'Barrio Centro',
    phone: '+504 9999-8888',
    email: 'carlos@ejemplo.com',
    occupation: 'Ingeniero',
  };

  it('accepts a valid patient identification', () => {
    const result = PatientIdentificationSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('trims whitespace from fullName', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, fullName: '  Juan Pedro  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe('Juan Pedro');
  });

  it('rejects empty fullName', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, fullName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodErrorToFieldErrors(result.error);
      expect(errors.fullName).toBeTruthy();
    }
  });

  it('rejects fullName shorter than 3 chars', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, fullName: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects a future birthDate', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const futureStr = future.toISOString().split('T')[0];
    const result = PatientIdentificationSchema.safeParse({ ...valid, birthDate: futureStr });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodErrorToFieldErrors(result.error);
      expect(errors.birthDate).toBeTruthy();
    }
  });

  it('rejects birthDate with wrong format', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, birthDate: '15/05/1990' });
    expect(result.success).toBe(false);
  });

  it('rejects phone with fewer than 8 digits', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, phone: '1234' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = zodErrorToFieldErrors(result.error);
      expect(errors.phone).toBeTruthy();
    }
  });

  it('accepts phone with spaces and dashes (counts digits)', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, phone: '9999-8888' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email format', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts missing optional email', () => {
    const result = PatientIdentificationSchema.safeParse({ ...valid, email: '' });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AppointmentSchema
// ---------------------------------------------------------------------------

describe('AppointmentSchema', () => {
  const valid = {
    patientName: 'María García',
    date: '2030-12-01',
    time: '09:00',
    type: 'Consulta' as const,
  };

  it('accepts a valid appointment', () => {
    const result = AppointmentSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects empty patient name', () => {
    const result = AppointmentSchema.safeParse({ ...valid, patientName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects patient name shorter than 3 chars', () => {
    const result = AppointmentSchema.safeParse({ ...valid, patientName: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = AppointmentSchema.safeParse({ ...valid, date: '01-12-2030' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time format', () => {
    const result = AppointmentSchema.safeParse({ ...valid, time: '9:00' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid appointment type', () => {
    const result = AppointmentSchema.safeParse({ ...valid, type: 'Emergencia' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid appointment types', () => {
    for (const type of ['Consulta', 'Seguimiento', 'Cirugía', 'Revisión'] as const) {
      const result = AppointmentSchema.safeParse({ ...valid, type });
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// PaymentSchema
// ---------------------------------------------------------------------------

describe('PaymentSchema', () => {
  const valid = {
    amount: 500,
    method: 'cash' as const,
    note: 'Pago en efectivo',
    date: '2030-01-15',
  };

  it('accepts a valid payment', () => {
    expect(PaymentSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects zero amount', () => {
    expect(PaymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(PaymentSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it('rejects invalid payment method', () => {
    expect(PaymentSchema.safeParse({ ...valid, method: 'bitcoin' }).success).toBe(false);
  });

  it('accepts all valid payment methods', () => {
    for (const method of ['cash', 'card', 'transfer', 'other'] as const) {
      expect(PaymentSchema.safeParse({ ...valid, method }).success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// BudgetItemSchema
// ---------------------------------------------------------------------------

describe('BudgetItemSchema', () => {
  const valid = {
    treatment: 'Extracción simple',
    unitCost: 800,
    quantity: 1,
  };

  it('accepts a valid budget item', () => {
    expect(BudgetItemSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty treatment name', () => {
    expect(BudgetItemSchema.safeParse({ ...valid, treatment: '' }).success).toBe(false);
  });

  it('rejects negative cost', () => {
    expect(BudgetItemSchema.safeParse({ ...valid, unitCost: -1 }).success).toBe(false);
  });

  it('accepts zero cost (free treatments)', () => {
    expect(BudgetItemSchema.safeParse({ ...valid, unitCost: 0 }).success).toBe(true);
  });

  it('rejects zero quantity', () => {
    expect(BudgetItemSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it('rejects non-integer quantity', () => {
    expect(BudgetItemSchema.safeParse({ ...valid, quantity: 1.5 }).success).toBe(false);
  });

  it('rejects toothId out of range', () => {
    expect(BudgetItemSchema.safeParse({ ...valid, toothId: 33 }).success).toBe(false);
    expect(BudgetItemSchema.safeParse({ ...valid, toothId: 0 }).success).toBe(false);
  });

  it('accepts valid toothId', () => {
    expect(BudgetItemSchema.safeParse({ ...valid, toothId: 16 }).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validate() helper
// ---------------------------------------------------------------------------

describe('validate()', () => {
  it('returns success:true with parsed data', () => {
    const result = validate(AppointmentSchema, {
      patientName: 'Ana López',
      date: '2030-06-15',
      time: '10:30',
      type: 'Revisión',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.patientName).toBe('Ana López');
  });

  it('returns success:false with flat field errors', () => {
    const result = validate(PatientIdentificationSchema, {
      fullName: '',
      birthDate: 'bad-date',
      phone: '123',
    });
    expect(result.success).toBe(false);
    const failure = result as { success: false; errors: Record<string, string> };
    expect(failure.errors.fullName).toBeTruthy();
    expect(failure.errors.birthDate).toBeTruthy();
    expect(failure.errors.phone).toBeTruthy();
  });
});
