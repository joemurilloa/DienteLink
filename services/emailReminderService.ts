import { supabase } from '../lib/supabase';

export interface EmailReminderPayload {
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  doctorName: string;
  clinicName: string;
}

export interface EmailReminderResult {
  success: boolean;
  error?: string;
}

class EmailReminderService {
  async sendReminder(payload: EmailReminderPayload): Promise<EmailReminderResult> {
    try {
      const { data, error } = await supabase.functions.invoke('send-reminder', {
        body: payload,
      });

      if (error) {
        console.warn('Edge function error (posiblemente no desplegada en Supabase):', error.message || error);
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Email reminder error:', err);
      return { success: false, error: err.message || 'Error desconocido' };
    }
  }
}

export const emailReminderService = new EmailReminderService();
