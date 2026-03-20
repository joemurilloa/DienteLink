import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { paciente_nombre, paciente_telefono, fecha, hora, doctor_nombre } = await req.json()

    const WHATSAPP_TOKEN = Deno.env.get("WHATSAPP_TOKEN")
    const PHONE_NUMBER_ID = Deno.env.get("PHONE_NUMBER_ID")

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
      throw new Error("Missing WhatsApp configuration secrets")
    }

    const res = await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: paciente_telefono,
        type: "template",
        template: {
          name: "confirmacion_cita",
          language: { code: "es" },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: paciente_nombre },
              { type: "text", text: fecha },
              { type: "text", text: hora },
              { type: "text", text: doctor_nombre }
            ]
          }]
        }
      })
    })

    const data = await res.json()
    
    if (!res.ok) {
      console.error("WhatsApp API Error:", data)
      return new Response(JSON.stringify({ error: data }), { 
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      })
    }

    return new Response(JSON.stringify(data), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })
  } catch (error: any) {
    console.error("Function Error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
