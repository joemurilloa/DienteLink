import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jrzydxpcyonrzhbpzibc.supabase.co';
const supabaseKey = 'sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('=== DIAGNÓSTICO DE RECORDATORIOS WHATSAPP ===\n');

  // 1. Check all appointments for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  console.log(`Buscando citas para mañana: ${tomorrowStr}\n`);

  const { data: tomorrowApts, error: e1 } = await supabase
    .from('appointments')
    .select('id, patient_name, phone_number, date, time, status, reminder_status, reminder_scheduled_at')
    .eq('date', tomorrowStr);

  console.log('Citas para mañana:', JSON.stringify(tomorrowApts, null, 2));
  if (e1) console.log('Error:', e1);

  // 2. Check appointments with reminder_scheduled_at set
  console.log('\n--- Citas con reminder_scheduled_at configurado ---');
  const { data: withReminder, error: e2 } = await supabase
    .from('appointments')
    .select('id, patient_name, date, time, status, reminder_status, reminder_scheduled_at')
    .not('reminder_scheduled_at', 'is', null)
    .order('reminder_scheduled_at', { ascending: false })
    .limit(10);
  
  console.log('Con reminder_scheduled_at:', JSON.stringify(withReminder, null, 2));

  // 3. Check the reminder_scheduled_at vs now
  const now = new Date();
  console.log('\n--- Tiempo actual (UTC) ---');
  console.log('Ahora (UTC):', now.toISOString());
  
  if (tomorrowApts && tomorrowApts.length > 0) {
    tomorrowApts.forEach(apt => {
      console.log(`\nCita ${apt.id} (${apt.patient_name}):`);
      console.log('  - reminder_scheduled_at:', apt.reminder_scheduled_at || 'NULL (NO CONFIGURADO)');
      console.log('  - reminder_status:', apt.reminder_status);
      console.log('  - status:', apt.status);
      if (apt.reminder_scheduled_at) {
        const reminderTime = new Date(apt.reminder_scheduled_at);
        const diff = (reminderTime.getTime() - now.getTime()) / 1000 / 60;
        console.log(`  - Recordatorio en: ${diff.toFixed(1)} minutos desde ahora`);
        console.log(`  - ¿Ya debería haber disparado? ${diff <= 0 ? 'SÍ' : 'NO (faltan ' + Math.abs(diff).toFixed(0) + ' min)'}`);
      }
    });
  }
}

diagnose();
