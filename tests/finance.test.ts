import { describe, it, expect } from 'vitest';
import { computeFinance, applyPayment } from '../lib/finance';
import type { PatientRecord } from '../types';

const patient = (over: Partial<PatientRecord>): PatientRecord => ({
  id: 'p1',
  identification: { fullName: 'Ana', birthDate: '', gender: '', address: '', phone: '', email: '', occupation: '' },
  clinicalHistory: { allergies: [], medications: '', previousDiseases: '', familyHistory: '', motiveOfConsult: '' },
  evolutionNotes: [], history: [], consentSigned: false, odontogram: [],
  periodontogram: { teeth: [] }, xrays: [], budget: [], payments: [], balance: 0, consents: [], prescriptions: [],
  ...over,
} as PatientRecord);

const item = (cost: number, qty = 1) => ({ id: 'b', treatment: 'x', unitCost: cost, quantity: qty, status: 'pending' as const, createdAt: '2026-10-01' });
const pay = (amount: number, date: string) => ({ id: 'y', amount, method: 'cash' as const, note: '', date });

describe('computeFinance', () => {
  it('suma cobrado de hoy y del mes', () => {
    const r = computeFinance([
      patient({ payments: [pay(100, '2026-10-05'), pay(200, '2026-10-01'), pay(999, '2026-09-30')] }),
    ], '2026-10-05');
    expect(r.collectedToday).toBe(100);
    expect(r.collectedMonth).toBe(300);
  });

  it('calcula saldos y ordena de mayor a menor', () => {
    const r = computeFinance([
      patient({ id: 'a', budget: [item(500)], payments: [pay(100, '2026-10-02')] }),
      patient({ id: 'b', budget: [item(1000, 2)], payments: [] }),
      patient({ id: 'c', budget: [item(300)], payments: [pay(300, '2026-10-02')] }),
    ], '2026-10-05');
    expect(r.debtors.map(d => d.patient.id)).toEqual(['b', 'a']);
    expect(r.totalOwed).toBe(2400);
  });

  it('no marca como deudor a quien pagó de más', () => {
    const r = computeFinance([patient({ budget: [item(100)], payments: [pay(150, '2026-10-02')] })], '2026-10-05');
    expect(r.debtors).toHaveLength(0);
    expect(r.totalOwed).toBe(0);
  });

  it('registra un pago total sobre el saldo', () => {
    const before = patient({ id: 'a', budget: [item(600)], payments: [] });
    const after = applyPayment(before, 600, 'cash');
    expect(after.payments).toHaveLength(1);
    expect(after.payments?.[0].amount).toBe(600);
    expect(after.payments?.[0].method).toBe('cash');
    const r = computeFinance([after], '2026-10-05');
    expect(r.debtors).toHaveLength(0);
  });
});
