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
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeStr;
    }
  }

  /**
   * Abre WhatsApp en la misma pestaña (o la app en el celular),
   * para no sacar al doctor de DienteLink con mil ventanas nuevas.
   */
  openChat(url: string): { success: boolean; error?: string; url?: string } {
    try {
      const w = window.open(url, 'dientelink_wa');
      if (!w) {
        return {
          success: false,
          error: 'El navegador bloqueó la ventana. Permite ventanas emergentes para DienteLink.',
        };
      }
      return { success: true, url };
    } catch {
      return { success: false, error: 'No se pudo abrir WhatsApp.' };
    }
  }

  private sendTo(
    phoneRaw: string | undefined | null,
    message: string,
    defaultDialCode: string = '504'
  ): { success: boolean; error?: string; url?: string } {
    const phone = this.sanitizePhone(phoneRaw, defaultDialCode);
    if (!phone) {
      return { success: false, error: 'El paciente no tiene un teléfono válido registrado.' };
    }
    return this.openChat(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
  }

  /**
   * Recordatorio de cita: corto, en usted, pide confirmación.
   */
  buildReminderMessage(appointment: Appointment, clinicName?: string): string {
    const when = this.relativeDay(appointment.date);
    const time = this.formatTime(appointment.time);
    const name = this.firstName(appointment.patientName);
    const from = clinicName ? ` de ${clinicName}` : '';
    const motive = appointment.type ? ` (${appointment.type.toLowerCase()})` : '';

    return [
      `Hola ${name}, le escribimos${from}.`,
      '',
      `Le recordamos su cita ${when}${time ? ` a las ${time}` : ''}${motive}.`,
      '',
      '¿Podrá asistir? Responda SÍ para confirmar, o avísenos si necesita cambiarla.',
      '',
      'Gracias.',
    ].join('\n');
  }

  /** Primer nombre con mayúscula inicial ("JOSÉ MIGUEL TORRES" → "José"). */
  firstName(full: string | undefined): string {
    const first = (full || '').trim().split(/\s+/)[0] || '';
    return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : 'paciente';
  }

  /** "hoy", "mañana" o "el lunes 5 de octubre". */
  relativeDay(dateStr: string | undefined): string {
    if (!dateStr) return 'próxima';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return `el ${dateStr}`;
    const target = new Date(y, m - 1, d);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = Math.round((target.getTime() - start.getTime()) / 86400000);
    if (diff === 0) return 'de hoy';
    if (diff === 1) return 'de mañana';
    const label = target.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return `del ${label}`;
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

    return this.sendTo(phone, this.buildReminderMessage(appointment, clinicName), defaultDialCode);
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
      : '— Su clínica dental';
    const money = (n: number) =>
      `${currencySymbol ? currencySymbol + ' ' : ''}${n.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
    const name = this.firstName(patientName);

    const itemsText = items.map((item, index) => {
      const qtyStr = item.quantity > 1 ? `${item.quantity} × ` : '';
      const toothStr = item.toothId ? ` (pieza ${item.toothId})` : '';
      return `${index + 1}. ${qtyStr}${item.treatment}${toothStr} — ${money(item.unitCost * item.quantity)}`;
    }).join('\n');

    const lines = [
      `Hola ${name}, le compartimos el presupuesto${clinicName ? ` de ${clinicName}` : ''}:`,
      '',
      itemsText,
      '',
      `Total: ${money(totalBudget)}`,
      'Válido por 30 días.',
      '',
      'Si tiene dudas o desea agendar, responda este mensaje.',
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

    return this.sendTo(
      phone,
      this.buildBudgetQuoteMessage(patientName, items, totalBudget, clinicName, doctorName, currencySymbol),
      defaultDialCode
    );
  }

  /**
   * Builds post-procedure check-in / care follow-up message.
   */
  buildFollowUpMessage(patientName: string, procedure?: string, clinicName?: string): string {
    const name = this.firstName(patientName);
    const from = clinicName || 'la clínica';
    return [
      `Hola ${name}, le escribimos de ${from} para saber cómo se siente${procedure ? ` después de su ${procedure.toLowerCase()}` : ''}.`,
      '',
      'Si tiene molestias o dudas, responda este mensaje. Estamos para ayudarle.',
      '',
      'Que tenga una pronta recuperación.',
    ].join('\n');
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

    return this.sendTo(phone, this.buildFollowUpMessage(patientName, procedure, clinicName), defaultDialCode);
  }

  /**
   * Opens WhatsApp telling the patient their online booking request was confirmed.
   */
  sendBookingConfirmation(
    phoneRaw: string | undefined | null,
    patientName: string,
    date: string,
    time: string,
    clinicName?: string,
    defaultDialCode: string = '504'
  ): { success: boolean; error?: string; url?: string } {
    const phone = this.sanitizePhone(phoneRaw, defaultDialCode);
    if (!phone) return { success: false, error: 'Sin teléfono registrado' };

    const message = [
      `Hola ${this.firstName(patientName)}, su cita${clinicName ? ` en ${clinicName}` : ''} quedó confirmada.`,
      '',
      `${this.formatDate(date)} a las ${this.formatTime(time)}.`,
      '',
      'Si necesita cambiarla, avísenos por este medio. Le esperamos.',
    ].join('\n');
    return this.sendTo(phone, message, defaultDialCode);
  }

  /**
   * Builds a polite payment reminder with the pending balance.
   */
  buildPaymentReminderMessage(patientName: string, balanceFormatted: string, clinicName?: string): string {
    const name = this.firstName(patientName);
    const from = clinicName || 'la clínica';
    return [
      `Hola ${name}, le escribimos de ${from}.`,
      '',
      `Le recordamos un saldo pendiente de ${balanceFormatted}.`,
      '',
      'Si ya pagó, ignore este mensaje o envíenos el comprobante. Gracias.',
    ].join('\n');
  }

  /**
   * Opens WhatsApp with a payment reminder.
   */
  sendPaymentReminder(
    phoneRaw: string | undefined | null,
    patientName: string,
    balanceFormatted: string,
    clinicName?: string,
    defaultDialCode: string = '504'
  ): { success: boolean; error?: string; url?: string } {
    const phone = this.sanitizePhone(phoneRaw, defaultDialCode);
    if (!phone) return { success: false, error: 'Sin teléfono registrado' };

    return this.sendTo(phone, this.buildPaymentReminderMessage(patientName, balanceFormatted, clinicName), defaultDialCode);
  }
}

export const whatsappService = new WhatsAppService();
