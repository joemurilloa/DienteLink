import React from 'react';

export type ReminderStatus = 'not_sent' | 'sending' | 'sent' | 'error';
export type ToothStatus = 'healthy' | 'caries' | 'missing' | 'treated';

export interface ToothData {
  id: number;
  status: ToothStatus;
}

export interface Appointment {
  id: string;
  patientName: string;
  phoneNumber: string;
  time: string;
  date: string;
  type: 'Consultation' | 'Follow-up' | 'Surgery' | 'Check-up';
  status: 'Scheduled' | 'Completed' | 'Delayed';
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