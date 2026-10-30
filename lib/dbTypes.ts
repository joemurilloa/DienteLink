/**
 * dbTypes.ts — TypeScript interfaces for raw Supabase database rows.
 *
 * patients guarda identidad + motivo/consentimiento.
 * El expediente clínico vive en patient_clinical (RLS por rol).
 */

export interface DbPatientClinicalRow {
  patient_id: string;
  doctor_id: string;
  allergies: string[] | null;
  medications: string | null;
  previous_diseases: string | null;
  family_history: string | null;
  blood_type: string | null;
  smoker: boolean | null;
  pregnant: boolean | null;
  habits: string | null;
  observations: string | null;
  odontogram: unknown;
  odontogram_history: unknown;
  periodontogram: unknown;
  updated_at?: string;
}

export interface DbPatientRow {
  id: string;
  doctor_id: string;
  full_name: string;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  occupation: string | null;
  motive_of_consult: string | null;
  consent_signed: boolean | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version?: number;
  /** Embed 1:1; null si el rol no puede leer el expediente. */
  patient_clinical?: DbPatientClinicalRow | DbPatientClinicalRow[] | null;
  /** Campos clínicos aplanados (tras mergePatientClinical). */
  allergies?: string[] | null;
  medications?: string | null;
  previous_diseases?: string | null;
  family_history?: string | null;
  blood_type?: string | null;
  smoker?: boolean | null;
  pregnant?: boolean | null;
  habits?: string | null;
  observations?: string | null;
  odontogram?: unknown;
  odontogram_history?: unknown;
  periodontogram?: unknown;
}

export function mergePatientClinical<T extends DbPatientRow>(p: T): T {
  const raw = p.patient_clinical;
  const clinical = Array.isArray(raw) ? raw[0] : raw;
  if (!clinical) {
    return {
      ...p,
      allergies: p.allergies ?? [],
      medications: p.medications ?? '',
      previous_diseases: p.previous_diseases ?? '',
      family_history: p.family_history ?? '',
      blood_type: p.blood_type ?? null,
      smoker: p.smoker ?? false,
      pregnant: p.pregnant ?? false,
      habits: p.habits ?? null,
      observations: p.observations ?? null,
      odontogram: p.odontogram ?? [],
      odontogram_history: p.odontogram_history ?? [],
      periodontogram: p.periodontogram ?? null,
    };
  }
  return {
    ...p,
    allergies: clinical.allergies,
    medications: clinical.medications,
    previous_diseases: clinical.previous_diseases,
    family_history: clinical.family_history,
    blood_type: clinical.blood_type,
    smoker: clinical.smoker,
    pregnant: clinical.pregnant,
    habits: clinical.habits,
    observations: clinical.observations,
    odontogram: clinical.odontogram,
    odontogram_history: clinical.odontogram_history,
    periodontogram: clinical.periodontogram,
  };
}

export interface DbEvolutionNoteRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  content: string;
  procedure: string | null;
}

export interface DbClinicalEventRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  type: string;
  description: string;
  tooth_id: number | null;
}

export interface DbBudgetItemRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  treatment: string;
  tooth_id: number | null;
  unit_cost: number;
  quantity: number;
  status: string;
  created_at: string;
}

export interface DbPaymentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  amount: number;
  method: string;
  note: string | null;
  date: string;
}

export interface DbConsentFormRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  content: string;
  signature_data: string;
  signed_at: string;
  witness_name: string | null;
}

export interface DbPrescriptionRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  diagnosis: string;
  medications: unknown;
  notes: string | null;
}

export interface DbLabWorkRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  description: string;
  lab_name: string;
  sent_date: string;
  expected_date: string | null;
  cost: number;
  status: string;
  created_at: string;
}
