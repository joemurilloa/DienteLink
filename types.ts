
import React from 'react';

export type ReminderStatus = 'not_sent' | 'sending' | 'sent' | 'error';
export type ToothStatus = 'healthy' | 'caries' | 'missing' | 'treated';

export interface ToothData {
  id: number;
  status: ToothStatus;
}

export type AppointmentType = 'Consulta' | 'Seguimiento' | 'Cirugía' | 'Revisión';
export type AppointmentStatus = 'Programada' | 'Completada' | 'Retrasada';

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
  patientImage?: string;
}

export interface Stats {
  monthlyIncome: number;
  incomeTrend: number;
  totalPatients: number;
  todayAppointments: number;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

export interface Treatment {
  id: string;
  name: string;
  price: number;
  color: string;
  description: string;
}

export interface BudgetItem {
  toothId: number;
  treatment: Treatment;
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
  cost: number;
}

export interface PatientRecord {
  id: string;
  identification: PatientIdentification;
  clinicalHistory: ClinicalHistory;
  evolutionNotes: EvolutionNote[];
  history: ClinicalEvent[]; // Historial cronológico completo
  consentSigned: boolean;
  odontogram: ToothData[];
  periodontogram: number[]; // Profundidades de sondaje (mm)
  budget: BudgetItem[];
  xrays: string[];
  balance: number; // Saldo pendiente o total invertido
}
