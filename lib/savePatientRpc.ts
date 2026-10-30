import { supabase } from './supabase';
import type { PatientCollection, PatientRecord } from '../types';
import { shouldSyncPatientCollection } from './patientSync';
import {
  isRpcSoftDeleted,
  isRpcVersionConflict,
  rpcErrorCode,
  rpcErrorMessage,
} from './rpcErrors';
import { recordRpcSqlState } from './rpcMetrics';

export type SavePatientRpcResult = {
  patient_id: string;
  version: number;
  written: string[];
  skipped: string[];
  removed: number;
  ignored: number;
};

type IdRow = { id?: string };

/** Solo activar en staging / tras smoke. Prod sin migración = no. */
export function isSavePatientRpcEnabled(): boolean {
  return import.meta.env.VITE_USE_SAVE_PATIENT_RPC === 'true';
}

/** Acumula un borrado explícito de UI (no derivar de cache). */
export function markCollectionRemoved(
  patient: PatientRecord,
  key: PatientCollection,
  id: string,
): PatientRecord {
  const prev = patient.pendingRemovedIds?.[key] ?? [];
  if (prev.includes(id)) return patient;
  return {
    ...patient,
    pendingRemovedIds: {
      ...patient.pendingRemovedIds,
      [key]: [...prev, id],
    },
  };
}

/** Quita el item de items y registra removedId (nunca solapa items∩removedIds). */
export function removeCollectionItem(
  patient: PatientRecord,
  key: PatientCollection,
  id: string,
): PatientRecord {
  const marked = markCollectionRemoved(patient, key, id);
  switch (key) {
    case 'evolutionNotes':
      return { ...marked, evolutionNotes: marked.evolutionNotes.filter((x) => x.id !== id) };
    case 'history':
      return { ...marked, history: marked.history.filter((x) => x.id !== id) };
    case 'budget':
      return { ...marked, budget: marked.budget.filter((x) => x.id !== id) };
    case 'payments':
      return { ...marked, payments: (marked.payments ?? []).filter((x) => x.id !== id) };
    case 'consents':
      return { ...marked, consents: marked.consents.filter((x) => x.id !== id) };
    case 'prescriptions':
      return { ...marked, prescriptions: marked.prescriptions.filter((x) => x.id !== id) };
    case 'labWorks':
      return { ...marked, labWorks: (marked.labWorks ?? []).filter((x) => x.id !== id) };
  }
}

/** Tras save OK: quita solo los removedIds que se enviaron; conserva los añadidos en vuelo. */
export function remainingPendingRemovedIds(
  pending: PatientRecord['pendingRemovedIds'],
  sent: Partial<Record<PatientCollection, string[]>> | undefined,
): PatientRecord['pendingRemovedIds'] | undefined {
  if (!pending) return undefined;
  const out: Partial<Record<PatientCollection, string[]>> = {};
  (Object.keys(pending) as PatientCollection[]).forEach((key) => {
    const sentSet = new Set(sent?.[key] ?? []);
    const left = (pending[key] ?? []).filter((id) => !sentSet.has(id));
    if (left.length > 0) out[key] = left;
  });
  return Object.keys(out).length > 0 ? out : undefined;
}

export function extractSentRemovedIds(
  payload: Record<string, unknown>,
): Partial<Record<PatientCollection, string[]>> {
  const cols = payload.collections as
    | Partial<Record<PatientCollection, { removedIds?: string[] }>>
    | undefined;
  if (!cols) return {};
  const out: Partial<Record<PatientCollection, string[]>> = {};
  for (const [k, v] of Object.entries(cols)) {
    if (v?.removedIds?.length) out[k as PatientCollection] = [...v.removedIds];
  }
  return out;
}

function collectionItems(p: PatientRecord, key: PatientCollection): IdRow[] | undefined {
  switch (key) {
    case 'evolutionNotes':
      return p.evolutionNotes;
    case 'history':
      return p.history;
    case 'budget':
      return p.budget;
    case 'payments':
      return p.payments;
    case 'consents':
      return p.consents;
    case 'prescriptions':
      return p.prescriptions;
    case 'labWorks':
      return p.labWorks;
  }
}

