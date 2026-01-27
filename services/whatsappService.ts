
import { Appointment } from '../types';

/**
 * WhatsAppService maneja la comunicación con Meta Graph API.
 * Requiere un Token de Acceso Permanente y el ID del Número de Teléfono.
 */
class WhatsAppService {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private readonly phoneNumberId = 'YOUR_PHONE_NUMBER_ID'; // Configurable vía ENV
  private readonly accessToken = 'YOUR_ACCESS_TOKEN';     // Configurable vía ENV

  /**
   * Envía un recordatorio de cita usando una plantilla oficial.
   * Las plantillas con botones deben estar pre-aprobadas en el Business Manager.
   */
  async sendAppointmentReminder(appointment: Appointment): Promise<{ success: boolean; messageId?: string }> {
    const endpoint = `${this.baseUrl}/${this.phoneNumberId}/messages`;

    // Estructura del payload según la documentación de Meta para Templates con botones
    const payload = {
      messaging_product: 'whatsapp',
      to: appointment.phoneNumber,
      type: 'template',
      template: {
        name: 'appointment_reminder_v1', // Nombre de la plantilla en Meta
        language: {
          code: 'es'
        },
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
          },
          {
            type: 'button',
            sub_type: 'quick_reply',
            index: '1',
            payload: `RESCHEDULE_${appointment.id}`
          }
        ]
      }
    };

    try {
      // Simulación de fetch (comentar para producción con credenciales reales)
      console.log('Enviando WhatsApp a:', appointment.phoneNumber, payload);
      
      // En un entorno real:
      /*
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to send WhatsApp');
      return await response.json();
      */

      // Simulamos latencia de red
      await new Promise(resolve => setTimeout(resolve, 1200));
      return { success: true, messageId: `wa_msg_${Math.random().toString(36).substr(2, 9)}` };
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      return { success: false };
    }
  }

  /**
   * Lógica para verificar si una cita está dentro del rango de 24 horas.
   */
  shouldSendReminder(appointment: Appointment): boolean {
    const appointmentDate = new Date(`${appointment.date} ${appointment.time}`);
    const now = new Date();
    const diffInHours = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return diffInHours <= 24 && diffInHours > 0 && appointment.reminderStatus === 'not_sent';
  }
}

export const whatsappService = new WhatsAppService();
