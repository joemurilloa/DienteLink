import { supabase } from '../lib/supabase';
import { getLocalISODate } from '../lib/utils';
import { DoctorAvailability, AppointmentRequest, PublicBookingSettings, AppointmentType } from '../types';
import { formatAppDate } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';
import { generateAvailableSlots } from './bookingUtils';
import * as persistence from './bookingPersistence';
import { createAppointmentRequestsChannel } from './bookingRealtime';
import { publicBookingUrl } from '../lib/legacyHash';

function notifyRejectedRequest(requestId: string) {
  supabase.functions
    .invoke('notify-patient-booking', { body: { kind: 'rejected', requestId } })
    .catch((e) => console.warn('[notify-patient-booking]', e));
}

// ==========================================================
// BookingService — In-Memory Cache + Supabase
//
// Authenticated methods use the cached userId.
// Public methods (for PublicBookingPage) accept a doctorId.
// ==========================================================

export class BookingService {
  private userId: string | null = null;
  private availability: DoctorAvailability | null = null;
  private settings: PublicBookingSettings | null = null;
  private requests: AppointmentRequest[] = [];
  private _ready = false;
  /** True solo tras una lectura exitosa. Un fallo no autoriza a guardar el horario default. */
  private availabilityLoaded = false;
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  // --- Initialization ---
  async init(userId: string): Promise<void> {
    this.userId = userId;
    this.availabilityLoaded = false;
    this._ready = false;
    this.availability = null;
    const { availabilityRow, settingsRow, requestRows } = await persistence.fetchDoctorInitData(userId);

    this.availability = availabilityRow ? dbToAvailability(availabilityRow) : this.getDefaultAvailability(userId);
    this.settings = settingsRow ? dbToSettings(settingsRow) : null;
    this.requests = (requestRows || []).map(dbToRequest);
    this.availabilityLoaded = true;
    this._ready = true;

    try {
      this.setupRealtime(userId);
    } catch (e) {
      console.error('[BookingService] setupRealtime failed:', e);
    }
  }

  private setupRealtime(userId: string) {
    if (!userId || userId === 'demo') return;
    if (this.realtimeChannel) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {
        console.warn('[BookingService] failed to remove previous realtime channel:', e);
      }
    }

