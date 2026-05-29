import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrzydxpcyonrzhbpzibc.supabase.co';
const supabaseKey = 'sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'Eliminada', deleted_at: new Date().toISOString() })
    .eq('id', validUuid)
    .eq('doctor_id', validUuid);

  console.log('Result:', { data, error });
}

testUpdate();
