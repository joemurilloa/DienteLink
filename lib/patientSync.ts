import type { PatientCollection } from '../types';

export type SubtableSync = 'skip' | 'replace' | 'upsert';

/**
 * Un array vacío solo reemplaza la tabla si esa colección vino en la lectura.
 * Un alta nueva no trae `loadedCollections`: no hay filas que borrar.
 * La lista de pacientes no carga notas ni recetas: guardar esa ficha no las toca.
 */
export function shouldSyncPatientCollection(
  loaded: readonly string[] | undefined,
  key: PatientCollection,
  items: readonly unknown[] | null | undefined,
): SubtableSync {
  if (!loaded?.includes(key)) return 'skip';
  if (!items || items.length === 0) return 'replace';
  return 'upsert';
}
