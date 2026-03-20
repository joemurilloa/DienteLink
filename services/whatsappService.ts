import { Appointment } from '../types';
import { supabase } from '../lib/supabase';

/**
 * WhatsAppService — Envío de recordatorios vía Edge Function (Meta API) o links directos.
 */
class WhatsAppService {

  /**
   * Envía un mensaje de confirmación de cita utilizando la Edge Function de Supabase.
   * La Edge Function se comunica de manera segura con Meta Graph API.
   */
  async sendServerAppointmentReminder(appointment: Appointment, doctorName?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const phone = this.sanitizePhone(appointment.phoneNumber);

    if (!phone) {
      return { success: false, error: 'Número de teléfono inválido' };
    }
    
    // Formatear la fecha
    let dateFormatted = appointment.date;
    try {
      if (appointment.date) {
        const d = new Date(appointment.date + 'T12:00:00');
        if (!isNaN(d.getTime())) {
          dateFormatted = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        }
      }
    } catch (e) {
      console.error("Error formatting date", e);
    }
    
    // Formatear la hora
    let timeFormatted = appointment.time;
    if (appointment.time) {
      const [h, m] = appointment.time.split(':');
      const date = new Date(0, 0, 0, parseInt(h || '0', 10), parseInt(m || '0', 10));
      timeFormatted = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    try {
      const { data, error } = await supabase.functions.invoke('rapid-handler', {
        body: {
          paciente_nombre: appointment.patientName,
          paciente_telefono: phone,
          fecha: dateFormatted,
          hora: timeFormatted,
          doctor_nombre: doctorName || 'su doctor'
        }
      });

      if (error) {
        console.error('Error invoking Edge Function:', error);
        return { success: false, error: error.message };
      }

      // Revisa si la Meta API devolvió un error interno (que parseamos en la edge function)
      if (data && data.error) {
        console.error('Meta API Error:', data.error);
        return { success: false, error: 'Error en la configuración de WhatsApp' };
      }

      return { success: true, messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
      console.error('Unexpected error calling WhatsApp service:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Abre WhatsApp con un mensaje pre-llenado de recordatorio (Fallback manual).
   */
  sendManualAppointmentReminder(appointment: Appointment): { success: boolean; messageId?: string } {
    const phone = this.sanitizePhone(appointment.phoneNumber);

    if (!phone) {
      return { success: false };
    }

    const message = this.buildReminderMessage(appointment);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    return { success: true, messageId: `wa_link_${Date.now()}` };
  }

  /**
   * Limpia el número de teléfono dejando solo dígitos y asegurando el código de país.
   */
  private sanitizePhone(raw: string | undefined): string {
    if (!raw) return '';
    let clean = raw.replace(/[^0-9]/g, '');
    
    // Meta API EXIGE el código de país.
    // Si el usuario guardó un número de 8 dígitos (ej. Honduras), le agregamos el 504.
    if (clean.length === 8) {
      clean = '504' + clean;
    } 
    // Si el usuario guardó un número local de 10 dígitos (ej. México) sin código
    else if (clean.length === 10 && !clean.startsWith('52')) {
      clean = '52' + clean;
    }
    
    return clean;
  }

  /**
   * Construye el texto del recordatorio (para el modo manual web).
   */
  private buildReminderMessage(appointment: Appointment): string {
    const dateFormatted = (() => {
      try {
        if (!appointment.date) return 'próximamente';
        const d = new Date(appointment.date + 'T12:00:00');
        if (isNaN(d.getTime())) return appointment.date;
        return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      } catch {
        return appointment.date || 'próximamente';
      }
    })();

    const timeFormatted = (() => {
      if (!appointment.time) return '';
      const [h, m] = appointment.time.split(':');
      const date = new Date(0, 0, 0, parseInt(h || '0', 10), parseInt(m || '0', 10));
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    })();

    return [
      `¡Hola ${appointment.patientName}! 👋`,
      ``,
      `Te recordamos tu cita dental:`,
      `📅 Fecha: ${dateFormatted}`,
      timeFormatted ? `🕐 Hora: ${timeFormatted}` : '',
      appointment.type ? `📋 Tipo: ${appointment.type}` : '',
      ``,
      `¡Te esperamos!`,
      `— DienteLink`,
    ].filter(Boolean).join('\n');
  }

  shouldSendReminder(appointment: Appointment): boolean {
    const appointmentDate = new Date(`${appointment.date} ${appointment.time}`);
    const now = new Date();
    const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return diffInHours <= 24 && diffInHours > 0 && appointment.reminderStatus === 'not_sent';
  }
}

export const whatsappService = new WhatsAppService();
