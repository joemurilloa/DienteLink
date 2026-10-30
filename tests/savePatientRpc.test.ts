import { describe, expect, it } from 'vitest';
import {
  buildSavePatientPayload,
  markCollectionRemoved,
  omitNullFields,
  remainingPendingRemovedIds,
  removeCollectionItem,
} from '../lib/savePatientRpc';
import type { PatientRecord } from '../types';
import { ensureOdontogram, ensurePeriodontogramData } from '../lib/utils';

function basePatient(over: Partial<PatientRecord> = {}): PatientRecord {
  return {
    id: 'p1',
    identification: {
      fullName: 'Ana',
      birthDate: '',
      gender: '',
      address: '',
      phone: '1',
      email: '',
      occupation: '',
    },
    clinicalHistory: {
      allergies: [],
      medications: '',
      previousDiseases: '',
      familyHistory: '',
      motiveOfConsult: '',
      bloodType: '',
      smoker: false,
      pregnant: false,
      habits: '',
      observations: '',
    },
    evolutionNotes: [],
    history: [],
    consentSigned: false,
    odontogram: ensureOdontogram([]),
    periodontogram: ensurePeriodontogramData(undefined),
    xrays: [],
    budget: [],
    payments: [],
    labWorks: [],
    balance: 0,
    consents: [],
    prescriptions: [],
    loadedCollections: ['payments', 'budget', 'evolutionNotes'],
    version: 3,
    ...over,
  };
}

describe('omitNullFields', () => {
  it('omite null/undefined y conserva strings vacíos', () => {
    expect(omitNullFields({ a: null, b: undefined, c: '', d: 'x' })).toEqual({
      c: '',
      d: 'x',
    });
  });
});

