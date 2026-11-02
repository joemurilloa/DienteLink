import type { PatientCollection } from '../types';

export type SubtableSync = 'skip' | 'replace' | 'upsert';

/**
 * `replace` significa “la colección se cargó y ahora está vacía”.
 * Eso no autoriza a borrar la tabla: los deletes salen solo de pendingRemovedIds.
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

/**
 * Borrados del camino legacy.
 * Solo ids que la UI declaró en pendingRemovedIds.
 * Una colección vacía no vacía la tabla. Una lista parcial no borra lo que no trajo.
 */
export function legacyExplicitRemovedIds(
  loaded: readonly string[] | undefined,
  key: PatientCollection,
  items: readonly unknown[] | null | undefined,
  pendingRemoved: readonly string[] | undefined,
): string[] {
  if (shouldSyncPatientCollection(loaded, key, items) === 'skip') return [];
  return [...new Set((pendingRemoved ?? []).filter((id) => typeof id === 'string' && id.length > 0))];
}
