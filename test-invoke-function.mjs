// Direct invocation of the whatsapp-reminder Edge Function
async function invokeFunction() {
  const url = 'https://jrzydxpcyonrzhbpzibc.supabase.co/functions/v1/whatsapp-reminder';
  
  console.log('Invocando Edge Function directamente...');
  console.log('URL:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sb_publishable_dmra7_LLEYmD5yYo2C7t_g_0GzD1hpf'
      },
      body: JSON.stringify({})
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

invokeFunction();
