import { Appointment, Stats, PatientRecord, ToothData } from '../types';

export const getAppointments = (): Appointment[] => [
  {
    id: '1',
    patientName: 'Sarah Jenkins',
    phoneNumber: '34600000001',
    time: '09:00 AM',
    date: '2024-05-20',
    type: 'Consultation',
    status: 'Scheduled',
    reminderStatus: 'not_sent',
    patientImage: 'https://i.pravatar.cc/150?u=sarah'
  },
  {
    id: '2',
    patientName: 'Robert Fox',
    phoneNumber: '34600000002',
    time: '10:30 AM',
    date: '2024-05-20',
    type: 'Check-up',
    status: 'Delayed',
    reminderStatus: 'sent',
    patientImage: 'https://i.pravatar.cc/150?u=robert'
  },
  {
    id: '3',
    patientName: 'Jane Cooper',
    phoneNumber: '34600000003',
    time: '01:15 PM',
    date: '2024-05-20',
    type: 'Follow-up',
    status: 'Scheduled',
    reminderStatus: 'not_sent',
    patientImage: 'https://i.pravatar.cc/150?u=jane'
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
      address: 'Calle Mayor 123, Madrid',
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
