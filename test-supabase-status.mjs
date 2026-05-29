import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrzydxpcyonrzhbpzibc.supabase.co';
const supabaseKey = 'sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
  // First get a real appointment
  const { data: appt, error: fetchErr } = await supabase
    .from('appointments')
    .select('id, status, reminder_status')
    .limit(1)
    .single();

  if (fetchErr) {
    console.log('Fetch error:', fetchErr);
    return;
  }

  console.log('Current appointment:', appt);

  // Now test the exact update that deleteMutation does
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled', deleted_at: new Date().toISOString() })
    .eq('id', appt.id);

  console.log('Update to cancelled:', error ? `ERROR: ${error.message}` : 'SUCCESS');

  // If that failed, try other statuses
  if (error) {
    const statuses = ['Eliminada', 'Cancelada', 'cancelada', 'pending', 'Programada'];
    for (const s of statuses) {
      const { error: e2 } = await supabase
        .from('appointments')
        .update({ status: s })
        .eq('id', appt.id);
      console.log(`  Status '${s}' -> ${e2 ? `ERROR: ${e2.message}` : 'OK'}`);
    }
  }

  // Revert
  await supabase.from('appointments').update({ status: appt.status, deleted_at: null }).eq('id', appt.id);
  console.log('Reverted to original status:', appt.status);
}

checkConstraint();
