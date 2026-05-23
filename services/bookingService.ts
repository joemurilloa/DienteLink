import { supabase } from '../lib/supabase';
import { getLocalISODate } from '../lib/utils';
import { DoctorAvailability, AppointmentRequest, PublicBookingSettings, AppointmentType } from '../types';
import { formatAppDate } from '../lib/utils';
import { sileo } from 'sileo';
import 'sileo/styles.css';

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
  private realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

  // --- Initialization ---
  async init(userId: string): Promise<void> {
    this.userId = userId;

    const [availRes, settingsRes, reqRes] = await Promise.all([
      supabase.from('doctor_availability').select('*').eq('doctor_id', userId).maybeSingle(),
      supabase.from('booking_settings').select('*').eq('doctor_id', userId).maybeSingle(),
      supabase.from('appointment_requests').select('*').eq('doctor_id', userId).order('created_at', { ascending: false }),
    ]);

    this.availability = availRes.data ? dbToAvailability(availRes.data) : this.getDefaultAvailability(userId);
    this.settings = settingsRes.data ? dbToSettings(settingsRes.data) : null;
    this.requests = (reqRes.data || []).map(dbToRequest);
    this._ready = true;

    // Subscribe to realtime updates for this doctor
    this.setupRealtime(userId);
  }

  private setupRealtime(userId: string) {
    if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = supabase.channel(`public:appointment_requests:doctor_id=eq.${userId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'appointment_requests', filter: `doctor_id=eq.${userId}` },
            (payload) => {
                const newReq = dbToRequest(payload.new);
                // Avoid duplicates if we created it locally from the same browser
                if (!this.requests.find(r => r.id === newReq.id)) {
                    this.requests.unshift(newReq);
                    window.dispatchEvent(new CustomEvent('newAppointmentRequest', { detail: newReq }));
                    sileo.info({
                        title: '¡Nueva solicitud de cita en línea!',
                        description: `${newReq.patientName} ha pedido una cita el ${formatAppDate(newReq.requestedDate)} a las ${newReq.requestedTime}.`
                    });
                }
            }
        )
        .subscribe();
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
  }

  private uid(): string {
    if (!this.userId) throw new Error('BookingService not initialized');
    return this.userId;
  }

  getDoctorId(): string {
    return this.uid();
  }

  generatePublicBookingUrl(): string {
    const doctorId = this.uid();
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/p/${doctorId}`;
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
    const doctorId = this.uid();
    availability.lastUpdated = new Date().toISOString();
    this.availability = availability;

    const { error } = await supabase.from('doctor_availability').upsert({
      doctor_id: doctorId,
      weekly_schedule: availability.weeklySchedule,
      slot_duration: availability.slotDuration,
      buffer_time: availability.bufferTime,
      advance_booking_days: availability.advanceBookingDays,
      updated_at: availability.lastUpdated,
    }, { onConflict: 'doctor_id' });

    if (error) {
      console.error('[Supabase] saveDoctorAvailability error:', error);
      sileo.error({ title: 'Error al guardar disponibilidad', description: 'Los cambios no se pudieron sincronizar.' });
    }
    window.dispatchEvent(new CustomEvent('availabilityUpdated', { detail: availability }));
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

    const { error } = await supabase.from('booking_settings').upsert({
      doctor_id: doctorId,
      doctor_name: settings.doctorName,
      clinic_name: settings.clinicName,
      description: settings.description,
      available_types: settings.availableTypes,
      require_phone: settings.requirePhone,
      require_message: settings.requireMessage,
      confirmation_message: settings.confirmationMessage,
      is_active: settings.isActive,
    }, { onConflict: 'doctor_id' });

    if (error) {
      console.error('[Supabase] saveBookingSettings error:', error);
      sileo.error({ title: 'Error al guardar configuración', description: 'Verifica tu conexión e intenta de nuevo.' });
    }
  }

  // ===================== APPOINTMENT REQUESTS =====================

  getAppointmentRequests(): AppointmentRequest[] {
    return this.requests;
  }

  getPendingRequests(): AppointmentRequest[] {
    return this.requests.filter(r => r.status === 'pending');
  }

  /** Re-fetch requests from Supabase to pick up requests created by the public page */
  async refreshRequests(): Promise<void> {
    const userId = this.uid();
    const { data, error } = await supabase
      .from('appointment_requests')
      .select('*')
      .eq('doctor_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase] refreshRequests error:', error);
      return;
    }
    this.requests = (data || []).map(dbToRequest);
  }

  async approveRequest(requestId: string): Promise<AppointmentRequest | null> {
    const request = this.requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'approved';
    request.respondedAt = new Date().toISOString();

    await supabase.from('appointment_requests').update({
      status: 'approved',
      responded_at: request.respondedAt,
    }).eq('id', requestId);

    return request;
  }

  async rejectRequest(requestId: string): Promise<AppointmentRequest | null> {
    const request = this.requests.find(r => r.id === requestId);
    if (!request || request.status !== 'pending') return null;

    request.status = 'rejected';
    request.respondedAt = new Date().toISOString();

    await supabase.from('appointment_requests').update({
      status: 'rejected',
      responded_at: request.respondedAt,
    }).eq('id', requestId);

    return request;
  }

  /** Change status of any request (re-approve, re-reject, or set back to pending) */
  async updateRequestStatus(requestId: string, newStatus: 'pending' | 'approved' | 'rejected'): Promise<AppointmentRequest | null> {
    const request = this.requests.find(r => r.id === requestId);
    if (!request) return null;

    request.status = newStatus;
    request.respondedAt = newStatus === 'pending' ? undefined : new Date().toISOString();

    const { error } = await supabase.from('appointment_requests').update({
      status: newStatus,
      responded_at: request.respondedAt || null,
    }).eq('id', requestId);

    if (error) {
      console.error('[Supabase] updateRequestStatus error:', error);
      sileo.error({ title: 'Error al actualizar solicitud', description: 'No se pudo cambiar el estado de la solicitud.' });
    }
    return request;
  }

  /** Delete a request permanently */
  async deleteRequest(requestId: string): Promise<void> {
    this.requests = this.requests.filter(r => r.id !== requestId);

    const { error } = await supabase.from('appointment_requests').delete().eq('id', requestId);
    if (error) {
      console.error('[Supabase] deleteRequest error:', error);
      sileo.error({ title: 'Error al eliminar solicitud', description: 'No se pudo eliminar la solicitud.' });
    }
  }

  // ===================== PUBLIC METHODS (no auth required) =====================

   async getPublicBookingSettings(doctorId: string): Promise<PublicBookingSettings> {
     // Use RPC function (bypasses RLS via SECURITY DEFINER)
     const { data, error } = await supabase
       .rpc('get_public_booking_settings', { p_doctor_id: doctorId });

     if (error) {
       console.error('[Supabase] getPublicBookingSettings RPC error:', error);
       throw error;
     }

     if (!data || data.length === 0) {
       // Return default active settings if no configuration exists
       return this.getDefaultBookingSettings();
     }

     return dbToSettings(data[0]);
   }

   async getPublicDoctorAvailability(doctorId: string): Promise<DoctorAvailability> {
     // Use RPC function (bypasses RLS via SECURITY DEFINER)
     const { data, error } = await supabase
       .rpc('get_public_doctor_availability', { p_doctor_id: doctorId });

     if (error) {
       console.error('[Supabase] getPublicDoctorAvailability RPC error:', error);
       throw error;
     }

     if (!data || data.length === 0) {
       // Return default availability if no configuration exists
       return this.getDefaultAvailability(doctorId);
     }

     return dbToAvailability(data[0]);
   }

   async getPublicAppointmentRequests(doctorId: string): Promise<AppointmentRequest[]> {
     // Try RPC function (bypasses RLS)
     const { data: rpcData, error: rpcError } = await supabase
       .rpc('get_public_appointment_requests', { p_doctor_id: doctorId });

     let data = rpcData;

     if (rpcError) {
       console.error('[Supabase] getPublicAppointmentRequests RPC error:', rpcError);
       // Fallback to direct query
       const fallback = await supabase
         .from('appointment_requests')
         .select('id, requested_date, requested_time, appointment_type, status, doctor_id')
         .eq('doctor_id', doctorId)
         .neq('status', 'rejected'); // We only care about pending or approved
         
       if (fallback.error) {
         console.error('[Supabase] getPublicAppointmentRequests direct query failed:', fallback.error);
         return []; // Return empty so it doesn't crash the page
       }
       data = fallback.data;
     }

     // Map response to AppointmentRequest array
     return (data || []).map((d: any) => ({
       id: d.id,
       patientName: '',
       patientEmail: '',
       patientPhone: '',
       requestedDate: d.requested_date,
       requestedTime: d.requested_time,
       appointmentType: d.appointment_type,
       status: d.status,
       createdAt: '',
       doctorId,
     }));
   }

  /** Fetch confirmed appointments from the appointments table (for public slot checking) */
  async getPublicAppointments(doctorId: string): Promise<{ date: string; time: string }[]> {
    // Try RPC function first (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_public_appointments', { p_doctor_id: doctorId });

    if (!rpcError && rpcData) {
      return rpcData.map((a: any) => ({ date: a.date, time: a.time }));
    }

    // Fallback to direct query
    const { data } = await supabase
      .from('appointments')
      .select('date, time')
      .eq('doctor_id', doctorId)
      .in('status', ['Programada', 'Completada']);

    return (data || []).map(a => ({ date: a.date, time: a.time }));
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
    const { error: insertError } = await supabase.from('appointment_requests').insert({
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

    if (insertError) {
      console.error('[Supabase] createAppointmentRequest error:', insertError);
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
    const targetDate = new Date(date);
    // Parse targetDate properly from YYYY-MM-DD
    const [y, m, d] = date.split('-').map(Number);
    const localTargetDate = new Date(y, m - 1, d);
    const dayOfWeek = localTargetDate.getDay();
    const dayConfig = availability.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!dayConfig || !dayConfig.enabled) return [];

    const slots: string[] = [];
    
    // Calculate current time in minutes to filter out past slots if the date is today
    const nowLocal = new Date();
    const isToday = nowLocal.getFullYear() === y && nowLocal.getMonth() === m - 1 && nowLocal.getDate() === d;
    const currentMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
    // Add a 30-minute buffer so they can't book for "right now"
    const minimumMinutes = isToday ? currentMinutes + 30 : 0;

    for (const ts of dayConfig.timeSlots) {
      const start = timeToMinutes(ts.start);
      const end = timeToMinutes(ts.end);
      for (let t = start; t < end; t += availability.slotDuration) {
        if (t >= minimumMinutes) {
          slots.push(minutesToTime(t));
        }
      }
    }
    return slots;
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
      const { data: apptData } = await supabase
        .from('appointments')
        .select('date, time')
        .eq('doctor_id', did)
        .in('status', ['Programada', 'Completada']);
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

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

export const bookingService = new BookingService();