
import React from 'react';

// Import from lib/constants so the names are available within this file
// for use in interface definitions (SurfaceData, Appointment, etc.)
import {
  ReminderStatus,
  AppointmentType,
  AppointmentStatus,
  PaymentMethod,
  BudgetItemStatus,
  RequestStatus,
  ToothSurface,
  ClinicalCondition,
  EventType,
} from './lib/constants';

// Re-export as the public API — single source of truth (no duplicate definitions)
export type {
  ReminderStatus,
  AppointmentType,
  AppointmentStatus,
  PaymentMethod,
  BudgetItemStatus,
  RequestStatus,
  ToothSurface,
  ClinicalCondition,
  EventType,
};

export type UserRole = 'owner' | 'admin' | 'assistant' | 'receptionist';

export interface TeamInvitation {
  id: string;
  clinic_id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted';
  created_at: string;
}

// Legacy type kept for migration
export type ToothStatus = 'healthy' | 'caries' | 'missing' | 'treated';

// --- Odontograma Clínico Completo ---
// ToothSurface and ClinicalCondition are re-exported from lib/constants above.
// The interface and struct types below build on top of those.

export interface SurfaceData {
  surface: ToothSurface;
  condition: ClinicalCondition;
}

export interface ToothData {
  id: number;
  surfaces: SurfaceData[];
  // Legacy field — migration only
  status?: ToothStatus;
}

export interface OdontogramSnapshot {
  id: string;
  date: string;
  teeth: ToothData[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  phoneNumber: string;
  time: string;
  date: string;
  type: AppointmentType;
  status: AppointmentStatus;
  reminderStatus: ReminderStatus;
  deletedAt?: string;
}

export interface Stats {
  totalPatients: number;
  todayAppointments: number;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}



// --- Nuevas interfaces para Expediente Clínico ---

export interface PatientIdentification {
  fullName: string;
  birthDate: string;
  gender: string;
  address: string;
  phone: string;
  email: string;
  occupation: string;
}

export interface ClinicalHistory {
  allergies: string[];
  medications: string;
  previousDiseases: string;
  familyHistory: string;
  motiveOfConsult: string;
  bloodType?: string;
  smoker?: boolean;
  pregnant?: boolean;
  habits?: string;
  observations?: string;
}

export interface EvolutionNote {
  id: string;
  date: string;
  content: string;
  procedure: string;
}

export interface ClinicalEvent {
  id: string;
  date: string;
  type: 'treatment' | 'extraction' | 'cleaning' | 'diagnose' | 'other';
  description: string;
  toothId?: number;
}

// --- Consentimiento Informado ---

export interface ConsentForm {
  id: string;
  title: string;
  content: string;
  signatureData: string; // base64 canvas image
  signedAt: string;
  witnessName?: string;
}

// --- Recetas Médicas ---

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  date: string;
  diagnosis: string;
  medications: PrescriptionMedication[];
  notes: string;
}

// --- Presupuestos, Pagos y Laboratorio ---

export interface BudgetItem {
  id: string;
  treatment: string;
  toothId?: number;
  unitCost: number;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
}

export interface Payment {
  id: string;
  amount: number;
  method: 'cash' | 'card' | 'transfer' | 'other';
  note: string;
  date: string;
}

export type LabWorkStatus = 'pending' | 'sent' | 'received' | 'completed';

export interface LabWork {
  id: string;
  description: string;
  labName: string;
  sentDate: string;
  expectedDate?: string;
  cost: number;
  status: LabWorkStatus;
  createdAt?: string;
}

// --- Imágenes y Radiografías ---

export interface XRayImage {
  id: string;
  url: string;
  date: string;
  title: string;
  notes?: string;
  createdAt: string;
  storagePath?: string;
}


// --- Periodontograma Clínico ---

export interface PerioSite {
  depth: number;      // Profundidad de sondaje (mm) 0-15
  recession: number;  // Recesión gingival (mm) 0-15
  bleeding: boolean;  // Sangrado al sondaje (BOP)
}

export interface PerioToothData {
  toothId: number;
  buccal: [PerioSite, PerioSite, PerioSite];   // [Mesial, Central, Distal]
  lingual: [PerioSite, PerioSite, PerioSite];   // [Mesial, Central, Distal]
  mobility: 0 | 1 | 2 | 3;
  furcation: 0 | 1 | 2 | 3;
}

export interface PeriodontogramData {
  teeth: PerioToothData[];
}

/** Colecciones del expediente que vinieron de Postgres en esta lectura. */
export type PatientCollection =
  | 'evolutionNotes'
  | 'history'
  | 'budget'
  | 'payments'
  | 'consents'
  | 'prescriptions'
  | 'labWorks';

export interface PatientRecord {
  id: string;
  identification: PatientIdentification;
  clinicalHistory: ClinicalHistory;
  evolutionNotes: EvolutionNote[];
  history: ClinicalEvent[]; // Historial cronológico completo
  consentSigned: boolean;
  odontogram: ToothData[];
  odontogramHistory?: OdontogramSnapshot[];
  periodontogram: PeriodontogramData;
  xrays: XRayImage[];
  budget: BudgetItem[];
  payments?: Payment[];
  labWorks?: LabWork[];
  balance: number;
  consents: ConsentForm[];
  prescriptions: Prescription[];
  /**
   * Solo las tablas que esta lectura trajo de verdad.
   * Un array vacío ahí significa "el usuario las dejó vacías".
   * Si la clave no está, guardar no borra esa tabla.
   */
  loadedCollections?: PatientCollection[];
  /**
   * Borrados explícitos de UI por colección (removedIds del RPC).
   * Nunca inferir solo por diff de cache.
   */
  pendingRemovedIds?: Partial<Record<PatientCollection, string[]>>;
  /** Concurrencia optimista (patients.version). Ausente = alta. */
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

// --- Sistema de Reservas Públicas (Calendly Clone) ---

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "09:30"
}

export interface DayAvailability {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, etc.
  enabled: boolean;
  timeSlots: TimeSlot[];
}

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  weeklySchedule: DayAvailability[];
  slotDuration: number; // minutos (15, 30, 45, 60)
  bufferTime: number;   // tiempo entre citas en minutos
  advanceBookingDays: number; // cuántos días adelante pueden agendar
  lastUpdated: string;
}

export interface AppointmentRequest {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  requestedDate: string;
  requestedTime: string;
  appointmentType: AppointmentType;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  respondedAt?: string;
  doctorId: string;
}

export interface PublicBookingSettings {
  doctorName: string;
  clinicName: string;
  description: string;
  availableTypes: AppointmentType[];
  requirePhone: boolean;
  requireMessage: boolean;
  confirmationMessage: string;
  isActive: boolean;
}
