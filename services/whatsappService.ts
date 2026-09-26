import { Appointment, BudgetItem } from '../types';

export const COUNTRY_DIAL_CODES: Record<string, string> = {
  HNL: '504',
  USD: '1',
  MXN: '52',
  GTQ: '502',
  CRC: '506',
  NIO: '505',
  PAB: '507',
  COP: '57',
  PEN: '51',
  CLP: '56',
  ARS: '54',
  DOP: '1809',
  BRL: '55',
  EUR: '34',
  BOB: '591',
  PYG: '595',
  UYU: '598',
  VES: '58',
};

/**
 * WhatsAppService — Generates pre-saved messages and opens WhatsApp Web/App
 * directly to the patient's phone number.
 */
class WhatsAppService {
  /**
   * Sanitizes phone number: strips non-digits and prepends country code if missing.
   * If raw phone already starts with +, 00, or a known country prefix, it is respected.
   */
  sanitizePhone(raw: string | undefined | null, defaultDialCode: string = '504'): string {
    if (!raw) return '';
    let clean = raw.trim();

    // Check if originally has international +
    const hadPlus = clean.startsWith('+');
    clean = clean.replace(/\D/g, '');
    if (!clean) return '';

    // Strip leading 00
    if (clean.startsWith('00')) {
      clean = clean.substring(2);
    }

    // If it had a +, it's already an international number
    if (hadPlus) {
      return clean;
    }

    // If 8-digit number (common in Central America without country code)
    if (clean.length === 8) {
      return defaultDialCode + clean;
    }

    // If 10-digit number (e.g. Mexico or Colombia or US without country code)
    if (clean.length === 10) {
      // If user default dial code is 52 (Mexico) and number doesn't start with 52
      if (defaultDialCode === '52' && !clean.startsWith('52')) {
        return '52' + clean;
      }
      // If default dial code is 57 (Colombia) and number starts with 3
      if (defaultDialCode === '57' && !clean.startsWith('57')) {
        return '57' + clean;
      }
      // If default is 1 (US/Canada)
      if (defaultDialCode === '1' && !clean.startsWith('1')) {
        return '1' + clean;
      }
      // If default dial code is set and clean doesn't start with it
      if (!clean.startsWith(defaultDialCode) && defaultDialCode.length <= 3) {
        return defaultDialCode + clean;
      }
    }

    // If 7-digit local landline
    if (clean.length === 7) {
      return defaultDialCode + clean;
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
   * Builds the pre-saved appointment reminder message.
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
   * Opens WhatsApp Web directly with the pre-saved reminder message.
   */
  sendAppointmentReminder(
    appointment: Appointment,
    clinicName?: string,
    defaultDialCode: string = '504'
  ): { success: boolean; error?: string; url?: string } {
    const phone = this.sanitizePhone(appointment.phoneNumber, defaultDialCode);

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

  /**
   * Builds a treatment quote message formatted for WhatsApp.
   */
  buildBudgetQuoteMessage(
    patientName: string,
    items: BudgetItem[],
    totalBudget: number,
    clinicName?: string,
    doctorName?: string,
    currencySymbol: string = ''
  ): string {
    const signOff = clinicName
      ? (doctorName ? `— Dr(a). ${doctorName} | ${clinicName}` : `— ${clinicName}`)
      : '— Tu Clínica Dental';

    const itemsText = items.map((item, index) => {
      const qtyStr = item.quantity > 1 ? `${item.quantity}x ` : '';
      const toothStr = item.toothId ? ` (Pieza #${item.toothId})` : '';
      const totalItem = item.unitCost * item.quantity;
      return `${index + 1}. *${item.treatment}*${toothStr}\n   ${qtyStr}Importe: ${currencySymbol ? currencySymbol + ' ' : ''}${totalItem.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
    }).join('\n\n');

    const lines = [
      `¡Hola ${patientName}! 👋`,
      '',
      `Le compartimos el presupuesto para su plan de tratamiento${clinicName ? ` en *${clinicName}*` : ''}:`,
      '',
      itemsText,
      '',
      '─────────────────────',
      `💰 *Total Estimado:* ${currencySymbol ? currencySymbol + ' ' : ''}${totalBudget.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`,
      '─────────────────────',
      '',
      '📌 *Condiciones:* Presupuesto válido por 30 días.',
      'Si tiene dudas o desea agendar su cita para iniciar el tratamiento, con gusto le atendemos por este medio.',
      '',
      signOff
    ];

    return lines.join('\n');
  }

  /**
   * Sends the treatment budget quote directly to the patient via WhatsApp.
   */
  sendBudgetQuote(
    phoneRaw: string | undefined | null,
    patientName: string,
    items: BudgetItem[],
    totalBudget: number,
    clinicName?: string,
    doctorName?: string,
    currencySymbol: string = '',
    defaultDialCode: string = '504'
  ): { success: boolean; error?: string; url?: string } {
    const phone = this.sanitizePhone(phoneRaw, defaultDialCode);

    if (!phone) {
      return {
        success: false,
        error: 'El paciente no tiene un número de teléfono registrado.'
      };
    }

    if (items.length === 0) {
      return {
        success: false,
        error: 'El presupuesto no contiene tratamientos agregados.'
      };
    }

    const message = this.buildBudgetQuoteMessage(patientName, items, totalBudget, clinicName, doctorName, currencySymbol);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return { success: true, url: waUrl };
    } catch (err: any) {
      console.error('[WhatsAppService] Error opening window:', err);
      return {
        success: false,
        error: 'No se pudo abrir WhatsApp. Verifica que tu navegador permita ventanas emergentes.'
      };
    }
  }

  /**
   * Builds post-procedure check-in / care follow-up message.
   */
  buildFollowUpMessage(patientName: string, procedure?: string, clinicName?: string): string {
    const signOff = clinicName ? `— ${clinicName}` : '— DienteLink';
    const lines = [
      `¡Hola ${patientName}! 👋`,
      '',
      `Esperamos que se encuentre muy bien. Le escribimos de ${clinicName || 'la clínica'} para dar seguimiento a su estado tras su procedimiento${procedure ? ` (${procedure})` : ''}.`,
      '',
      '¿Cómo ha evolucionado? Si presenta molestias inusuales o necesita indicaciones adicionales, por favor respóndanos a este mensaje.',
      '',
      '¡Que tenga una pronta recuperación!',
      '',
      signOff
    ];
    return lines.join('\n');
  }

  /**
   * Sends post-procedure follow-up.
   */
  sendFollowUpMessage(
    phoneRaw: string | undefined | null,
    patientName: string,
    procedure?: string,
    clinicName?: string,
    defaultDialCode: string = '504'
  ): { success: boolean; error?: string; url?: string } {
    const phone = this.sanitizePhone(phoneRaw, defaultDialCode);
    if (!phone) return { success: false, error: 'Sin teléfono registrado' };

    const message = this.buildFollowUpMessage(patientName, procedure, clinicName);
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    try {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return { success: true, url: waUrl };
    } catch {
      return { success: false, error: 'No se pudo abrir WhatsApp' };
    }
  }
}

export const whatsappService = new WhatsAppService();
