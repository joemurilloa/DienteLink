import { Appointment, Stats, PatientRecord, ToothData } from '../types';

const today = new Date().toISOString().split('T')[0];

export const getAppointments = (): Appointment[] => [
  {
    id: crypto.randomUUID(),
    patientId: '1',
    patientName: 'Sarah Jenkins',
    phoneNumber: '34600000001',
    time: '09:00 AM',
    date: today,
    type: 'Consulta',
    status: 'Programada',
    reminderStatus: 'not_sent',
    patientImage: 'https://i.pravatar.cc/150?u=sarah'
  },
  {
    id: crypto.randomUUID(),
    patientId: '1',
    patientName: 'Sarah Jenkins',
    phoneNumber: '34600000001',
    time: '10:30 AM',
    date: today,
    type: 'Revisión',
    status: 'Retrasada',
    reminderStatus: 'sent',
    patientImage: 'https://i.pravatar.cc/150?u=sarah'
  },
  {
    id: crypto.randomUUID(),
    patientId: '1',
    patientName: 'Sarah Jenkins',
    phoneNumber: '34600000001',
    time: '01:15 PM',
    date: today,
    type: 'Seguimiento',
    status: 'Programada',
    reminderStatus: 'not_sent',
    patientImage: 'https://i.pravatar.cc/150?u=sarah'
  }
];

export const getDashboardStats = (): Stats => ({
  monthlyIncome: 14850.50,
  incomeTrend: 12.5,
  totalPatients: 1242,
  todayAppointments: 8
});

// --- Mock de Expediente Clínico ---

export const getPatientRecords = (): PatientRecord[] => [
  {
    id: '1',
    identification: {
      fullName: 'Sarah Jenkins',
      birthDate: '1988-06-12',
      gender: 'Femenino',
      address: 'Calle Mayor 123, Tegucigalpa',
      phone: '34600000001',
      email: 'sarah.j@email.com',
      occupation: 'Arquitecta'
    },
    clinicalHistory: {
      allergies: ['Penicilina'],
      medications: 'Ninguna',
      previousDiseases: 'Gastritis crónica',
      familyHistory: 'Padre diabético',
      motiveOfConsult: 'Dolor en molar superior derecho'
    },
    evolutionNotes: [
      {
        id: 'n1',
        date: '2024-05-15',
        content: 'Paciente presenta caries profunda en pieza 16. Se realiza limpieza inicial.',
        procedure: 'Limpieza y Evaluación'
      }
    ],
    history: [
      {
        id: 'h1',
        date: '2024-01-10',
        type: 'cleaning',
        description: 'Limpieza dental semestral',
        cost: 80
      },
      {
        id: 'h2',
        date: '2024-03-05',
        type: 'diagnose',
        description: 'Evaluación general y detección de caries en pieza 16',
        cost: 30
      }
    ],
    consentSigned: true,
    odontogram: Array.from({ length: 32 }, (_, i) => ({ id: i + 1, status: 'healthy' as const })),
    periodontogram: new Array(32).fill(1),
    budget: [],
    xrays: ['https://picsum.photos/seed/xray1/400/300'],
    balance: 110
  }
];
