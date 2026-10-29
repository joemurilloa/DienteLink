import { describe, expect, it } from 'vitest';
import { shouldSyncPatientCollection } from '../lib/patientSync';

describe('shouldSyncPatientCollection', () => {
  it('no borra nada en un alta nueva, que no trae colecciones cargadas', () => {
    expect(shouldSyncPatientCollection(undefined, 'payments', [])).toBe('skip');
    expect(shouldSyncPatientCollection(undefined, 'evolutionNotes', [])).toBe('skip');
  });

  it('no toca las tablas que la lista de pacientes no cargó', () => {
    expect(shouldSyncPatientCollection(['budget', 'payments'], 'evolutionNotes', [])).toBe('skip');
    expect(shouldSyncPatientCollection(['budget', 'payments'], 'prescriptions', undefined)).toBe('skip');
  });

  it('borra la tabla solo cuando el expediente completo llegó vacío', () => {
    expect(shouldSyncPatientCollection(['payments', 'budget'], 'payments', [])).toBe('replace');
  });

  it('actualiza cuando la colección cargada tiene filas', () => {
    expect(shouldSyncPatientCollection(['payments'], 'payments', [{ id: 'p1' }])).toBe('upsert');
  });
});
