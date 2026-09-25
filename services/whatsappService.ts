import { Appointment } from '../types';

/**
 * WhatsAppService — Generates pre-saved messages and opens WhatsApp Web/App
 * directly to the patient's phone number.
 */
class WhatsAppService {
  /**
   * Sanitizes phone number: strips non-digits and prepends default country code (504 for Honduras) if 8 digits.
   */
  sanitizePhone(raw: string | undefined | null): string {
    if (!raw) return '';
    let clean = raw.replace(/\D/g, '');

    // If 8-digit number (standard mobile in Honduras without country code)
    if (clean.length === 8) {
      clean = '504' + clean;
    }
    // If 10-digit number without country code (e.g. Mexico)
    else if (clean.length === 10 && !clean.startsWith('52')) {
      clean = '52' + clean;
    }

    return clean;
  }

  /**
   * Formats a date string (YYYY-MM-DD) into a friendly Spanish format.
   */
  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return 'Próximamente';
    try {
      const d = new Date(dateStr + 'T12:00:00');
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }

  /**
   * Formats a time string (HH:mm) into a 12-hour format with AM/PM.
   */
  formatTime(timeStr: string | undefined): string {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':');
      const date = new Date(0, 0, 0, parseInt(h || '0', 10), parseInt(m || '0', 10));
      return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeStr;
    }
  }

  /**
   * Builds the pre-saved reminder message.
   */
  buildReminderMessage(appointment: Appointment, clinicName?: string): string {
    const formattedDate = this.formatDate(appointment.date);
    const formattedTime = this.formatTime(appointment.time);
    const signOff = clinicName ? `— ${clinicName}` : '— DienteLink';

    const lines = [
      `¡Hola ${appointment.patientName}! 👋`,
      '',
      'Le recordamos su próxima cita odontológica:',
      `📅 Fecha: ${formattedDate}`,
      formattedTime ? `⏰ Hora: ${formattedTime}` : '',
      appointment.type ? `🦷 Motivo: ${appointment.type}` : '',
      '',
      'Por favor responda a este mensaje para confirmar su asistencia.',
      '¡Le esperamos!',
      '',
      signOff
    ];

    return lines.filter(line => line !== '').join('\n');
  }

  /**
   * Generates the WhatsApp Web direct link.
   */
  getWhatsAppUrl(appointment: Appointment, clinicName?: string): { url: string; phone: string } | null {
    const phone = this.sanitizePhone(appointment.phoneNumber);
    if (!phone) return null;

    const message = this.buildReminderMessage(appointment, clinicName);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    return { url, phone };
  }

  /**
   * Opens WhatsApp Web directly with the pre-saved message for the patient.
   */
  sendAppointmentReminder(
    appointment: Appointment,
    clinicName?: string
  ): { success: boolean; error?: string; url?: string } {
    const phone = this.sanitizePhone(appointment.phoneNumber);

    if (!phone) {
      return {
        success: false,
        error: 'El paciente no tiene un número de teléfono válido registrado.'
      };
    }

    const message = this.buildReminderMessage(appointment, clinicName);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return { success: true, url: waUrl };
    } catch (err: any) {
      console.error('[WhatsAppService] Error opening window:', err);
      return {
        success: false,
        error: 'No se pudo abrir la ventana de WhatsApp. Revisa los permisos de ventanas emergentes.'
      };
    }
  }
}

export const whatsappService = new WhatsAppService();
