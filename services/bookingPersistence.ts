import { supabase } from '../lib/supabase';
import { getCache, setCache, delCache } from '../lib/simpleCache';

// Persistence helpers for BookingService. These wrap Supabase queries / RPCs
// and centralize error handling for DB access.

export async function fetchDoctorInitData(doctorId: string) {
  const [availRes, settingsRes, reqRes] = await Promise.all([
    supabase.from('doctor_availability').select('*').eq('doctor_id', doctorId).maybeSingle(),
    supabase.from('booking_settings').select('*').eq('doctor_id', doctorId).maybeSingle(),
    supabase.from('appointment_requests').select('*').eq('doctor_id', doctorId).order('created_at', { ascending: false }),
  ]);

  return {
    availabilityRow: availRes.data ?? null,
    settingsRow: settingsRes.data ?? null,
    requestRows: reqRes.data ?? [],
  };
}

export async function upsertDoctorAvailability(doctorId: string, payload: any) {
  const { error } = await supabase.from('doctor_availability').upsert({ doctor_id: doctorId, ...payload }, { onConflict: 'doctor_id' });
  if (error) throw error;
  try { delCache(`public_availability:${doctorId}`); } catch (e) {}
}

export async function upsertBookingSettings(doctorId: string, payload: any) {
  const { error } = await supabase.from('booking_settings').upsert({ doctor_id: doctorId, ...payload }, { onConflict: 'doctor_id' });
  if (error) throw error;
  try { delCache(`public_booking_settings:${doctorId}`); } catch (e) {}
}

export async function fetchAppointmentRequests(doctorId: string) {
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
  } catch (e) {}
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

export async function fetchConfirmedAppointments(doctorId: string) {
  const cacheKey = `confirmed_appts:${doctorId}`;
  const cached: any = getCache(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('appointments')
    .select('date, time')
    .eq('doctor_id', doctorId)
    .in('status', ['Programada', 'Completada']);
  if (error) throw error;
  const result = data ?? [];
  setCache(cacheKey, result, 10 * 1000);
  return result;
}
