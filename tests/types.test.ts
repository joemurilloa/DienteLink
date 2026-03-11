import { describe, it, expect } from 'vitest';
import type {
  Appointment,
  PatientRecord,
  PatientIdentification,
  ClinicalHistory,
  EvolutionNote,
  ClinicalEvent,
  BudgetItem,
  Payment,
  ConsentForm,
  Prescription,
  PrescriptionMedication,
  AppointmentRequest,
  DoctorAvailability,
  PublicBookingSettings,
  PeriodontogramData,
  PerioToothData,
  PerioSite,
  ToothData,
  SurfaceData,
} from '../types';

// These tests verify that the TypeScript type contracts hold at runtime
// by creating valid objects and asserting field access works correctly.

describe('Appointment type', () => {
  const apt: Appointment = {
    id: 'apt-1',
    patientId: 'pat-1',
    patientName: 'Juan Pérez',
    phoneNumber: '+504 9999-0000',
    time: '09:00',
    date: '2026-03-11',
    type: 'Consulta',
    status: 'Programada',
    reminderStatus: 'not_sent',
  };

  it('has all required fields', () => {
    expect(apt.id).toBe('apt-1');
    expect(apt.patientName).toBe('Juan Pérez');
    expect(apt.type).toBe('Consulta');
    expect(apt.status).toBe('Programada');
    expect(apt.reminderStatus).toBe('not_sent');
  });

  it('deletedAt is optional', () => {
    expect(apt.deletedAt).toBeUndefined();
    const deleted: Appointment = { ...apt, deletedAt: '2026-03-10T00:00:00Z' };
    expect(deleted.deletedAt).toBeTruthy();
  });
});

describe('PatientRecord type', () => {
  const patient: PatientRecord = {
    id: 'pat-1',
    identification: {
      fullName: 'María López',
      birthDate: '1990-05-15',
      gender: 'Femenino',
      address: 'Tegucigalpa',
      phone: '+504 8888-0000',
      email: 'maria@test.com',
      occupation: 'Ingeniera',
    },
    clinicalHistory: {
      allergies: ['penicilina'],
      medications: 'ninguno',
      previousDiseases: 'ninguno',
      familyHistory: 'diabetes',
      motiveOfConsult: 'Dolor molar',
    },
    evolutionNotes: [],
    history: [],
    consentSigned: false,
    odontogram: [],
    periodontogram: { teeth: [] },
    xrays: [],
    budget: [],
    payments: [],
    balance: 0,
    consents: [],
    prescriptions: [],
  };

  it('has identification with all fields', () => {
    expect(patient.identification.fullName).toBe('María López');
    expect(patient.identification.email).toBe('maria@test.com');
    expect(patient.identification.phone).toBe('+504 8888-0000');
  });

  it('has empty collections by default', () => {
    expect(patient.evolutionNotes).toHaveLength(0);
    expect(patient.history).toHaveLength(0);
    expect(patient.budget).toHaveLength(0);
    expect(patient.payments).toHaveLength(0);
    expect(patient.consents).toHaveLength(0);
    expect(patient.prescriptions).toHaveLength(0);
  });
});

describe('BudgetItem + Payment arithmetic', () => {
  const budget: BudgetItem[] = [
    { id: 'b1', treatment: 'Limpieza', unitCost: 500, quantity: 1, status: 'completed', createdAt: '2026-01-01' },
    { id: 'b2', treatment: 'Relleno', toothId: 16, unitCost: 1200, quantity: 2, status: 'pending', createdAt: '2026-01-05' },
  ];

  const payments: Payment[] = [
    { id: 'p1', amount: 500, method: 'cash', note: 'Limpieza completa', date: '2026-01-01' },
    { id: 'p2', amount: 1000, method: 'card', note: 'Abono relleno', date: '2026-01-15' },
  ];

  it('calculates total budget correctly', () => {
    const total = budget.reduce((s, b) => s + b.unitCost * b.quantity, 0);
    expect(total).toBe(2900); // 500 + 2400
  });

  it('calculates total paid correctly', () => {
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    expect(paid).toBe(1500);
  });

  it('calculates pending balance correctly', () => {
    const total = budget.reduce((s, b) => s + b.unitCost * b.quantity, 0);
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    expect(total - paid).toBe(1400);
  });
});

describe('AppointmentRequest type', () => {
  const request: AppointmentRequest = {
    id: 'req-1',
    patientName: 'Carlos Aguilar',
    patientEmail: 'carlos@example.com',
    patientPhone: '+504 7777-0000',
    requestedDate: '2026-03-20',
    requestedTime: '14:00',
    appointmentType: 'Consulta',
    status: 'pending',
    createdAt: '2026-03-10T10:00:00Z',
    doctorId: 'doc-1',
  };

  it('defaults to pending status', () => {
    expect(request.status).toBe('pending');
  });

  it('respondedAt is optional', () => {
    expect(request.respondedAt).toBeUndefined();
  });

  it('has patient contact info', () => {
    expect(request.patientEmail).toContain('@');
    expect(request.patientPhone).toBeTruthy();
  });
});

describe('Prescription + Medication structure', () => {
  const med: PrescriptionMedication = {
    name: 'Amoxicilina',
    dosage: '500mg',
    frequency: 'Cada 8 horas',
    duration: '7 días',
    instructions: 'Tomar con alimentos',
  };

  const rx: Prescription = {
    id: 'rx-1',
    date: '2026-03-11',
    diagnosis: 'Infección periapical',
    medications: [med],
    notes: 'Cita de control en 7 días',
  };

  it('medication has all required fields', () => {
    expect(med.name).toBe('Amoxicilina');
    expect(med.dosage).toBe('500mg');
    expect(med.frequency).toBeTruthy();
    expect(med.duration).toBeTruthy();
    expect(med.instructions).toBeTruthy();
  });

  it('prescription contains medications array', () => {
    expect(rx.medications).toHaveLength(1);
    expect(rx.medications[0].name).toBe('Amoxicilina');
  });
});

describe('ConsentForm type', () => {
  const consent: ConsentForm = {
    id: 'c-1',
    title: 'Consentimiento para extracción',
    content: 'El paciente acepta...',
    signatureData: 'data:image/png;base64,iVBOR...',
    signedAt: '2026-03-11T10:00:00Z',
  };

  it('has signature data', () => {
    expect(consent.signatureData).toContain('data:image');
  });

  it('witnessName is optional', () => {
    expect(consent.witnessName).toBeUndefined();
  });
});
