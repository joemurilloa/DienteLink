// @ts-nocheck
// Use WHATSAPP_TOKEN (different token) to find production WABA and list its templates
Deno.serve(async (req) => {
  const token = Deno.env.get("WHATSAPP_PERMANENT_TOKEN")
  const altToken = Deno.env.get("WHATSAPP_TOKEN")
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")
  const TEST_PHONE = "50498053628"

  const results: any = {}

  // Try sending appointment_reminder_v1 with language "es" using BOTH tokens
  for (const [label, tok] of [["permanent_token", token], ["whatsapp_token", altToken]]) {
    if (!tok) { results[label] = "token not set"; continue; }

    const body = {
      messaging_product: "whatsapp",
      to: TEST_PHONE,
      type: "template",
      template: {
        name: "appointment_reminder_v1",
        language: { code: "es" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: "Joe (Prueba)" },
              { type: "text", text: "DienteLink" },
              { type: "text", text: "jueves, 10 de septiembre" },
              { type: "text", text: "09:00 a. m." }
            ]
          }
        ]
      }
    }

    const resp = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${tok}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    const data = await resp.json()
    results[label] = { ok: resp.ok, status: resp.status, data }

    // Also try to list templates from WABA using this token
    // Try common WABA IDs
    for (const wabaId of ["2394648517626288", "122121505173339453"]) {
      const tResp = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/message_templates?fields=name,language,status&limit=5`,
        { headers: { "Authorization": `Bearer ${tok}` } }
      )
      const tData = await tResp.json()
      if (!tData.error) {
        results[`${label}_waba_${wabaId}_templates`] = tData.data?.map((t: any) => `${t.name}/${t.language}/${t.status}`)
      }
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { "Content-Type": "application/json" }
  })
})
