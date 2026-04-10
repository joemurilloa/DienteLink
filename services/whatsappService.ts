import { Appointment } from '../types';

/**
 * WhatsAppService — Opens WhatsApp with a pre-filled reminder message.
 * Uses the universal wa.me/ link which works on web, Android, and iOS.
 */
class WhatsAppService {

  /**
   * Opens WhatsApp with a pre-filled appointment reminder message.
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
   * Sanitizes phone number: strips non-digits and prepends country code if needed.
   */
  private sanitizePhone(raw: string | undefined): string {
    if (!raw) return '';
    let clean = raw.replace(/[^0-9]/g, '');
    
    // If the user saved an 8-digit number (e.g. Honduras), prepend 504.
    if (clean.length === 8) {
      clean = '504' + clean;
    } 
    // If the user saved a 10-digit local number (e.g. México) without country code
    else if (clean.length === 10 && !clean.startsWith('52')) {
      clean = '52' + clean;
    }
    
    return clean;
  }

  /**
   * Builds the reminder message text.
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
