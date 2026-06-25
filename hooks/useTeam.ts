import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth, DoctorProfile } from '../services/authService';
import { TeamInvitation, UserRole } from '../types';
import { sileo } from 'sileo';

export function useTeam() {
    const { clinicId, profile } = useAuth();
    const queryClient = useQueryClient();

    // 1. Fetch Active Team Members (Profiles where clinic_id = my clinic_id or id = my clinic_id)
    const { data: teamMembers = [], isLoading: loadingMembers } = useQuery({
        queryKey: ['teamMembers', clinicId],
        queryFn: async (): Promise<DoctorProfile[]> => {
            if (!clinicId) return [];
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .or(`clinic_id.eq.${clinicId},id.eq.${clinicId}`);

            if (error) throw error;
            return data as DoctorProfile[];
        },
        enabled: !!clinicId,
    });

    // 2. Fetch Pending Invitations
    const { data: invitations = [], isLoading: loadingInvitations } = useQuery({
        queryKey: ['teamInvitations', clinicId],
        queryFn: async (): Promise<TeamInvitation[]> => {
            if (!clinicId) return [];
            const { data, error } = await supabase
                .from('team_invitations')
                .select('*')
                .eq('clinic_id', clinicId)
                .eq('status', 'pending');

            if (error) throw error;
            return data as TeamInvitation[];
        },
        enabled: !!clinicId && (profile?.role === 'owner' || profile?.role === 'admin'),
    });

    // 3. Send Invitation Mutation
    const inviteMutation = useMutation({
        mutationFn: async ({ email, role }: { email: string, role: UserRole }) => {
            if (!clinicId) throw new Error('No clinic ID');
            
            // Check if already invited
            const existing = invitations.find(i => i.email.toLowerCase() === email.toLowerCase());
            if (existing) throw new Error('Ya existe una invitación pendiente para este correo.');

            const { data, error } = await supabase
                .from('team_invitations')
                .insert([{ clinic_id: clinicId, email: email.toLowerCase(), role, status: 'pending' }])
                .select()
                .single();

            if (error) throw error;
            return data as TeamInvitation;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamInvitations', clinicId] });
            sileo.success({ title: 'Invitación enviada' });
        },
        onError: (error: Error) => {
            sileo.error({ title: 'Error al invitar', description: error.message });
        }
    });

    // 4. Cancel Invitation Mutation
    const cancelInviteMutation = useMutation({
        mutationFn: async (inviteId: string) => {
            const { error } = await supabase
                .from('team_invitations')
                .delete()
                .eq('id', inviteId);
            
            if (error) throw error;
            return inviteId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamInvitations', clinicId] });
            sileo.success({ title: 'Invitación cancelada' });
        },
        onError: () => {
            sileo.error({ title: 'Error al cancelar' });
        }
    });

    // 5. Remove Team Member Mutation (Unlink from clinic)
    const removeMemberMutation = useMutation({
        mutationFn: async (memberId: string) => {
            // Unlinking a member sets their clinic_id to null and role back to owner/doctor
            const { error } = await supabase
                .from('profiles')
                .update({ clinic_id: null, role: 'owner' })
                .eq('id', memberId)
                .eq('clinic_id', clinicId);

            if (error) throw error;
            return memberId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers', clinicId] });
            sileo.success({ title: 'Miembro removido del equipo' });
        },
        onError: () => {
            sileo.error({ title: 'Error al remover' });
        }
    });

    return {
        teamMembers,
        invitations,
        loading: loadingMembers || loadingInvitations,
        inviteMember: inviteMutation.mutateAsync,
        isInviting: inviteMutation.isPending,
        cancelInvitation: cancelInviteMutation.mutateAsync,
        removeMember: removeMemberMutation.mutateAsync,
    };
}
