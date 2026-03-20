
import { Appointment } from '../types';

/**
 * WhatsAppService — Envío REAL de recordatorios vía wa.me deep links.
 *
 * En lugar de simular un envío (el servicio anterior era teatro puro),
 * ahora abrimos directamente WhatsApp con un mensaje pre-llenado.
 * Esto funciona en web y móvil sin necesidad de API de Meta Business.
 *
 * Para una integración real con Meta Graph API en el futuro,
 * se necesitará un backend (Edge Function) que maneje los tokens.
 */
class WhatsAppService {

  /**
   * Abre WhatsApp con un mensaje pre-llenado de recordatorio.
   * Retorna `true` si se pudo abrir (siempre, en la práctica).
   */
  sendAppointmentReminder(appointment: Appointment): { success: boolean; messageId?: string } {
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
   * Limpia el número de teléfono dejando solo dígitos.
   * Acepta formatos como +504 1234-5678, (504) 1234 5678, etc.
   */
  private sanitizePhone(raw: string | undefined): string {
    if (!raw) return '';
    return raw.replace(/[^0-9]/g, '');
  }

  /**
   * Construye el texto del recordatorio que se pre-llena en WhatsApp.
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

  /**
   * Verifica si tiene sentido enviar un recordatorio (dentro de 24h y no enviado aún).
   */
  shouldSendReminder(appointment: Appointment): boolean {
    const appointmentDate = new Date(`${appointment.date} ${appointment.time}`);
    const now = new Date();
    const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return diffInHours <= 24 && diffInHours > 0 && appointment.reminderStatus === 'not_sent';
  }
}

export const whatsappService = new WhatsAppService();
