import React from 'react';

export interface Appointment {
  id: string;
  patientName: string;
  time: string;
  type: 'Consultation' | 'Follow-up' | 'Surgery' | 'Check-up';
  status: 'Scheduled' | 'Completed' | 'Delayed';
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