    // Use best-effort subscription; failures must not crash the app
    // Use the encapsulated realtime helper. The helper returns a channel
    // that can be unsubscribed later.
    this.realtimeChannel = createAppointmentRequestsChannel(userId, (newRow) => {
      const newReq = dbToRequest(newRow);
      if (!this.requests.find(r => r.id === newReq.id)) {
        this.requests.unshift(newReq);
        window.dispatchEvent(new CustomEvent('newAppointmentRequest', { detail: newReq }));
        sileo.info({
          title: '¡Nueva solicitud de cita en línea!',
          description: `${newReq.patientName} ha pedido una cita el ${formatAppDate(newReq.requestedDate)} a las ${newReq.requestedTime}.`,
        });
      }
    });
  }

  reset() {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.userId = null;
    this.availability = null;
    this.settings = null;
    this.requests = [];
    this._ready = false;
    this.availabilityLoaded = false;
  }

  private uid(): string {
    if (!this.userId) {
      console.warn('BookingService not initialized. Returning empty ID.');
      return '';
    }
    return this.userId;
  }

  getDoctorId(): string {
    return this.uid();
  }

  generatePublicBookingUrl(): string {
    return publicBookingUrl(window.location.origin, this.uid());
  }

  // ===================== AVAILABILITY =====================

  getDefaultAvailability(doctorId?: string): DoctorAvailability {
    const id = doctorId || this.userId || '';
    return {
      id: `availability_${id}`,
      doctorId: id,
      slotDuration: 30,
      bufferTime: 15,
      advanceBookingDays: 30,
      lastUpdated: new Date().toISOString(),
      weeklySchedule: [
        { dayOfWeek: 0, enabled: false, timeSlots: [] },
        ...Array.from({ length: 5 }, (_, i) => ({
          dayOfWeek: i + 1,
          enabled: true,
          timeSlots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '17:00' }]
        })),
        { dayOfWeek: 6, enabled: true, timeSlots: [{ start: '09:00', end: '12:00' }] }
      ]
    };
  }

  getDoctorAvailability(): DoctorAvailability {
    return this.availability || this.getDefaultAvailability();
  }

  async saveDoctorAvailability(availability: DoctorAvailability): Promise<void> {
    if (!this.availabilityLoaded) {
      throw new Error('El horario no se cargó. Recarga la página antes de guardar.');
    }
    const doctorId = this.uid();
    if (!doctorId) {
      throw new Error('Sesión no lista');
    }
    const next = { ...availability, lastUpdated: new Date().toISOString() };

    await persistence.upsertDoctorAvailability(doctorId, {
      weekly_schedule: next.weeklySchedule,
      slot_duration: next.slotDuration,
      buffer_time: next.bufferTime,
      advance_booking_days: next.advanceBookingDays,
      updated_at: next.lastUpdated,
    });
    this.availability = next;
    window.dispatchEvent(new CustomEvent('availabilityUpdated', { detail: next }));
  }

  // ===================== BOOKING SETTINGS =====================

  getDefaultBookingSettings(): PublicBookingSettings {
    return {
      doctorName: '',
      clinicName: 'DienteLink Clínica',
      description: 'Agenda tu cita de manera fácil y rápida.',
      availableTypes: ['Consulta', 'Seguimiento', 'Revisión'],
      requirePhone: true,
      requireMessage: false,
      confirmationMessage: '¡Gracias! Tu solicitud de cita ha sido enviada.',
      isActive: true
    };
  }

  getBookingSettings(): PublicBookingSettings {
    return this.settings || this.getDefaultBookingSettings();
  }

  async saveBookingSettings(settings: PublicBookingSettings): Promise<void> {
    const doctorId = this.uid();
    this.settings = settings;

    try {
      await persistence.upsertBookingSettings(doctorId, {
        doctor_name: settings.doctorName,
        clinic_name: settings.clinicName,
        description: settings.description,
        available_types: settings.availableTypes,
        require_phone: settings.requirePhone,
        require_message: settings.requireMessage,
        confirmation_message: settings.confirmationMessage,
        is_active: settings.isActive,
      });
    } catch (err) {
      console.error('[BookingService] saveBookingSettings error:', err);
      sileo.error({ title: 'Error al guardar configuración', description: 'Verifica tu conexión e intenta de nuevo.' });
    }
  }

  // ===================== APPOINTMENT REQUESTS =====================

  getAppointmentRequests(): AppointmentRequest[] {
    return this.requests;
  }

  getPendingRequests(): AppointmentRequest[] {
    // Una solicitud cuya fecha ya pasó no requiere acción: no cuenta como pendiente.
    const today = getLocalISODate();
    return this.requests.filter(r => r.status === 'pending' && r.requestedDate >= today);
  }

  /** Re-fetch requests from Supabase to pick up requests created by the public page */
  async refreshRequests(): Promise<void> {
    const userId = this.uid();
    try {
      const data = await persistence.fetchAppointmentRequests(userId);
      this.requests = (data || []).map(dbToRequest);
      await this.expirePastPending();
      window.dispatchEvent(new CustomEvent('bookingRequestsUpdated'));
    } catch (err) {
      console.error('[BookingService] refreshRequests error:', err);
    }
  }

  /** Si la hora de la reserva ya pasó y nadie la aprobó, se cierra. No queda en el buzón. */
  private async expirePastPending(): Promise<void> {
    const now = Date.now();
    const stale = this.requests.filter(r => r.status === 'pending' && this.requestMoment(r) < now);
    for (const request of stale) {
      request.status = 'rejected';
      request.respondedAt = new Date().toISOString();
      try {
        await persistence.updateAppointmentRequestStatus(request.id, 'rejected', request.respondedAt);
      } catch (err) {
        console.error('[BookingService] expirePastPending error:', err);
      }
    }
  }

  private requestMoment(request: AppointmentRequest): number {
    const [y, m, d] = (request.requestedDate || '').split('-').map(Number);
    const [hh, mm] = (request.requestedTime || '00:00').split(':').map(Number);
    if (!y || !m || !d) return 0;
    return new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
  }

  /**
   * Aprueba vía RPC atómico (paciente + cita + request).
   * El cliente solo invalida caché; no crea filas a medias.
   */
  async approveRequestAtomic(
    requestId: string,
    forceOverlap = false,
  ): Promise<persistence.ApproveAppointmentResult> {
    const result = await persistence.approveAppointmentRequestAtomic(requestId, forceOverlap);
    const local = this.requests.find(r => r.id === requestId);
    if (local) {
      local.status = 'approved';
      local.respondedAt = new Date().toISOString();
    }
    window.dispatchEvent(new CustomEvent('bookingRequestsUpdated'));
    return result;
  }

  /** @deprecated Preferir approveRequestAtomic (RPC transaccional). */
  async approveRequest(requestId: string): Promise<AppointmentRequest | null> {
    try {
      await this.approveRequestAtomic(requestId, false);
      return this.requests.find(r => r.id === requestId) ?? null;
    } catch (err) {
      console.error('[BookingService] approveRequest error:', err);
      return null;
    }
  }

  async rejectRequest(requestId: string): Promise<AppointmentRequest | null> {
    const request = this.requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'rejected';
    request.respondedAt = new Date().toISOString();

    try {
      await persistence.updateAppointmentRequestStatus(requestId, 'rejected', request.respondedAt);
      window.dispatchEvent(new CustomEvent('bookingRequestsUpdated'));
      notifyRejectedRequest(requestId);
    } catch (err) {
      console.error('[BookingService] rejectRequest error:', err);
    }

    return request;
  }

  /** Change status of any request (re-approve, re-reject, or set back to pending) */
  async updateRequestStatus(requestId: string, newStatus: 'pending' | 'approved' | 'rejected'): Promise<AppointmentRequest | null> {
    const request = this.requests.find(r => r.id === requestId);
    if (!request) return null;

    const previousStatus = request.status;
    request.status = newStatus;
    request.respondedAt = newStatus === 'pending' ? undefined : new Date().toISOString();

    try {
      await persistence.updateAppointmentRequestStatus(requestId, newStatus, request.respondedAt || null);
      window.dispatchEvent(new CustomEvent('bookingRequestsUpdated'));
      if (newStatus === 'rejected' && previousStatus === 'pending') notifyRejectedRequest(requestId);
    } catch (err) {
      console.error('[BookingService] updateRequestStatus error:', err);
      sileo.error({ title: 'Error al actualizar solicitud', description: 'No se pudo cambiar el estado de la solicitud.' });
    }
    return request;
  }

  /** Delete a request permanently */
  async deleteRequest(requestId: string): Promise<void> {
    this.requests = this.requests.filter(r => r.id !== requestId);

    try {
      await persistence.deleteAppointmentRequest(requestId);
      window.dispatchEvent(new CustomEvent('bookingRequestsUpdated'));
    } catch (err) {
      console.error('[BookingService] deleteRequest error:', err);
      sileo.error({ title: 'Error al eliminar solicitud', description: 'No se pudo eliminar la solicitud.' });
    }
  }

  // ===================== PUBLIC METHODS (no auth required) =====================

   async getPublicBookingSettings(doctorId: string): Promise<PublicBookingSettings> {
      const { data, error } = await persistence.rpcGetPublicBookingSettings(doctorId);
      if (error) {
        console.error('[BookingService] getPublicBookingSettings RPC error:', error);
        throw error;
      }
      if (!data || data.length === 0) {
        return { ...this.getDefaultBookingSettings(), isActive: false };
      }
      return dbToSettings(data[0]);
   }

   async getPublicDoctorAvailability(doctorId: string): Promise<DoctorAvailability> {
      const { data, error } = await persistence.rpcGetPublicDoctorAvailability(doctorId);
      if (error) {
        console.error('[BookingService] getPublicDoctorAvailability RPC error:', error);
        throw error;
      }
      if (!data || data.length === 0) return this.getDefaultAvailability(doctorId);
      return dbToAvailability(data[0]);
   }

   async getPublicAppointmentRequests(doctorId: string): Promise<AppointmentRequest[]> {
      const { data, error } = await persistence.rpcGetPublicAppointmentRequests(doctorId);
      if (error || data == null) {
        console.error('[BookingService] getPublicAppointmentRequests RPC error:', error);
        throw new Error('No se pudieron consultar las solicitudes de horario');
      }
      // La RPC pública solo devuelve fecha y hora. El id no sale del consultorio.
      return data.map((d: { requested_date: string; requested_time: string }) => ({
        id: '',
        patientName: '',
        patientEmail: '',
        patientPhone: '',
        requestedDate: d.requested_date,
        requestedTime: d.requested_time,
        appointmentType: 'Consulta' as AppointmentType,
        status: 'pending' as const,
        createdAt: '',
        doctorId,
      }));
   }

  /** Cupos ocupados para la página pública. Un fallo no se disfraza de “día libre”. */
  async getPublicAppointments(doctorId: string): Promise<{ date: string; time: string }[]> {
    const { data, error } = await persistence.rpcGetPublicAppointments(doctorId);
    if (error || data == null) {
      console.error('[BookingService] getPublicAppointments RPC error:', error);
      throw new Error('No se pudieron consultar los horarios ocupados');
    }
    return data.map((a: { date: string; time: string }) => ({ date: a.date, time: a.time }));
  }

  async createAppointmentRequest(
    patientName: string,
    patientEmail: string,
    patientPhone: string,
    requestedDate: string,
    requestedTime: string,
    appointmentType: AppointmentType,
    message?: string,
    doctorId?: string
  ): Promise<AppointmentRequest> {
    const did = doctorId || this.uid();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const request: AppointmentRequest = {
      id,
      patientName: patientName.trim(),
      patientEmail: patientEmail.trim(),
      patientPhone: patientPhone.trim(),
      requestedDate,
      requestedTime,
      appointmentType,
      message: message?.trim(),
      status: 'pending',
      createdAt: now,
      doctorId: did,
    };

    // Insert into Supabase
    try {
      await persistence.insertAppointmentRequest({
        id,
        doctor_id: did,
        patient_name: request.patientName,
        patient_email: request.patientEmail,
        patient_phone: request.patientPhone,
        requested_date: requestedDate,
        requested_time: requestedTime,
        appointment_type: appointmentType,
        message: request.message || null,
        status: 'pending',
        created_at: now,
      });
    } catch (err) {
      console.error('[BookingService] createAppointmentRequest error:', err);
      throw new Error('No se pudo guardar la solicitud de cita');
    }

    // Update in-memory if this is the authenticated doctor
    if (this.userId === did) {
      this.requests.unshift(request);
    }

    window.dispatchEvent(new CustomEvent('newAppointmentRequest', { detail: request }));
    return request;
  }

  // ===================== TIME SLOT GENERATION =====================

  generateAvailableSlots(date: string, availability: DoctorAvailability): string[] {
    try {
      return generateAvailableSlots(date, availability as any);
    } catch (e) {
      console.error('[BookingService] generateAvailableSlots error:', e);
      return [];
    }
  }

  async getAvailableSlotsForDate(date: string, doctorId?: string): Promise<string[]> {
    const did = doctorId || this.uid();
    const availability = this.availability || await this.getPublicDoctorAvailability(did);
    if (!availability) return [];

    const allSlots = this.generateAvailableSlots(date, availability);
    if (allSlots.length === 0) return [];

    // Query both tables from Supabase ONLY ONCE for the entire day
    let requests: AppointmentRequest[];
    let confirmedAppointments: { date: string; time: string }[] = [];

    if (this.userId === did) {
      requests = this.requests;
      const today = getLocalISODate();
      const { data: apptData, error: apptError } = await supabase
        .from('appointments')
        .select('date, time')
        .eq('doctor_id', did)
        .eq('status', 'Programada')
        .gte('date', today);
      if (apptError) throw apptError;
      confirmedAppointments = (apptData || []).map(a => ({ date: a.date, time: a.time }));
    } else {
      const [reqs, appts] = await Promise.all([
        this.getPublicAppointmentRequests(did),
        this.getPublicAppointments(did),
      ]);
      requests = reqs;
      confirmedAppointments = appts;
    }

    return allSlots.filter(time => {
      const requestConflict = requests.some(r =>
        r.requestedDate === date &&
        r.requestedTime === time &&
        r.status !== 'rejected'
      );
      if (requestConflict) return false;

      const appointmentConflict = confirmedAppointments.some(a =>
        a.date === date && a.time === time
      );
      if (appointmentConflict) return false;

      return true;
    });
  }

  async isSlotAvailable(date: string, time: string, doctorId?: string): Promise<boolean> {
    const availableSlots = await this.getAvailableSlotsForDate(date, doctorId);
    return availableSlots.includes(time);
  }

  getAvailableDates(daysAhead: number = 30, externalAvailability?: DoctorAvailability): string[] {
    const availability = externalAvailability || this.getDoctorAvailability();
    const dates: string[] = [];
    const today = new Date();
    
    // Empezamos desde hoy (0) en adelante
    for (let i = 0; i <= daysAhead; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      date.setDate(date.getDate() + i);
      const dateStr = getLocalISODate(date);
      
      const dayConfig = availability.weeklySchedule.find(d => d.dayOfWeek === date.getDay());
      if (dayConfig?.enabled && dayConfig.timeSlots.length > 0) {
        // Validation for 'today' to ensure there are still future slots
        if (i === 0) {
          const futureSlots = this.generateAvailableSlots(dateStr, availability);
          if (futureSlots.length > 0) {
            dates.push(dateStr);
          }
        } else {
          dates.push(dateStr);
        }
      }
    }
    return dates;
  }
}

