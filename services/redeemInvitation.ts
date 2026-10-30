import { supabase } from '../lib/supabase';

// Acepta una invitación de equipo si el correo del usuario tiene una pendiente.
// Vive aparte para que el inicio de sesión no dependa del resto del equipo.
// El RPC rechaza dueños con clínica/datos (anti-hijack).
export async function redeemPendingInvitation(_userId: string, _userEmail: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('redeem_team_invitation');
    if (error) {
      console.warn('redeem_team_invitation:', error.message);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}
