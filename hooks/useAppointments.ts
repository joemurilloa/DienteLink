import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';

import { DEMO_APPOINTMENTS } from '../lib/demoData';


// Map DB row to UI model
function dbToAppointment(a: any): Appointment {
  return {
    id: a.id,
    patientId: a.patient_id || '',
    patientName: a.patient_name || '',
    phoneNumber: a.phone_number || '',
    time: a.time,
    date: a.date,
    type: a.type,
    status: a.status,
    reminderStatus: a.reminder_status || 'not_sent',
    deletedAt: a.deleted_at || undefined,
  };
}

export function useAppointments() {
  const { user, clinicId, isGuest } = useAuth();
  
  return useQuery({
    queryKey: ['appointments', clinicId],
    queryFn: async () => {
      // Guest mode: return demo data without hitting Supabase
      if (isGuest) return DEMO_APPOINTMENTS;

      if (!clinicId) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', clinicId)
        .order('date')
        .order('time');
        
      if (error) {
        console.error('Error fetching appointments:', error);
        throw new Error(error.message);
      }
      return (data || []).map(dbToAppointment);
    },
    enabled: !!clinicId,
  });
}

export function useAppointmentMutations() {
  const queryClient = useQueryClient();
  const { user, profile, clinicId, isGuest } = useAuth();

  // In guest mode: mutations update the local query cache only (no Supabase)
  const guestMutate = async (updater: (prev: Appointment[]) => Appointment[]) => {
    const prev = queryClient.getQueryData<Appointment[]>(['appointments', 'demo']) || DEMO_APPOINTMENTS;
    queryClient.setQueryData(['appointments', 'demo'], updater(prev));
  };

  const createMutation = useMutation({
    mutationFn: async (appointment: Appointment) => {
      // Guest mode: just update local state
      if (isGuest) {
        await guestMutate(prev => [appointment, ...prev]);
        return appointment;
      }

      if (!clinicId) throw new Error('No doctor/clinic mapped');

      // Calculate reminder_scheduled_at: 24 hours before the appointment
      let reminderScheduledAt: string | null = null;
      try {
        const apptDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
        if (!isNaN(apptDateTime.getTime())) {
          reminderScheduledAt = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
        }
      } catch (e) {
        console.warn('Could not calculate reminder_scheduled_at:', e);
      }

      const { data, error } = await supabase.from('appointments').insert({
        id: appointment.id,
        doctor_id: clinicId,
        patient_id: appointment.patientId || null,
        patient_name: appointment.patientName,
        phone_number: appointment.phoneNumber || null,
        time: appointment.time,
        date: appointment.date,
        type: appointment.type,
        status: appointment.status,
        reminder_status: appointment.reminderStatus,
        reminder_scheduled_at: reminderScheduledAt,
        deleted_at: appointment.deletedAt || null,
      }).select().single();

      if (error) {
        console.error('[Supabase Error - CREATE]:', error);
        throw error;
      }

      // Automatically trigger WhatsApp immediate confirmation
      if (appointment.status === 'Programada') {
        supabase.functions.invoke('whatsapp-confirmation', {
          body: { appointment_id: data.id }
        }).catch(err => console.error('WhatsApp confirmation failed to trigger:', err));
      }



      return dbToAppointment(data);
    },
    onMutate: async (newAppointment) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['appointments', clinicId] });
      const previous = queryClient.getQueryData<Appointment[]>(['appointments', clinicId]);
      
      // Optimistically update
      if (previous) {
        const idx = previous.findIndex(a => a.id === newAppointment.id);
        const next = [...previous];
        if (idx !== -1) next[idx] = newAppointment;
        else next.push(newAppointment);
        queryClient.setQueryData(['appointments', clinicId], next);
      }
      return { previous };
    },
    onError: (err, newAppointment, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['appointments', clinicId], context.previous);
      }
      sileo.error({ title: 'Error', description: 'No se pudo agendar la cita en la nube.' });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      // Guest mode: just update local state
      if (isGuest) {
        await guestMutate(prev => prev.map(a =>
          a.id === appointmentId ? { ...a, status: 'Eliminada' as const, deletedAt: new Date().toISOString() } : a
        ));
        return appointmentId;
      }

      if (!clinicId) throw new Error('No doctor/clinic mapped');
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'Eliminada', deleted_at: deletedAt })
        .eq('id', appointmentId)
        .eq('doctor_id', clinicId);
      
      if (error) {
        console.error('[Supabase Error - DELETE/UPDATE]:', error);
        throw error;
      }
      return appointmentId;
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: ['appointments', clinicId] });
      const previous = queryClient.getQueryData<Appointment[]>(['appointments', clinicId]);
      if (previous) {
        queryClient.setQueryData(['appointments', clinicId], previous.map(a => 
          a.id === appointmentId ? { ...a, status: 'Eliminada', deletedAt: new Date().toISOString() } : a
        ));
      }
      return { previous };
    },
    onError: (err, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['appointments', clinicId], context.previous);
      }
      sileo.error({ title: 'Error', description: 'No se pudo eliminar la cita.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (appointment: Appointment) => {
      // Guest mode: just update local state
      if (isGuest) {
        await guestMutate(prev => prev.map(a => a.id === appointment.id ? appointment : a));
        return appointment;
      }

      if (!clinicId) throw new Error('No doctor/clinic mapped');

      // Recalculate reminder_scheduled_at when date/time change
      let reminderScheduledAt: string | null = null;
      try {
        const apptDateTime = new Date(`${appointment.date}T${appointment.time}:00`);
        if (!isNaN(apptDateTime.getTime())) {
          reminderScheduledAt = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000).toISOString();
        }
      } catch (e) {
        console.warn('Could not calculate reminder_scheduled_at:', e);
      }

      const { data, error } = await supabase.from('appointments').update({
        doctor_id: clinicId,
        patient_id: appointment.patientId || null,
        patient_name: appointment.patientName,
        phone_number: appointment.phoneNumber || null,
        time: appointment.time,
        date: appointment.date,
        type: appointment.type,
        status: appointment.status,
        reminder_status: appointment.reminderStatus,
        reminder_scheduled_at: reminderScheduledAt,
        deleted_at: appointment.deletedAt || null,
      }).eq('id', appointment.id).select().single();
      if (error) {
        console.error('[Supabase Error - UPDATE]:', error);
        throw error;
      }



      return dbToAppointment(data);
    },
    onMutate: async (newAppt) => {
      await queryClient.cancelQueries({ queryKey: ['appointments', clinicId] });
      const previous = queryClient.getQueryData<Appointment[]>(['appointments', clinicId]);
      if (previous) {
        queryClient.setQueryData(['appointments', clinicId], previous.map(a => a.id === newAppt.id ? newAppt : a));
      }
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['appointments', clinicId], context.previous);
      sileo.error({ title: 'Error', description: 'No se pudo actualizar la cita.' });
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: ['appointments', clinicId] })
  });
  
  return { 
    createAppointment: createMutation, 
    deleteAppointment: deleteMutation,
    updateAppointment: updateMutation
  };
}