// ===================== DB Mappers =====================

function dbToAvailability(d: any): DoctorAvailability {
  return {
    id: d.id || `avail_${d.doctor_id}`,
    doctorId: d.doctor_id,
    weeklySchedule: d.weekly_schedule || [],
    slotDuration: d.slot_duration || 30,
    bufferTime: d.buffer_time || 15,
    advanceBookingDays: d.advance_booking_days || 30,
    lastUpdated: d.updated_at || new Date().toISOString(),
  };
}

function dbToSettings(d: any): PublicBookingSettings {
  return {
    doctorName: d.doctor_name || '',
    clinicName: d.clinic_name || '',
    description: d.description || '',
    availableTypes: d.available_types || ['Consulta'],
    requirePhone: d.require_phone ?? true,
    requireMessage: d.require_message ?? false,
    confirmationMessage: d.confirmation_message || '',
    isActive: d.is_active ?? true,
  };
}

function dbToRequest(d: any): AppointmentRequest {
  return {
    id: d.id,
    patientName: d.patient_name,
    patientEmail: d.patient_email,
    patientPhone: d.patient_phone || '',
    requestedDate: d.requested_date,
    requestedTime: d.requested_time,
    appointmentType: d.appointment_type,
    message: d.message,
    status: d.status,
    createdAt: d.created_at,
    respondedAt: d.responded_at,
    doctorId: d.doctor_id,
  };
}

export const bookingService = new BookingService();
