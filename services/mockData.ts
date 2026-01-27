
import { Appointment, Stats } from '../types';

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
