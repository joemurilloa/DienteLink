import { supabase } from '../lib/supabase';

// Create a Supabase realtime channel for appointment_requests INSERT events.
// Returns the channel object so callers can remove it via supabase.removeChannel(channel).
export function createAppointmentRequestsChannel(doctorId: string, onInsert: (newRow: any) => void) {
  const channel = supabase.channel(`public:appointment_requests:doctor_id=eq.${doctorId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'appointment_requests', filter: `doctor_id=eq.${doctorId}` },
      (payload) => {
        try {
          onInsert(payload.new);
        } catch (err) {
          console.error('[bookingRealtime] onInsert handler error:', err);
        }
      }
    )
    .subscribe();

  return channel;
}
