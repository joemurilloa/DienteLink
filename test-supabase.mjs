import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrzydxpcyonrzhbpzibc.supabase.co';
const supabaseKey = 'sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'Eliminada', deleted_at: new Date().toISOString() })
    .eq('id', 'dummy-uuid-1234')
    .eq('doctor_id', 'dummy-doctor-id');

  console.log('Result:', { data, error });
}

testUpdate();
