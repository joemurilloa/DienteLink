import { supabase } from '../lib/supabase';
import { TeamInvitation, UserRole } from '../types';

export const teamService = {
  // Generates an invitation for a specific email
  inviteMember: async (clinicId: string, email: string, role: UserRole) => {
    const { data, error } = await supabase
      .from('team_invitations')
      .insert({
        clinic_id: clinicId,
        email: email.toLowerCase(),
        role: role,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Gets pending invitations for a clinic
  getInvitations: async (clinicId: string) => {
    const { data, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('clinic_id', clinicId)
      .eq('status', 'pending');

    if (error) throw error;
    return data as TeamInvitation[];
  },

  // Revoke an invitation
  revokeInvitation: async (id: string) => {
    const { error } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Redeems invitation on signup
  redeemInvitation: async (userId: string, email: string) => {
    // Look for pending invitation — use .limit(1) instead of .single()/.maybeSingle()
    // to avoid 406 HTTP errors when no rows match
    const { data: invites } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .limit(1);

    const invite = invites?.[0];

    if (invite) {
      // Update profile with clinic_id and role
      await supabase
        .from('profiles')
        .update({
          clinic_id: invite.clinic_id,
          role: invite.role
        })
        .eq('id', userId);

      // Mark invitation as accepted
      await supabase
        .from('team_invitations')
        .update({ status: 'accepted' })
        .eq('id', invite.id);
    }
  }
};
