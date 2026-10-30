import { supabase } from './supabase';
import type { PatientCollection, PatientRecord } from '../types';
import { shouldSyncPatientCollection } from './patientSync';
import { PatientIdentificationSchema } from './schemas';

/**
 * Camino viejo (N upserts). Riesgo conocido: [] + loadedCollections = wipe.
 * Activo solo con VITE_USE_SAVE_PATIENT_RPC !== 'true'.
 *
 * Retiro (verificable):
 * 1) Reloj de 14 días: empieza solo tras smoke limpio en desechable (no desde
 *    hoy). Luego encender flag en prod en ≤14 días; si no, issue de riesgo wipe.
 * 2) Flag on ≥7 días en prod + DL* en sitio centralizado (Sentry / rpc_events),
 *    NO sessionStorage. rpcMetrics.ts es solo depuración local.
 * 3) REVOKE writes directos aplicado.
 * Entonces borrar este módulo y el branch del flag.
 */
export async function savePatientLegacy(
  patient: PatientRecord,
  opts: {
    clinicId: string;
    canSeeMoney: boolean;
    canViewChart: boolean;
  },
): Promise<PatientRecord> {
  const { clinicId, canSeeMoney, canViewChart } = opts;
  const doctorId = clinicId;

  const idValidation = PatientIdentificationSchema.safeParse(patient.identification);
  if (!idValidation.success) {
    const firstIssue = idValidation.error.issues[0];
    throw new Error(`Datos inválidos: ${firstIssue.message} (campo: ${firstIssue.path.join('.')})`);
  }

  const validId = idValidation.data;
  const identityRow = {
    id: patient.id,
    doctor_id: doctorId,
    full_name: validId.fullName,
    birth_date: validId.birthDate || null,
    gender: validId.gender || null,
    address: validId.address || null,
    phone: validId.phone || null,
    email: validId.email || null,
    occupation: validId.occupation || null,
    motive_of_consult: patient.clinicalHistory.motiveOfConsult || null,
    consent_signed: patient.consentSigned,
    updated_at: patient.updatedAt || new Date().toISOString(),
  };

  const { error: pErr } = await supabase.from('patients').upsert(identityRow, { onConflict: 'id' });
  if (pErr) throw new Error(`Error en paciente: ${pErr.message}`);

  if (canViewChart) {
    const { error: cErr } = await supabase.from('patient_clinical').upsert(
      {
        patient_id: patient.id,
        doctor_id: doctorId,
        allergies: patient.clinicalHistory.allergies,
        medications: patient.clinicalHistory.medications || null,
        previous_diseases: patient.clinicalHistory.previousDiseases || null,
        family_history: patient.clinicalHistory.familyHistory || null,
        blood_type: patient.clinicalHistory.bloodType || null,
        smoker: patient.clinicalHistory.smoker ?? false,
        pregnant: patient.clinicalHistory.pregnant ?? false,
        habits: patient.clinicalHistory.habits || null,
        observations: patient.clinicalHistory.observations || null,
        odontogram: patient.odontogram,
        odontogram_history: patient.odontogramHistory || [],
        periodontogram: patient.periodontogram,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id' },
    );
    if (cErr) throw new Error(`Error en expediente clínico: ${cErr.message}`);
  }

  const syncSubTable = async <T extends { id?: string }, R extends Record<string, unknown>>(
    tableName: string,
    key: PatientCollection,
    items: T[] | null | undefined,
    mapFn: (i: T) => R,
  ) => {
    if ((key === 'payments' || key === 'budget') && !canSeeMoney) return;
    if (
      (key === 'evolutionNotes' ||
        key === 'history' ||
        key === 'consents' ||
        key === 'prescriptions' ||
        key === 'labWorks') &&
      !canViewChart
    ) {
      return;
    }
    const mode = shouldSyncPatientCollection(patient.loadedCollections, key, items);
    if (mode === 'skip') return;

    if (mode === 'replace') {
      const { error: delErr } = await supabase
        .from(tableName)
        .delete()
        .eq('patient_id', patient.id)
        .eq('doctor_id', doctorId);
      if (delErr) throw delErr;
      return;
    }

    const present = items ?? [];
    const mapped = present.map(mapFn);
    const { error: upsertErr } = await supabase.from(tableName).upsert(mapped, { onConflict: 'id' });
    if (upsertErr) throw upsertErr;

    const currentIds = present
      .map((i) => i.id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    if (currentIds.length > 0) {
      const { error: delErr } = await supabase
        .from(tableName)
        .delete()
        .eq('patient_id', patient.id)
        .eq('doctor_id', doctorId)
        .not('id', 'in', `(${currentIds.join(',')})`);
      if (delErr) throw delErr;
    }
  };

  await Promise.all([
    syncSubTable('evolution_notes', 'evolutionNotes', patient.evolutionNotes, (n) => ({
      id: n.id,
      patient_id: patient.id,
      doctor_id: doctorId,
      date: n.date,
      content: n.content,
      procedure: n.procedure,
    })),
    syncSubTable('clinical_events', 'history', patient.history, (e) => ({
      id: e.id,
      patient_id: patient.id,
      doctor_id: doctorId,
      date: e.date,
      type: e.type,
      description: e.description,
      tooth_id: e.toothId || null,
    })),
    syncSubTable('budget_items', 'budget', patient.budget, (b) => ({
      id: b.id,
      patient_id: patient.id,
      doctor_id: doctorId,
      treatment: b.treatment,
      tooth_id: b.toothId || null,
      unit_cost: b.unitCost,
      quantity: b.quantity,
      status: b.status,
      created_at: b.createdAt,
    })),
    syncSubTable('payments', 'payments', patient.payments, (p) => ({
      id: p.id,
      patient_id: patient.id,
      doctor_id: doctorId,
      amount: p.amount,
      method: p.method,
      note: p.note,
      date: p.date,
    })),
    syncSubTable('consent_forms', 'consents', patient.consents, (c) => ({
      id: c.id,
      patient_id: patient.id,
      doctor_id: doctorId,
      title: c.title,
      content: c.content,
      signature_data: c.signatureData,
      signed_at: c.signedAt,
      witness_name: c.witnessName || null,
    })),
    syncSubTable('prescriptions', 'prescriptions', patient.prescriptions, (rx) => ({
      id: rx.id,
      patient_id: patient.id,
      doctor_id: doctorId,
      date: rx.date,
      diagnosis: rx.diagnosis,
      medications: rx.medications,
      notes: rx.notes,
    })),
    syncSubTable('lab_works', 'labWorks', patient.labWorks, (l) => ({
      id: l.id,
      patient_id: patient.id,
      doctor_id: doctorId,
      description: l.description,
      lab_name: l.labName,
      sent_date: l.sentDate,
      expected_date: l.expectedDate || null,
      cost: l.cost,
      status: l.status,
      created_at: l.createdAt,
    })),
  ]);

  return patient;
}
