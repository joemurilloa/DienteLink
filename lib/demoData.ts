/**
 * =====================================================================
 *  DATOS DE DEMOSTRACIÓN — DienteLink
 * =====================================================================
 *  Edita este archivo para personalizar lo que los visitantes ven
 *  cuando usan la app sin iniciar sesión.
 * =====================================================================
 */

import { PatientRecord } from '../types';
import { Appointment } from '../types';
import { DoctorProfile } from '../services/authService';
import { getLocalISODate } from './utils';

// ─── Helpers de fecha ────────────────────────────────────────────────
const today = getLocalISODate(new Date());
const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return getLocalISODate(d);
};

// ─── Perfil de clínica demo ───────────────────────────────────────────
export const DEMO_PROFILE: DoctorProfile = {
  id: 'demo',
  full_name: 'Dr. Alejandro Morales',
  role: 'owner',
  clinic_id: 'demo',
  clinic_name: 'Clínica Dental Morales',
  phone: '+504 9999-0000',
  currency: 'HNL',
  locale: 'es-HN',
  theme_color: 'blue',
  has_completed_onboarding: true,
};

// ─── Citas demo ───────────────────────────────────────────────────────
export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'demo-apt-1',
    patientId: 'demo-patient-1',
    patientName: 'María Fernández',
    phoneNumber: '+504 9876-5432',
    time: '08:30',
    date: today,
    type: 'Consulta',
    status: 'Programada',
    reminderStatus: 'sent',
  },
  {
    id: 'demo-apt-2',
    patientId: 'demo-patient-2',
    patientName: 'Carlos Rodríguez',
    phoneNumber: '+504 9555-1234',
    time: '10:00',
    date: today,
    type: 'Cirugía',
    status: 'Completada',
    reminderStatus: 'sent',
  },
  {
    id: 'demo-apt-3',
    patientId: 'demo-patient-3',
    patientName: 'Laura Sánchez',
    phoneNumber: '+504 9321-8765',
    time: '11:30',
    date: today,
    type: 'Revisión',
    status: 'Programada',
    reminderStatus: 'not_sent',
  },
  {
    id: 'demo-apt-4',
    patientId: 'demo-patient-4',
    patientName: 'José Miguel Torres',
    phoneNumber: '+504 9654-3210',
    time: '14:00',
    date: today,
    type: 'Consulta',
    status: 'Programada',
    reminderStatus: 'sent',
  },
  {
    id: 'demo-apt-5',
    patientId: 'demo-patient-5',
    patientName: 'Ana Lucía Mejía',
    phoneNumber: '+504 9111-2233',
    time: '09:00',
    date: addDays(1),
    type: 'Cirugía',
    status: 'Programada',
    reminderStatus: 'not_sent',
  },
  {
    id: 'demo-apt-6',
    patientId: 'demo-patient-1',
    patientName: 'María Fernández',
    phoneNumber: '+504 9876-5432',
    time: '10:30',
    date: addDays(1),
    type: 'Seguimiento',
    status: 'Programada',
    reminderStatus: 'not_sent',
  },
  {
    id: 'demo-apt-7',
    patientId: 'demo-patient-6',
    patientName: 'Roberto Vargas',
    phoneNumber: '+504 9444-5566',
    time: '15:00',
    date: addDays(3),
    type: 'Consulta',
    status: 'Programada',
    reminderStatus: 'not_sent',
  },
  {
    id: 'demo-apt-8',
    patientId: 'demo-patient-2',
    patientName: 'Carlos Rodríguez',
    phoneNumber: '+504 9555-1234',
    time: '09:30',
    date: addDays(5),
    type: 'Seguimiento',
    status: 'Programada',
    reminderStatus: 'not_sent',
  },
];

