// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  const url = new URL(req.url)

  // 1. PASO DE VERIFICACIÓN DE META (Handshake)
  // Meta envía un método GET a esta URL para validar que el webhook está activo.
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode")
    const token = url.searchParams.get("hub.verify_token")
    const challenge = url.searchParams.get("hub.challenge")

    // Elige una palabra clave segura para tu token de verificación (ej: "DienteLinkSecure2026")
    const VERIFY_TOKEN = "DienteLinkSecure2026"

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED")
      return new Response(challenge, { status: 200 })
    }
    return new Response("Forbidden", { status: 403 })
  }

  // 2. RECEPCIÓN DE CLICKS DE BOTONES (Método POST)
  if (req.method === "POST") {
    try {
      const body = await req.json()

      // Verificar que el evento contenga una estructura de mensaje válida
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const message = value?.messages?.[0]

      if (message && message.type === "button") {
        // Inicializar cliente de Supabase interno con privilegios elevados
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const wamid = message.context?.id // ID del mensaje original enviado por Supabase
        const buttonText = message.button?.text // Texto del botón presionado

        // Mapear el texto del botón al estado que guardaremos en la base de datos
        let dbStatus = "confirmed"
        if (buttonText.includes("No podré")) dbStatus = "cancelled"
        if (buttonText.includes("cambiar")) dbStatus = "reschedule"

        // Actualizar la cita que coincida con el whatsapp_message_id entregado por Meta
        if (wamid) {
          const { error } = await supabase
            .from("appointments")
            .update({
              patient_confirmation: dbStatus,
              patient_replied_at: new Date().toISOString()
            })
            .eq("whatsapp_message_id", wamid)

          if (error) console.error("Error actualizando cita en DB:", error)
        }
      }

      // Meta exige que siempre le respondas un HTTP 200 OK de inmediato
      return new Response("EVENT_RECEIVED", { status: 200, headers: corsHeaders })

    } catch (err) {
      console.error("Webhook Error:", err.message)
      return new Response("Internal Error", { status: 500 })
    }
  }

  return new Response("Method Not Allowed", { status: 405 })
})