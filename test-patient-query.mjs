import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrzydxpcyonrzhbpzibc.supabase.co';
const supabaseKey = 'sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuery() {
  const { data, error } = await supabase
      .from('patients')
      .select(`
          *,
          evolution_notes (*),
          clinical_events (*),
          budget_items (*),
          payments (*),
          consent_forms (*),
          prescriptions (*),
          lab_works (*)
      `)
      .limit(1);

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log('Query success!');
  }
}

checkQuery();
