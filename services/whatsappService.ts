
import { Appointment, AppointmentStatus } from '../types';

type WhatsAppEventListener = (data: { appointmentId: string; status: AppointmentStatus }) => void;

/**
 * WhatsAppService maneja la comunicación con Meta Graph API.
 * Ahora incluye un sistema de eventos para simular Webhooks en tiempo real.
 */
class WhatsAppService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId = 'YOUR_PHONE_NUMBER_ID';
  private readonly accessToken = 'YOUR_ACCESS_TOKEN';
  private listeners: WhatsAppEventListener[] = [];

  /**
   * Suscribirse a actualizaciones de estado (Simulación de Webhook)
   */
  subscribe(callback: WhatsAppEventListener) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Emite un evento interno (Simula la llegada de un Webhook de Meta)
   */
  private emit(appointmentId: string, status: AppointmentStatus) {
    this.listeners.forEach(listener => listener({ appointmentId, status }));
  }

  /**
   * Método de simulación para pruebas de desarrollo
   */
  simulateIncomingConfirmation(appointmentId: string) {
    console.log(`[Webhook Simulator] Recibida confirmación para cita: ${appointmentId}`);
    // Simulamos un pequeño retraso de red del Webhook
    setTimeout(() => {
      this.emit(appointmentId, 'Completada');
    }, 1500);
  }

  /**
   * Envía un recordatorio de cita usando una plantilla oficial.
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<{ success: boolean; messageId?: string }> {
    const endpoint = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      to: appointment.phoneNumber,
      type: 'template',
      template: {
        name: 'appointment_reminder_v1',
        language: { code: 'es' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: appointment.patientName },
              { type: 'text', text: appointment.time },
              { type: 'text', text: appointment.date }
            ]
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '0',
            payload: `CONFIRM_${appointment.id}`
          }
        ]
      }
    };

    try {
      console.log('Enviando WhatsApp a:', appointment.phoneNumber, payload);

      // Simulación de envío exitoso
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Auto-simular una respuesta después de 5 segundos para demostrar el flujo
      // setTimeout(() => this.simulateIncomingConfirmation(appointment.id), 5000);

      return { success: true, messageId: `wa_msg_${crypto.randomUUID().slice(0, 9)}` };
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      return { success: false };
    }
  }

  shouldSendReminder(appointment: Appointment): boolean {
    const appointmentDate = new Date(`${appointment.date} ${appointment.time}`);
    const now = new Date();
    const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    return diffInHours <= 24 && diffInHours > 0 && appointment.reminderStatus === 'not_sent';
  }
}

export const whatsappService = new WhatsAppService();
