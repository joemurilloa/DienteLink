import { supabase } from '../lib/supabase';

// Acepta una invitación de equipo si el correo del usuario tiene una pendiente.
// Vive aparte para que el inicio de sesión no dependa del resto del equipo.
export async function redeemPendingInvitation(userId: string, userEmail: string): Promise<boolean> {
  try {
    const { data: invite, error: fetchError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('email', userEmail.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError || !invite) return false;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ clinic_id: invite.clinic_id, role: invite.role })
      .eq('id', userId);

    if (updateError) return false;

    await supabase
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    return true;
  } catch {
    return false;
  }
}