describe('buildSavePatientPayload', () => {
  it('paciente cargado de DB con campos vacíos no mete null JSON', () => {
    const fromDb = basePatient({
      identification: {
        fullName: 'Ana',
        birthDate: null as unknown as string,
        gender: null as unknown as string,
        address: '',
        phone: '1',
        email: null as unknown as string,
        occupation: '',
      },
    });
    const previous = basePatient({
      identification: { ...fromDb.identification, birthDate: '', gender: '', email: '' },
    });
    // Solo phone dirty
    const next = {
      ...fromDb,
      identification: { ...fromDb.identification, phone: '99', birthDate: null as unknown as string },
    };
    const payload = buildSavePatientPayload(next, previous, {
      includeClinical: true,
      includeMoney: true,
    });
    const ident = payload.identification as Record<string, unknown>;
    expect(ident.phone).toBe('99');
    expect(Object.values(ident).some((v) => v === null)).toBe(false);
  });

  it('recepción: no envía clinical ni odontogram', () => {
    const previous = basePatient();
    const next = basePatient({
      identification: { ...previous.identification, phone: '2' },
      clinicalHistory: { ...previous.clinicalHistory, allergies: ['x'] },
      odontogram: ensureOdontogram([{ id: 11 } as never]),
    });
    const payload = buildSavePatientPayload(next, previous, {
      includeClinical: false,
      includeMoney: true,
    });
    expect(payload.clinicalHistory).toBeUndefined();
    expect(payload.odontogram).toBeUndefined();
    expect(payload.identification).toEqual({ phone: '2' });
  });

  it('asistente: no envía budget ni payments', () => {
    const previous = basePatient({
      payments: [{ id: 'pay1', amount: 10, method: 'cash', note: '', date: 'd' }],
    });
    const next = basePatient({
      payments: [
        { id: 'pay1', amount: 10, method: 'cash', note: '', date: 'd' },
        { id: 'pay2', amount: 5, method: 'cash', note: '', date: 'd' },
      ],
      evolutionNotes: [{ id: 'n1', date: 'x', content: 'c', procedure: '' }],
    });
    const payload = buildSavePatientPayload(next, previous, {
      includeClinical: true,
      includeMoney: false,
    });
    const cols = payload.collections as Record<string, unknown> | undefined;
    expect(cols?.payments).toBeUndefined();
    expect(cols?.budget).toBeUndefined();
    expect(cols?.evolutionNotes).toBeDefined();
  });

  it('omite colecciones no dirty', () => {
    const previous = basePatient({
      payments: [{ id: 'pay1', amount: 10, method: 'cash', note: '', date: 'd' }],
    });
    const next = basePatient({
      payments: [{ id: 'pay1', amount: 10, method: 'cash', note: '', date: 'd' }],
      identification: { ...previous.identification, phone: '8' },
    });
    const payload = buildSavePatientPayload(next, previous, {
      includeClinical: false,
      includeMoney: true,
    });
    expect(payload.collections).toBeUndefined();
  });

  it('removedIds solo desde pending (no diff de cache)', () => {
    const previous = basePatient({
      payments: [
        { id: 'pay1', amount: 10, method: 'cash', note: '', date: 'd' },
        { id: 'pay2', amount: 5, method: 'cash', note: '', date: 'd' },
      ],
    });
    // UI filtró pay2 sin markCollectionRemoved → no debe borrar en servidor
    const nextUnsafe = basePatient({
      payments: [{ id: 'pay1', amount: 10, method: 'cash', note: '', date: 'd' }],
    });
    const unsafe = buildSavePatientPayload(nextUnsafe, previous, {
      includeClinical: false,
      includeMoney: true,
    });
    const paymentsUnsafe = (unsafe.collections as Record<string, { removedIds: string[] }>)
      ?.payments;
    expect(paymentsUnsafe?.removedIds ?? []).toEqual([]);

    const nextSafe = removeCollectionItem(previous, 'payments', 'pay2');
    const safe = buildSavePatientPayload(nextSafe, previous, {
      includeClinical: false,
      includeMoney: true,
    });
    const paymentsSafe = (safe.collections as Record<string, { removedIds: string[] }>).payments;
    expect(paymentsSafe.removedIds).toEqual(['pay2']);
  });

  it('markCollectionRemoved acumula ids', () => {
    const p = markCollectionRemoved(basePatient(), 'budget', 'b1');
    expect(p.pendingRemovedIds?.budget).toEqual(['b1']);
  });

  it('removeCollectionItem no deja el id en items∩removedIds', () => {
    const prev = basePatient({
      payments: [
        { id: 'local-new', amount: 1, method: 'cash', note: '', date: 'd' },
        { id: 'pay1', amount: 10, method: 'cash', note: '', date: 'd' },
      ],
    });
    const next = removeCollectionItem(prev, 'payments', 'local-new');
    expect(next.payments?.map((p) => p.id)).toEqual(['pay1']);
    expect(next.pendingRemovedIds?.payments).toEqual(['local-new']);
    const payload = buildSavePatientPayload(next, prev, {
      includeClinical: false,
      includeMoney: true,
    });
    const block = (payload.collections as Record<string, { items: { id: string }[]; removedIds: string[] }>)
      .payments;
    const itemIds = block.items.map((i) => i.id);
    expect(itemIds).not.toContain('local-new');
    expect(block.removedIds).toContain('local-new');
    expect(itemIds.some((id) => block.removedIds.includes(id))).toBe(false);
  });

  it('remainingPendingRemovedIds conserva ids añadidos en vuelo', () => {
    const left = remainingPendingRemovedIds(
      { payments: ['a', 'b'], budget: ['c'] },
      { payments: ['a'] },
    );
    expect(left).toEqual({ payments: ['b'], budget: ['c'] });
  });
});

describe('grep borrados UI (contrato)', () => {
  it('documenta: solo BudgetTab borra colecciones hoy (budget/payments vía removeCollectionItem)', () => {
    // Guardrail documental: si se añade UI de borrado en timeline/consents/etc.,
    // debe usar removeCollectionItem. Ver docs/reporte-claude-save-patient.md.
    expect(typeof removeCollectionItem).toBe('function');
  });
});