// ─── Pacientes demo ───────────────────────────────────────────────────
export const DEMO_PATIENTS: PatientRecord[] = [
  {
    id: 'demo-patient-1',
    identification: {
      fullName: 'María Fernández',
      birthDate: '1990-03-15',
      gender: 'Femenino',
      address: 'Col. Miraflores, Tegucigalpa',
      phone: '+504 9876-5432',
      email: 'maria.fernandez@email.com',
      occupation: 'Maestra',
    },
    clinicalHistory: {
      allergies: ['Penicilina'],
      medications: 'Ninguno actualmente',
      previousDiseases: 'Hipertensión leve (controlada)',
      familyHistory: 'Padre con diabetes tipo 2',
      motiveOfConsult: 'Limpieza semestral y revisión general',
    },
    evolutionNotes: [
      {
        id: 'note-1-1',
        date: addDays(-30),
        content: 'Paciente llega para limpieza de rutina. Se observa acumulación de sarro en sector anterior inferior.',
        procedure: 'Profilaxis y fluorización',
      },
      {
        id: 'note-1-2',
        date: addDays(-5),
        content: 'Segunda visita: mejora notable en higiene oral. Sigue protocolo de cepillado indicado.',
        procedure: 'Revisión y control',
      },
    ],
    history: [
      { id: 'ev-1-1', date: addDays(-30), type: 'treatment', description: 'Profilaxis completa', toothId: undefined },
      { id: 'ev-1-2', date: addDays(-5), type: 'diagnose', description: 'Control post-profilaxis', toothId: undefined },
    ],
    consentSigned: true,
    odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] })),
    odontogramHistory: [],
    periodontogram: null as any,
    xrays: [],
    budget: [
      { id: 'bud-1-1', treatment: 'Limpieza dental profesional', toothId: undefined, unitCost: 800, quantity: 1, status: 'completed', createdAt: addDays(-30) },
      { id: 'bud-1-2', treatment: 'Fluorización', toothId: undefined, unitCost: 200, quantity: 1, status: 'completed', createdAt: addDays(-30) },
      { id: 'bud-1-3', treatment: 'Blanqueamiento dental', toothId: undefined, unitCost: 2500, quantity: 1, status: 'pending', createdAt: addDays(-5) },
    ],
    payments: [
      { id: 'pay-1-1', amount: 1000, method: 'transfer', note: 'Pago limpieza + fluorización', date: addDays(-30) },
      { id: 'pay-1-2', amount: 2500, method: 'card', note: 'Pago blanqueamiento dental', date: addDays(-5) },
    ],
    labWorks: [],
    balance: 0,
    consents: [],
    prescriptions: [],
    createdAt: addDays(-60),
    updatedAt: addDays(-5),
  },
  {
    id: 'demo-patient-2',
    identification: {
      fullName: 'Carlos Rodríguez',
      birthDate: '1985-07-22',
      gender: 'Masculino',
      address: 'Res. Los Castaños, San Pedro Sula',
      phone: '+504 9555-1234',
      email: 'carlos.rodriguez@gmail.com',
      occupation: 'Ingeniero civil',
    },
    clinicalHistory: {
      allergies: [],
      medications: 'Ibuprofeno ocasional',
      previousDiseases: 'Ninguna',
      familyHistory: 'Sin antecedentes relevantes',
      motiveOfConsult: 'Dolor intenso en molar inferior izquierdo',
    },
    evolutionNotes: [
      {
        id: 'note-2-1',
        date: addDays(-10),
        content: 'Radiografía revela infección periapical en pieza 36. Se decide extracción. Paciente tolera bien el procedimiento.',
        procedure: 'Extracción pieza 36',
      },
    ],
    history: [
      { id: 'ev-2-1', date: addDays(-10), type: 'extraction', description: 'Extracción pieza 36 por infección periapical', toothId: 36 },
    ],
    consentSigned: true,
    odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] })),
    odontogramHistory: [],
    periodontogram: null as any,
    xrays: [],
    budget: [
      { id: 'bud-2-1', treatment: 'Extracción simple', toothId: 36, unitCost: 600, quantity: 1, status: 'completed', createdAt: addDays(-10) },
      { id: 'bud-2-2', treatment: 'Implante dental', toothId: 36, unitCost: 15000, quantity: 1, status: 'pending', createdAt: addDays(-10) },
    ],
    payments: [
      { id: 'pay-2-1', amount: 600, method: 'cash', note: 'Extracción pieza 36', date: addDays(-10) },
      { id: 'pay-2-2', amount: 15000, method: 'transfer', note: 'Pago total implante', date: addDays(-10) },
    ],
    labWorks: [],
    balance: 0,
    consents: [],
    prescriptions: [
      {
        id: 'rx-2-1',
        date: addDays(-10),
        diagnosis: 'Post-extracción dental',
        medications: [
          { name: 'Amoxicilina 500mg', dosage: '1 cápsula', frequency: 'cada 8 horas', duration: '7 días', instructions: 'Tomar con comidas' },
          { name: 'Ibuprofeno 400mg', dosage: '1 tableta', frequency: 'cada 8 horas', duration: '5 días', instructions: 'Solo si hay dolor' },
        ],
        notes: 'Evitar alimentos duros. Enjuagues con agua tibia y sal.',
      },
    ],
    createdAt: addDays(-15),
    updatedAt: addDays(-10),
  },
  {
    id: 'demo-patient-3',
    identification: {
      fullName: 'Laura Sánchez',
      birthDate: '1998-11-08',
      gender: 'Femenino',
      address: 'Col. Kennedy, Tegucigalpa',
      phone: '+504 9321-8765',
      email: 'laura.sanchez@outlook.com',
      occupation: 'Estudiante universitaria',
    },
    clinicalHistory: {
      allergies: ['AINE'],
      medications: 'Anticonceptivos orales',
      previousDiseases: 'Ninguna',
      familyHistory: 'Madre con caries severas',
      motiveOfConsult: 'Revisión general y blanqueamiento',
    },
    evolutionNotes: [],
    history: [],
    consentSigned: false,
    odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] })),
    odontogramHistory: [],
    periodontogram: null as any,
    xrays: [],
    budget: [
      { id: 'bud-3-1', treatment: 'Revisión general', toothId: undefined, unitCost: 300, quantity: 1, status: 'pending', createdAt: today },
      { id: 'bud-3-2', treatment: 'Blanqueamiento LED', toothId: undefined, unitCost: 3500, quantity: 1, status: 'pending', createdAt: today },
    ],
    payments: [
      { id: 'pay-3-1', amount: 3800, method: 'card', note: 'Pago total de tratamientos', date: today },
    ],
    labWorks: [],
    balance: 0,
    consents: [],
    prescriptions: [],
    createdAt: today,
    updatedAt: today,
  },
  {
    id: 'demo-patient-4',
    identification: {
      fullName: 'José Miguel Torres',
      birthDate: '2005-02-14',
      gender: 'Masculino',
      address: 'Barrio Suyapa, Comayagüela',
      phone: '+504 9654-3210',
      email: 'jose.torres@gmail.com',
      occupation: 'Estudiante secundaria',
    },
    clinicalHistory: {
      allergies: [],
      medications: 'Ninguno',
      previousDiseases: 'Ninguna',
      familyHistory: 'Padre con ortodoncia previa',
      motiveOfConsult: 'Alineación dental. Apiñamiento anterior superior e inferior.',
    },
    evolutionNotes: [
      {
        id: 'note-4-1',
        date: addDays(-90),
        content: 'Inicio de tratamiento ortodóncico. Brackets metálicos colocados. Arco inicial 0.14 NiTi.',
        procedure: 'Colocación de brackets',
      },
      {
        id: 'note-4-2',
        date: addDays(-60),
        content: 'Primera revisión. Buen progreso. Cambio a arco 0.16 NiTi.',
        procedure: 'Ajuste ortodóncico',
      },
      {
        id: 'note-4-3',
        date: addDays(-30),
        content: 'Segunda revisión. Espacios cerrando bien. Cambio a arco rectangular 0.16x0.22 SS.',
        procedure: 'Ajuste ortodóncico',
      },
    ],
    history: [
      { id: 'ev-3-1', date: addDays(-180), type: 'other', description: 'Instalación de brackets metálicos', toothId: undefined },
      { id: 'ev-3-2', date: addDays(-150), type: 'diagnose', description: 'Ajuste mensual', toothId: undefined },
      { id: 'ev-3-3', date: addDays(-120), type: 'diagnose', description: 'Ajuste mensual y cambio de ligas', toothId: undefined },
    ],
    consentSigned: true,
    odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] })),
    odontogramHistory: [],
    periodontogram: null as any,
    xrays: [],
    budget: [
      { id: 'bud-4-1', treatment: 'Tratamiento ortodóncico completo (18 meses)', toothId: undefined, unitCost: 18000, quantity: 1, status: 'pending', createdAt: addDays(-90) },
    ],
    payments: [
      { id: 'pay-3-1', amount: 3000, method: 'transfer', note: 'Prima de ortodoncia', date: addDays(-180) },
      { id: 'pay-3-2', amount: 500, method: 'cash', note: 'Mensualidad', date: addDays(-150) },
      { id: 'pay-3-3', amount: 500, method: 'cash', note: 'Mensualidad', date: addDays(-120) },
    ],
    labWorks: [],
    balance: 0,
    consents: [],
    prescriptions: [],
    createdAt: addDays(-95),
    updatedAt: addDays(-30),
  },
  {
    id: 'demo-patient-5',
    identification: {
      fullName: 'Ana Lucía Mejía',
      birthDate: '1978-09-30',
      gender: 'Femenino',
      address: 'Col. Palmira, Tegucigalpa',
      phone: '+504 9111-2233',
      email: 'ana.mejia@empresa.hn',
      occupation: 'Contadora',
    },
    clinicalHistory: {
      allergies: ['Latex'],
      medications: 'Metformina 500mg (diabetes tipo 2)',
      previousDiseases: 'Diabetes tipo 2 (diagnosticada 2018)',
      familyHistory: 'Madre con periodontitis',
      motiveOfConsult: 'Dolor en pieza 16. Posible necesidad de endodoncia.',
    },
    evolutionNotes: [
      {
        id: 'note-5-1',
        date: addDays(-7),
        content: 'Radiografía periapical muestra lesión en pieza 16. Se programa endodoncia. Paciente informada del procedimiento y tiempo estimado.',
        procedure: 'Diagnóstico y plan de tratamiento',
      },
    ],
    history: [
      { id: 'ev-5-1', date: addDays(-7), type: 'diagnose', description: 'Diagnóstico: necrosis pulpar pieza 16', toothId: 16 },
    ],
    consentSigned: true,
    odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] })),
    odontogramHistory: [],
    periodontogram: null as any,
    xrays: [],
    budget: [
      { id: 'bud-5-1', treatment: 'Endodoncia pieza 16', toothId: 16, unitCost: 4500, quantity: 1, status: 'pending', createdAt: addDays(-7) },
      { id: 'bud-5-2', treatment: 'Corona porcelana sobre metal', toothId: 16, unitCost: 6000, quantity: 1, status: 'pending', createdAt: addDays(-7) },
    ],
    payments: [
      { id: 'pay-5-1', amount: 10500, method: 'transfer', note: 'Pago total de endodoncia y corona', date: addDays(-7) },
    ],
    labWorks: [
      {
        id: 'lab-5-1',
        description: 'Corona de porcelana fusionada a metal para pieza 16',
        labName: 'Laboratorio Dental Centro',
        sentDate: addDays(7),
        expectedDate: addDays(21),
        cost: 2000,
        status: 'pending',
        createdAt: addDays(-7),
      },
    ],
    balance: 0,
    consents: [],
    prescriptions: [],
    createdAt: addDays(-7),
    updatedAt: addDays(-7),
  },
  {
    id: 'demo-patient-6',
    identification: {
      fullName: 'Roberto Vargas',
      birthDate: '1965-05-18',
      gender: 'Masculino',
      address: 'Col. Loma Linda, San Pedro Sula',
      phone: '+504 9444-5566',
      email: 'roberto.vargas@negocios.com',
      occupation: 'Empresario',
    },
    clinicalHistory: {
      allergies: [],
      medications: 'Atorvastatina 20mg, Aspirina 100mg',
      previousDiseases: 'Hipercolesterolemia',
      familyHistory: 'Sin antecedentes dentales relevantes',
      motiveOfConsult: 'Blanqueamiento y carillas estéticas. Interesado en mejorar imagen.',
    },
    evolutionNotes: [
      {
        id: 'note-6-1',
        date: addDays(-14),
        content: 'Consulta estética inicial. Análisis de sonrisa. Se propone plan de blanqueamiento + 6 carillas de porcelana anteriores superiores.',
        procedure: 'Consulta estética y planificación',
      },
    ],
    history: [
      { id: 'ev-6-1', date: addDays(-14), type: 'treatment', description: 'Consulta estética y análisis de sonrisa', toothId: undefined },
    ],
    consentSigned: true,
    odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, surfaces: [] })),
    odontogramHistory: [],
    periodontogram: null as any,
    xrays: [],
    budget: [
      { id: 'bud-6-1', treatment: 'Blanqueamiento LED profesional', toothId: undefined, unitCost: 3500, quantity: 1, status: 'pending', createdAt: addDays(-14) },
      { id: 'bud-6-2', treatment: 'Carilla de porcelana e.max', toothId: undefined, unitCost: 5500, quantity: 6, status: 'pending', createdAt: addDays(-14) },
    ],
    payments: [
      { id: 'pay-6-1', amount: 20000, method: 'card', note: 'Anticipo tratamientos estéticos', date: addDays(-14) },
    ],
    labWorks: [],
    balance: 0,
    consents: [],
    prescriptions: [],
    createdAt: addDays(-20),
    updatedAt: addDays(-14),
  },
];
