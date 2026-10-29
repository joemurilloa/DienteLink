/**
 * dbTypes.ts — TypeScript interfaces for raw Supabase database rows.
 *
 * These types describe the shape of data as it comes directly from
 * the Supabase PostgREST API — before it is transformed into the
 * domain types defined in types.ts.
 *
 * Having explicit DB row types eliminates the `any` usage in dbToPatient()
 * and all related mapping functions, giving us compile-time safety when
 * the schema changes.
 */

// ---------------------------------------------------------------------------
// patients table
// ---------------------------------------------------------------------------

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
  allergies: string[] | null;
  medications: string | null;
  previous_diseases: string | null;
  family_history: string | null;
  motive_of_consult: string | null;
  blood_type: string | null;
  smoker: boolean | null;
  pregnant: boolean | null;
  habits: string | null;
  observations: string | null;
  consent_signed: boolean | null;
  odontogram: unknown;       // validated via ensureOdontogram()
  odontogram_history: unknown;
  periodontogram: unknown;   // validated via ensurePeriodontogramData()
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ---------------------------------------------------------------------------
// evolution_notes table
// ---------------------------------------------------------------------------

export interface DbEvolutionNoteRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  content: string;
  procedure: string | null;
}

// ---------------------------------------------------------------------------
// clinical_events table
// ---------------------------------------------------------------------------

export interface DbClinicalEventRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  type: string;
  description: string;
  tooth_id: number | null;
}

// ---------------------------------------------------------------------------
// budget_items table
// ---------------------------------------------------------------------------

export interface DbBudgetItemRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  treatment: string;
  tooth_id: number | null;
  unit_cost: number;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
}

// ---------------------------------------------------------------------------
// payments table
// ---------------------------------------------------------------------------

export interface DbPaymentRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  amount: number;
  method: string;
  note: string | null;
  date: string;
}

// ---------------------------------------------------------------------------
// consent_forms table
// ---------------------------------------------------------------------------

export interface DbConsentFormRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  title: string;
  content: string;
  signature_data: string | null;
  signed_at: string | null;
  witness_name: string | null;
}

// ---------------------------------------------------------------------------
// prescriptions table
// ---------------------------------------------------------------------------

export interface DbPrescriptionRow {
  id: string;
  patient_id: string;
  doctor_id: string;
  date: string;
  diagnosis: string | null;
  medications: unknown[];  // JSON array — validated at read time
  notes: string | null;
}

// ---------------------------------------------------------------------------
// lab_works table
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// appointments table
// ---------------------------------------------------------------------------

export interface DbAppointmentRow {
  id: string;
  doctor_id: string;
  patient_id: string | null;
  patient_name: string;
  phone_number: string | null;
  time: string;
  date: string;
  type: string;
  status: string;
  reminder_status: string | null;
  reminder_scheduled_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// price_catalogs table
// ---------------------------------------------------------------------------

export interface DbPriceCatalogRow {
  doctor_id: string;
  items: unknown;
  updated_at: string;
}
