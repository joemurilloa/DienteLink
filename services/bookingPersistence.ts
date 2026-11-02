import { supabase } from '../lib/supabase';
import { getCache, setCache, delCache } from '../lib/simpleCache';
import { appointmentBlocksSlot, pickBookingPatient } from '../lib/approveLegacyMatch';
import { isMissingRpc, RpcSqlState } from '../lib/rpcErrors';

// Persistence helpers for BookingService. These wrap Supabase queries / RPCs
// and centralize error handling for DB access.

export async function fetchDoctorInitData(doctorId: string) {
  if (!doctorId || doctorId === 'demo') {
    return { availabilityRow: null, settingsRow: null, requestRows: [] };
  }

  const [availRes, settingsRes, reqRes] = await Promise.all([
    supabase.from('doctor_availability').select('*').eq('doctor_id', doctorId).maybeSingle(),
    supabase.from('booking_settings').select('*').eq('doctor_id', doctorId).maybeSingle(),
    supabase.from('appointment_requests').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false }),
  ]);

  if (availRes.error) throw availRes.error;
  if (settingsRes.error) throw settingsRes.error;
  if (reqRes.error) throw reqRes.error;

  return {
    availabilityRow: availRes.data ?? null,
    settingsRow: settingsRes.data ?? null,
    requestRows: reqRes.data ?? [],
  };
}

export async function upsertDoctorAvailability(doctorId: string, payload: any) {
  if (!doctorId || doctorId === 'demo') return;
  const { error } = await supabase.from('doctor_availability').upsert({ doctor_id: doctorId, ...payload }, { onConflict: 'doctor_id' });
  if (error) throw error;
  try { delCache(`public_availability:${doctorId}`); } catch (e) {}
}

export async function upsertBookingSettings(doctorId: string, payload: any) {
  if (!doctorId || doctorId === 'demo') return;
  const { error } = await supabase.from('booking_settings').upsert({ doctor_id: doctorId, ...payload }, { onConflict: 'doctor_id' });
  if (error) throw error;
  try { delCache(`public_booking_settings:${doctorId}`); } catch (e) {}
}