/** null/undefined → omitir clave. "" se conserva (limpia en SQL). */
export function omitNullFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function stableJson(v: unknown): string {
  return JSON.stringify(v ?? null);
}

function identityDirtyFields(
  next: PatientRecord['identification'],
  prev: PatientRecord['identification'] | undefined,
): Record<string, unknown> {
  const cleaned = omitNullFields({ ...next } as unknown as Record<string, unknown>);
  if (!prev) return cleaned;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cleaned)) {
    const pv = (prev as Record<string, unknown>)[k];
    if (stableJson(v) !== stableJson(pv ?? '')) out[k] = v;
  }
  return out;
}

function clinicalDirtyFields(
  next: PatientRecord['clinicalHistory'],
  prev: PatientRecord['clinicalHistory'] | undefined,
): Record<string, unknown> | undefined {
  const cleaned = omitNullFields({ ...next } as unknown as Record<string, unknown>);
  if (!prev) return cleaned;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cleaned)) {
    const pv = (prev as Record<string, unknown>)[k];
    if (stableJson(v) !== stableJson(pv ?? (typeof v === 'boolean' ? false : typeof v === 'object' ? [] : ''))) {
      out[k] = v;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Colección solo si:
 * - rol permite,
 * - estaba en loadedCollections (o alta con items),
 * - dirty (items ≠ previous) o hay pendingRemovedIds.
 * removedIds = solo pendingRemovedIds (nunca diff de cache).
 */
function collectionBlock(
  key: PatientCollection,
  previous: PatientRecord | undefined,
  next: PatientRecord,
  items: IdRow[] | null | undefined,
): { items: unknown[]; removedIds: string[] } | undefined {
  const mode = shouldSyncPatientCollection(next.loadedCollections, key, items);
  const removedIds = [...new Set(next.pendingRemovedIds?.[key] ?? [])];
  const nextItems = items ?? [];
  const isCreate = previous == null;

  // Sin colección cargada: no borrar por diff. En alta, sí enviar items nuevos.
  if (mode === 'skip') {
    if (isCreate && nextItems.length > 0) {
      return { items: nextItems, removedIds: [] };
    }
    return undefined;
  }

  const prevItems = previous ? collectionItems(previous, key) : undefined;
  const itemsChanged = stableJson(nextItems) !== stableJson(prevItems ?? []);
  if (!itemsChanged && removedIds.length === 0) return undefined;

  // replace (items []) solo borra lo declarado en pendingRemovedIds — nunca “todos los de cache”
  return { items: nextItems, removedIds };
}

export function buildSavePatientPayload(
  next: PatientRecord,
  previous: PatientRecord | undefined,
  opts: { includeClinical: boolean; includeMoney: boolean },
): Record<string, unknown> {
  const isCreate = previous == null && next.version == null;
  const payload: Record<string, unknown> = { id: next.id };

  const ident = identityDirtyFields(next.identification, previous?.identification);
  if (isCreate || Object.keys(ident).length > 0) {
    if (isCreate && !('fullName' in ident)) {
      payload.identification = omitNullFields({
        ...next.identification,
      } as unknown as Record<string, unknown>);
    } else {
      payload.identification = ident;
    }
  }

  if (
    previous == null ||
    stableJson(next.consentSigned) !== stableJson(previous.consentSigned)
  ) {
    payload.consentSigned = next.consentSigned;
  }

  if (opts.includeClinical) {
    const ch = clinicalDirtyFields(next.clinicalHistory, previous?.clinicalHistory);
    if (ch) payload.clinicalHistory = ch;

    if (
      isCreate ||
      stableJson(next.odontogram) !== stableJson(previous?.odontogram)
    ) {
      payload.odontogram = next.odontogram;
    }
    if (
      isCreate ||
      stableJson(next.odontogramHistory ?? []) !== stableJson(previous?.odontogramHistory ?? [])
    ) {
      payload.odontogramHistory = next.odontogramHistory ?? [];
    }
    if (
      isCreate ||
      stableJson(next.periodontogram) !== stableJson(previous?.periodontogram)
    ) {
      payload.periodontogram = next.periodontogram;
    }
  }

  const collections: Record<string, unknown> = {};
  const keys: {
    key: PatientCollection;
    items: IdRow[] | null | undefined;
    allowed: boolean;
  }[] = [
    { key: 'evolutionNotes', items: next.evolutionNotes, allowed: opts.includeClinical },
    { key: 'history', items: next.history, allowed: opts.includeClinical },
    { key: 'consents', items: next.consents, allowed: opts.includeClinical },
    { key: 'prescriptions', items: next.prescriptions, allowed: opts.includeClinical },
    { key: 'budget', items: next.budget, allowed: opts.includeMoney },
    { key: 'payments', items: next.payments, allowed: opts.includeMoney },
    { key: 'labWorks', items: next.labWorks, allowed: true },
  ];

  for (const { key, items, allowed } of keys) {
    if (!allowed) continue;
    const block = collectionBlock(key, previous, next, items);
    if (!block) continue;
    collections[key] = block;
  }

  if (Object.keys(collections).length > 0) {
    payload.collections = collections;
  }

  return payload;
}

const saveQueues = new Map<string, Promise<unknown>>();

function enqueueByPatientId<T>(patientId: string, task: () => Promise<T>): Promise<T> {
  const prev = saveQueues.get(patientId) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(task);
  saveQueues.set(
    patientId,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
}

export class MissingPatientVersionError extends Error {
  constructor() {
    super('Falta version del paciente; recarga el expediente antes de guardar.');
    this.name = 'MissingPatientVersionError';
  }
}

/**
 * Alta: sin previous y sin version → p_expected_version null.
 * Update: exige version numérica; ante DL412 no reintenta (caller avisa + invalidate).
 */
export async function savePatientViaRpc(
  next: PatientRecord,
  previous: PatientRecord | undefined,
  opts: { includeClinical: boolean; includeMoney: boolean },
): Promise<{ patient: PatientRecord; result: SavePatientRpcResult }> {
  return enqueueByPatientId(next.id, async () => {
    const serverVersion = previous?.version ?? next.version;
    const forCreate = previous == null && next.version == null;

    if (!forCreate && typeof serverVersion !== 'number') {
      throw new MissingPatientVersionError();
    }

    const payload = buildSavePatientPayload(next, previous, opts);

    const { data, error } = await supabase.rpc('save_patient', {
      p_patient: payload,
      p_expected_version: forCreate ? null : serverVersion,
    });

    if (error) {
      const code = rpcErrorCode(error) ?? (error as { code?: string }).code;
      recordRpcSqlState(code);
      if (isRpcVersionConflict(error)) {
        throw Object.assign(
          new Error(
            'Conflicto de versión: recarga el expediente. Los borrados pendientes no se aplicaron.',
          ),
          { cause: error, code: 'DL412' },
        );
      }
      if (isRpcSoftDeleted(error)) {
        throw Object.assign(new Error('Este expediente fue eliminado.'), {
          cause: error,
          code: 'DL413',
        });
      }
      throw Object.assign(new Error(rpcErrorMessage(error) || 'Error al guardar paciente'), {
        cause: error,
        code,
      });
    }

    const result = data as SavePatientRpcResult;
    const sentRemoved = extractSentRemovedIds(payload);
    return {
      patient: {
        ...next,
        version: result.version,
        pendingRemovedIds: remainingPendingRemovedIds(next.pendingRemovedIds, sentRemoved),
        updatedAt: new Date().toISOString(),
      },
      result,
    };
  });
}

/** Alta de un pago vía RPC (sube version). */
export async function addPaymentViaRpc(
  patient: PatientRecord,
  payment: NonNullable<PatientRecord['payments']>[number],
  opts: { includeMoney: boolean },
): Promise<{ patient: PatientRecord; result: SavePatientRpcResult }> {
  if (!opts.includeMoney) {
    throw Object.assign(new Error('FORBIDDEN: no puedes registrar pagos'), { code: 'DL403' });
  }
  if (typeof patient.version !== 'number') {
    throw new MissingPatientVersionError();
  }

  const next: PatientRecord = {
    ...patient,
    payments: [...(patient.payments ?? []), payment],
    loadedCollections: Array.from(
      new Set<PatientCollection>([...(patient.loadedCollections ?? []), 'payments']),
    ),
  };

  return savePatientViaRpc(next, patient, {
    includeClinical: false,
    includeMoney: true,
  });
}
