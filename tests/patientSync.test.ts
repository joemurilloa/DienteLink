import { describe, expect, it } from 'vitest';
import { legacyExplicitRemovedIds, shouldSyncPatientCollection } from '../lib/patientSync';

describe('shouldSyncPatientCollection', () => {
  it('no borra nada en un alta nueva, que no trae colecciones cargadas', () => {
    expect(shouldSyncPatientCollection(undefined, 'payments', [])).toBe('skip');
    expect(shouldSyncPatientCollection(undefined, 'evolutionNotes', [])).toBe('skip');
  });

  it('no toca las tablas que la lista de pacientes no cargó', () => {
    expect(shouldSyncPatientCollection(['budget', 'payments'], 'evolutionNotes', [])).toBe('skip');
    expect(shouldSyncPatientCollection(['budget', 'payments'], 'prescriptions', undefined)).toBe('skip');
  });

  it('marca replace cuando el expediente completo llegó vacío, sin borrar la tabla', () => {
    expect(shouldSyncPatientCollection(['payments', 'budget'], 'payments', [])).toBe('replace');
    expect(legacyExplicitRemovedIds(['payments'], 'payments', [], undefined)).toEqual([]);
  });

  it('solo borra ids declarados, aunque la lista traiga menos filas', () => {
    expect(
      legacyExplicitRemovedIds(['payments'], 'payments', [{ id: 'p1' }], ['p2', 'p2', '']),
    ).toEqual(['p2']);
    expect(legacyExplicitRemovedIds(['budget'], 'evolutionNotes', [], ['n1'])).toEqual([]);
  });

  it('actualiza cuando la colección cargada tiene filas', () => {
    expect(shouldSyncPatientCollection(['payments'], 'payments', [{ id: 'p1' }])).toBe('upsert');
  });
});
