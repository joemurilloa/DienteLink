
import { Appointment, Stats } from '../types';

export const getAppointments = (): Appointment[] => [
  {
    id: '1',
    patientName: 'Sarah Jenkins',
    time: '09:00 AM',
    type: 'Consultation',
    status: 'Scheduled',
    patientImage: 'https://i.pravatar.cc/150?u=sarah'
  },
  {
    id: '2',
    patientName: 'Robert Fox',
    time: '10:30 AM',
    type: 'Check-up',
    status: 'Delayed',
    patientImage: 'https://i.pravatar.cc/150?u=robert'
  },
  {
    id: '3',
    patientName: 'Jane Cooper',
    time: '01:15 PM',
    type: 'Follow-up',
    status: 'Scheduled',
    patientImage: 'https://i.pravatar.cc/150?u=jane'
  },
  {
    id: '4',
    patientName: 'Cody Fisher',
    time: '03:45 PM',
    type: 'Surgery',
    status: 'Scheduled',
    patientImage: 'https://i.pravatar.cc/150?u=cody'
  }
];

export const getDashboardStats = (): Stats => ({
  monthlyIncome: 14850.50,
  incomeTrend: 12.5,
  totalPatients: 1242,
  todayAppointments: 8
});