export async function fetchAppointmentRequests(doctorId: string) {
  if (!doctorId || doctorId === 'demo') return [];
  const { data, error } = await supabase
    .from('appointment_requests')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateAppointmentRequestStatus(requestId: string, newStatus: string, respondedAt: string | null) {
  const { error, data } = await supabase.from('appointment_requests').update({ status: newStatus, responded_at: respondedAt }).eq('id', requestId).select('doctor_id');
  if (error) throw error;
  try {
    const did = data?.[0]?.doctor_id;
    if (did) {
      delCache(`public_requests:${did}`);
      delCache(`public_appts:${did}`);
      delCache(`confirmed_appts:${did}`);
    }
  } catch (e) {
    console.warn('[bookingPersistence] cache invalidate failed', e);
  }
}

export type ApproveAppointmentResult = {
  request_id: string;
  status: string;
  idempotent?: boolean;
  patient_id: string | null;
  appointment_id: string | null;
  possible_duplicates: boolean;
  candidate_ids?: string[];
  matched_by?: string;
};

function approveError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

/**
 * Mismo resultado que approve_appointment_request, con columnas que ya existen
 * en producción. Se usa solo cuando el RPC todavía no está en el esquema.
 * Paciente, cita y solicitud van en llamadas distintas: si la cita no se crea,
 * se intenta borrar el paciente recién insertado.
 */
async function approveAppointmentRequestLegacy(
  requestId: string,
  forceOverlap: boolean,
): Promise<ApproveAppointmentResult> {
  const { data: request, error: reqErr } = await supabase
    .from('appointment_requests')
    .select('id, doctor_id, patient_name, patient_email, patient_phone, requested_date, requested_time, appointment_type, status')
    .eq('id', requestId)
    .maybeSingle();
  if (reqErr) throw reqErr;
  if (!request) throw approveError(RpcSqlState.NotFound, 'NOT_FOUND: solicitud no encontrada');
  if (request.status === 'approved') {
    return {
      request_id: request.id,
      status: 'approved',
      idempotent: true,
      patient_id: null,
      appointment_id: null,
      possible_duplicates: false,
    };
  }
  if (request.status !== 'pending') {
    throw approveError(RpcSqlState.InvalidState, `NOT_PENDING: la solicitud ya no está pendiente (${request.status})`);
  }

  const clinicId = request.doctor_id as string;
  if (!forceOverlap) {
    const { data: slots, error: slotErr } = await supabase
      .from('appointments')
      .select('id, status, deleted_at')
      .eq('doctor_id', clinicId)
      .eq('date', request.requested_date)
      .eq('time', request.requested_time);
    if (slotErr) throw slotErr;
    const blocked = (slots ?? []).some((row) => row.deleted_at == null && appointmentBlocksSlot(row.status));
    if (blocked) throw approveError(RpcSqlState.Conflict, 'APPOINTMENT_CONFLICT: horario ocupado');
  }

  const { data: people, error: peopleErr } = await supabase
    .from('patients')
    .select('id, full_name, phone, email')
    .eq('doctor_id', clinicId)
    .is('deleted_at', null);
  if (peopleErr) throw peopleErr;

  const match = pickBookingPatient(
    people ?? [],
    request.patient_name,
    request.patient_email,
    request.patient_phone,
  );
  const possibleDuplicates = match.kind === 'many';
  let patientId = match.kind === 'one' ? match.id : crypto.randomUUID();
  let createdPatient = false;

  if (match.kind !== 'one') {
    const { error: patientErr } = await supabase.from('patients').insert({
      id: patientId,
      doctor_id: clinicId,
      full_name: String(request.patient_name ?? '').trim(),
      phone: request.patient_phone || null,
      email: request.patient_email || null,
      consent_signed: false,
    });
    if (patientErr) throw patientErr;
    createdPatient = true;
  }

  const appointmentId = crypto.randomUUID();
  const { error: apptErr } = await supabase.from('appointments').insert({
    id: appointmentId,
    doctor_id: clinicId,
    patient_id: patientId,
    patient_name: String(request.patient_name ?? '').trim(),
    phone_number: request.patient_phone || null,
    date: request.requested_date,
    time: request.requested_time,
    type: request.appointment_type || 'Consulta',
    status: 'Programada',
    reminder_status: 'not_sent',
  });
  if (apptErr) {
    if (createdPatient) {
      await supabase.from('patients').delete().eq('id', patientId).eq('doctor_id', clinicId);
    }
    throw apptErr;
  }

  const { data: updated, error: updErr } = await supabase
    .from('appointment_requests')
    .update({ status: 'approved', responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id');
  if (updErr || !updated?.length) {
    await supabase.from('appointments').delete().eq('id', appointmentId).eq('doctor_id', clinicId);
    if (createdPatient) {
      await supabase.from('patients').delete().eq('id', patientId).eq('doctor_id', clinicId);
    }
    if (updErr) throw updErr;
    throw approveError(RpcSqlState.InvalidState, 'NOT_PENDING: la solicitud cambió durante la aprobación');
  }

  return {
    request_id: request.id,
    status: 'approved',
    idempotent: false,
    patient_id: patientId,
    appointment_id: appointmentId,
    possible_duplicates: possibleDuplicates,
    matched_by: match.kind === 'one' ? 'linked' : possibleDuplicates ? 'created_ambiguous' : 'created',
  };
}

/** Aprueba solicitud + paciente + cita. RPC si existe; si no, el esquema actual. */
export async function approveAppointmentRequestAtomic(
  requestId: string,
  forceOverlap = false,
): Promise<ApproveAppointmentResult> {
  const { data, error } = await supabase.rpc('approve_appointment_request', {
    p_request_id: requestId,
    p_force_overlap: forceOverlap,
  });
  if (!error) return data as ApproveAppointmentResult;
  if (!isMissingRpc(error)) throw error;
  return approveAppointmentRequestLegacy(requestId, forceOverlap);
}

export async function deleteAppointmentRequest(requestId: string) {
  const { error, data } = await supabase.from('appointment_requests').delete().eq('id', requestId).select('doctor_id');
  if (error) throw error;
  try {
    const did = data?.[0]?.doctor_id;
    if (did) {
      delCache(`public_requests:${did}`);
      delCache(`public_appts:${did}`);
      delCache(`confirmed_appts:${did}`);
    }
  } catch (e) {}
}

export async function insertAppointmentRequest(row: any) {
  const { error } = await supabase.from('appointment_requests').insert(row);
  if (error) throw error;
  // Invalidate related public caches so public pages pick up the new request quickly
  try {
    const did = row?.doctor_id;
    if (did) {
      delCache(`public_requests:${did}`);
      delCache(`public_appts:${did}`);
      delCache(`confirmed_appts:${did}`);
    }
  } catch (e) {}
}

// RPC wrappers for public pages
export async function rpcGetPublicBookingSettings(doctorId: string) {
  const cacheKey = `public_booking_settings:${doctorId}`;
  const cached: any = getCache(cacheKey);
  if (cached) return { data: cached, error: null };

  const res = await supabase.rpc('get_public_booking_settings', { p_doctor_id: doctorId });
  if (!res.error) setCache(cacheKey, res.data, 30 * 1000); // 30s cache
  return res;
}

export async function rpcGetPublicDoctorAvailability(doctorId: string) {
  const cacheKey = `public_availability:${doctorId}`;
  const cached: any = getCache(cacheKey);
  if (cached) return { data: cached, error: null };

  const res = await supabase.rpc('get_public_doctor_availability', { p_doctor_id: doctorId });
  if (!res.error) setCache(cacheKey, res.data, 15 * 1000); // 15s cache
  return res;
}

export async function rpcGetPublicAppointmentRequests(doctorId: string) {
  const cacheKey = `public_requests:${doctorId}`;
  const cached: any = getCache(cacheKey);
  if (cached) return { data: cached, error: null };

  const res = await supabase.rpc('get_public_appointment_requests', { p_doctor_id: doctorId });
  if (!res.error) setCache(cacheKey, res.data, 10 * 1000); // 10s cache
  return res;
}

export async function rpcGetPublicAppointments(doctorId: string) {
  const cacheKey = `public_appts:${doctorId}`;
  const cached: any = getCache(cacheKey);
  if (cached) return { data: cached, error: null };

  const res = await supabase.rpc('get_public_appointments', { p_doctor_id: doctorId });
  if (!res.error) setCache(cacheKey, res.data, 10 * 1000); // 10s cache
  return res;
}

