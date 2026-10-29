import { supabase } from '../lib/supabase';

// Acepta una invitación de equipo si el correo del usuario tiene una pendiente.
// Vive aparte para que el inicio de sesión no dependa del resto del equipo.
export async function redeemPendingInvitation(_userId: string, _userEmail: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('redeem_team_invitation');
    if (error || data !== true) return false;
    return true;
  } catch {
    return false;
  }
}
