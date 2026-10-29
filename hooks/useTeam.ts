import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth, DoctorProfile } from '../services/authService';
import { TeamInvitation, UserRole } from '../types';
import { sileo } from 'sileo';
import { roleLabel } from '../lib/roles';

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

    // 3. Send Invitation Mutation (creates DB record; no email)
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
            sileo.success({
                title: 'Invitación creada',
                description: 'El usuario puede unirse ingresando con ese correo.',
            });
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
            const { error } = await supabase.rpc('remove_team_member', { p_member_id: memberId });
            if (error) throw new Error(error.message);
            return memberId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers', clinicId] });
            sileo.success({ title: 'Miembro removido del equipo' });
        },
        onError: (error: Error) => {
            sileo.error({ title: 'Error al remover', description: error.message });
        }
    });

    // 6. Update Member Role Mutation
    const updateRoleMutation = useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: UserRole }) => {
            const { error } = await supabase.rpc('set_team_member_role', {
                p_member_id: memberId,
                p_role: role,
            });
            if (error) throw new Error(error.message);
            return { memberId, role };
        },
        onSuccess: (_, { role }) => {
            queryClient.invalidateQueries({ queryKey: ['teamMembers', clinicId] });
            sileo.success({ title: 'Rol actualizado', description: `Rol cambiado a ${roleLabel(role)}` });
        },
        onError: (error: Error) => {
            sileo.error({ title: 'Error al cambiar rol', description: error.message });
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
        updateMemberRole: updateRoleMutation.mutateAsync,
        isUpdatingRole: updateRoleMutation.isPending,
    };
}

export { redeemPendingInvitation } from '../services/redeemInvitation';
