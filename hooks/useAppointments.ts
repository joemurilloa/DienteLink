import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { useAuth } from '../services/authService';
import { sileo } from 'sileo';

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
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', user.id)
        .order('date')
        .order('time');
        
      if (error) {
        console.error('Error fetching appointments:', error);
        throw new Error(error.message);
      }
      return (data || []).map(dbToAppointment);
    },
    enabled: !!user?.id,
  });
}

export function useAppointmentMutations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createMutation = useMutation({
    mutationFn: async (appointment: Appointment) => {
      if (!user?.id) throw new Error('No doctor mapped');
      
      const { data, error } = await supabase.from('appointments').upsert({
        id: appointment.id,
        doctor_id: user.id,
        patient_id: appointment.patientId || null,
        patient_name: appointment.patientName,
        phone_number: appointment.phoneNumber || null,
        time: appointment.time,
        date: appointment.date,
        type: appointment.type,
        status: appointment.status,
        reminder_status: appointment.reminderStatus,
        deleted_at: appointment.deletedAt || null,
      }, { onConflict: 'id' }).select().single();

      if (error) {
        console.error('[Supabase Upsert Error - CREATE]:', error);
        throw error;
      }
      return dbToAppointment(data);
    },
    onMutate: async (newAppointment) => {
      // Cancel queries
      await queryClient.cancelQueries({ queryKey: ['appointments', user?.id] });
      const previous = queryClient.getQueryData<Appointment[]>(['appointments', user?.id]);
      
      // Optimistically update
      if (previous) {
        const idx = previous.findIndex(a => a.id === newAppointment.id);
        const next = [...previous];
        if (idx !== -1) next[idx] = newAppointment;
        else next.push(newAppointment);
        queryClient.setQueryData(['appointments', user?.id], next);
      }
      return { previous };
    },
    onError: (err, newAppointment, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['appointments', user?.id], context.previous);
      }
      sileo.error({ title: 'Error', description: 'No se pudo agendar la cita en la nube.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      if (!user?.id) throw new Error('No doctor mapped');
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'Eliminada', deleted_at: deletedAt })
        .eq('id', appointmentId)
        .eq('doctor_id', user.id);
      if (error) throw error;
      return appointmentId;
    },
    onMutate: async (appointmentId) => {
      await queryClient.cancelQueries({ queryKey: ['appointments', user?.id] });
      const previous = queryClient.getQueryData<Appointment[]>(['appointments', user?.id]);
      if (previous) {
        queryClient.setQueryData(['appointments', user?.id], previous.map(a => 
          a.id === appointmentId ? { ...a, status: 'Eliminada', deletedAt: new Date().toISOString() } : a
        ));
      }
      return { previous };
    },
    onError: (err, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['appointments', user?.id], context.previous);
      }
      sileo.error({ title: 'Error', description: 'No se pudo eliminar la cita.' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (appointment: Appointment) => {
      if (!user?.id) throw new Error('No doctor mapped');
      const { data, error } = await supabase.from('appointments').upsert({
        id: appointment.id,
        doctor_id: user.id,
        patient_id: appointment.patientId || null,
        patient_name: appointment.patientName,
        phone_number: appointment.phoneNumber || null,
        time: appointment.time,
        date: appointment.date,
        type: appointment.type,
        status: appointment.status,
        reminder_status: appointment.reminderStatus,
        deleted_at: appointment.deletedAt || null,
      }, { onConflict: 'id' }).select().single();
      if (error) {
        console.error('[Supabase Upsert Error - UPDATE]:', error);
        throw error;
      }
      return dbToAppointment(data);
    },
    onMutate: async (newAppt) => {
      await queryClient.cancelQueries({ queryKey: ['appointments', user?.id] });
      const previous = queryClient.getQueryData<Appointment[]>(['appointments', user?.id]);
      if (previous) {
        queryClient.setQueryData(['appointments', user?.id], previous.map(a => a.id === newAppt.id ? newAppt : a));
      }
      return { previous };
    },
    onError: (err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['appointments', user?.id], context.previous);
      sileo.error({ title: 'Error', description: 'No se pudo actualizar la cita.' });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] })
  });
  
  return { 
    createAppointment: createMutation, 
    deleteAppointment: deleteMutation,
    updateAppointment: updateMutation
  };
}
