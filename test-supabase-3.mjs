import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = 'https://jrzydxpcyonrzhbpzibc.supabase.co';
const supabaseKey = 'sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testDelete() {
  // First get a real appointment
  const { data: appt, error: err1 } = await supabase
    .from('appointments')
    .select('*')
    .limit(1)
    .single();

  if (err1) {
    console.log('Failed to fetch:', err1);
    return;
  }

  console.log('Found appointment:', appt.id);

  // Try to delete it (set status to Eliminada)
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'Eliminada', deleted_at: new Date().toISOString() })
    .eq('id', appt.id);

  console.log('Update Result:', { data, error });
}

testDelete();
