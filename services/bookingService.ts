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

    if (error) console.error('[Supabase] saveDoctorAvailability error:', error);
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

    if (error) console.error('[Supabase] saveBookingSettings error:', error);
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

    if (error) console.error('[Supabase] updateRequestStatus error:', error);
    return request;
  }

  /** Delete a request permanently */
  async deleteRequest(requestId: string): Promise<void> {
    this.requests = this.requests.filter(r => r.id !== requestId);

    const { error } = await supabase.from('appointment_requests').delete().eq('id', requestId);
    if (error) console.error('[Supabase] deleteRequest error:', error);
  }

  // ===================== PUBLIC METHODS (no auth required) =====================

  async getPublicBookingSettings(doctorId: string): Promise<PublicBookingSettings> {
    // Try RPC function first (bypasses RLS via SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_public_booking_settings', { p_doctor_id: doctorId });

    if (!rpcError && rpcData && rpcData.length > 0) {
      return dbToSettings(rpcData[0]);
    }

    // Fallback to direct query (works if RLS policies allow anon access)
    const { data, error } = await supabase
      .from('booking_settings')
      .select('*')
      .eq('doctor_id', doctorId)
      .maybeSingle();

    if (!error && data) {
      return dbToSettings(data);
    }

    // Ultimate fallback: if row doesn't exist in DB, return default active settings
    return this.getDefaultBookingSettings();
  }

  async getPublicDoctorAvailability(doctorId: string): Promise<DoctorAvailability> {
    // Try RPC function first (bypasses RLS via SECURITY DEFINER)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_public_doctor_availability', { p_doctor_id: doctorId });

    if (!rpcError && rpcData && rpcData.length > 0) {
      return dbToAvailability(rpcData[0]);
    }

    // Fallback to direct query (works if RLS policies allow anon access)
    const { data, error } = await supabase
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .maybeSingle();

    if (!error && data) {
      return dbToAvailability(data);
    }

    // Ultimate fallback: if row doesn't exist in DB, return default mon-fri schedule
    return this.getDefaultAvailability(doctorId);
  }

  async getPublicAppointmentRequests(doctorId: string): Promise<AppointmentRequest[]> {
    // Try RPC function first (bypasses RLS)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_public_appointment_requests', { p_doctor_id: doctorId });

    if (!rpcError && rpcData) {
      return rpcData.map((d: any) => ({
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

    // Fallback to direct query
    const { data } = await supabase
      .from('appointment_requests')
      .select('id, requested_date, requested_time, status, appointment_type')
      .eq('doctor_id', doctorId)
      .in('status', ['pending', 'approved']);

    return (data || []).map(d => ({
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

  // ===================== TIME SLOT GENERATION (pure logic, no DB) =====================

  generateAvailableSlots(date: string, availability: DoctorAvailability): string[] {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const dayConfig = availability.weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);
    if (!dayConfig || !dayConfig.enabled) return [];

    const slots: string[] = [];
    for (const ts of dayConfig.timeSlots) {
      const start = timeToMinutes(ts.start);
      const end = timeToMinutes(ts.end);
      for (let t = start; t < end; t += availability.slotDuration) {
        slots.push(minutesToTime(t));
      }
    }
    return slots;
  }

  async isSlotAvailable(date: string, time: string, doctorId?: string): Promise<boolean> {
    const did = doctorId || this.uid();
    const availability = this.availability || await this.getPublicDoctorAvailability(did);
    if (!availability) return false;

    const availableSlots = this.generateAvailableSlots(date, availability);
    if (!availableSlots.includes(time)) return false;

    // Check conflicts against BOTH appointment_requests AND appointments tables
    let requests: AppointmentRequest[];
    let confirmedAppointments: { date: string; time: string }[] = [];

    if (this.userId === did) {
      requests = this.requests;
      // Also check in-memory appointments from persistenceService
      // (we import it dynamically to avoid circular dependency at module level)
      try {
        const { persistenceService } = await import('./persistenceService');
        const allAppointments = persistenceService.getAppointments();
        confirmedAppointments = allAppointments
          .filter(a => a.status !== 'Completada' || a.date >= getLocalISODate(new Date()))
          .map(a => ({ date: a.date, time: a.time }));
      } catch { /* ignore if not initialized */ }
    } else {
      // Public page: query both tables from Supabase
      const [reqs, appts] = await Promise.all([
        this.getPublicAppointmentRequests(did),
        this.getPublicAppointments(did),
      ]);
      requests = reqs;
      confirmedAppointments = appts;
    }

    // Block if any pending/approved request occupies this slot
    const requestConflict = requests.some(r =>
      r.requestedDate === date &&
      r.requestedTime === time &&
      r.status !== 'rejected'
    );
    if (requestConflict) return false;

    // Block if any confirmed appointment occupies this slot
    const appointmentConflict = confirmedAppointments.some(a =>
      a.date === date && a.time === time
    );
    if (appointmentConflict) return false;

    return true;
  }

  getAvailableDates(daysAhead: number = 30, externalAvailability?: DoctorAvailability): string[] {
    const availability = externalAvailability || this.getDoctorAvailability();
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= daysAhead; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayConfig = availability.weeklySchedule.find(d => d.dayOfWeek === date.getDay());
      if (dayConfig?.enabled && dayConfig.timeSlots.length > 0) {
        dates.push(getLocalISODate(date));
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