
import React from 'react';
import { 
  ReminderStatus as ReminderStatusType,
  AppointmentType as AppointmentTypeType,
  AppointmentStatus as AppointmentStatusType,
  PaymentMethod as PaymentMethodType,
  BudgetItemStatus as BudgetItemStatusType,
  RequestStatus as RequestStatusType,
  ToothSurface as ToothSurfaceType,
  ClinicalCondition as ClinicalConditionType,
  EventType as EventTypeType
} from './lib/constants';

export type ReminderStatus = ReminderStatusType;
export type UserRole = 'admin' | 'assistant' | 'receptionist' | 'owner' | 'doctor' | 'dr' | 'odontologo' | 'odontólogo';

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
export type ToothSurface = 'oclusal' | 'incisal' | 'vestibular' | 'lingual' | 'mesial' | 'distal';

export type ClinicalCondition =
  // Estado
  | 'healthy'
  | 'caries'
  | 'obturado'
  | 'fractura'
  // Tratamiento indicado
  | 'extraccion_indicada'
  | 'tratamiento_conducto'
  | 'corona_indicada'
  | 'protesis_implante'
  // Estado especial
  | 'ausente'
  | 'implante_presente'
  | 'corona_presente'
  | 'en_observacion';

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

export type AppointmentType = 'Consulta' | 'Seguimiento' | 'Cirugía' | 'Revisión';
export type AppointmentStatus = 'Programada' | 'Completada' | 'Retrasada' | 'Eliminada';

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
