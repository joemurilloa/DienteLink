// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // 1. Inicializar cliente de Supabase interno con privilegios de Service Role
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Traer credenciales de Meta desde tus Secrets
    const token = Deno.env.get("WHATSAPP_PERMANENT_TOKEN")
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")

    // 3. Consultar citas que ya deben ser notificadas (reminder_scheduled_at <= NOW) y sigan 'pending'
    const { data: appointments, error: dbError } = await supabase
      .from("appointments")
      .select("*")
      .eq("reminder_status", "pending")
      .lte("reminder_scheduled_at", new Date().toISOString())
      .limit(10) // Procesamos en bloques pequeños de 10 para no saturar

    if (dbError) throw dbError

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: "No hay recordatorios pendientes por enviar." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const results = []

    // 4. Recorrer el lote de citas y disparar los WhatsApps
    for (const cita of appointments) {
      const metaUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`

      const whatsappBody = {
        messaging_product: "whatsapp",
        to: cita.telefono,
        type: "template",
        template: {
          name: "appointment_reminder_v1", // Tu nueva plantilla
          language: { code: "es" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: cita.nombre_paciente }, // {{1}}
                { type: "text", text: cita.dentista || "Clínica Dental" }, // {{2}}
                { type: "text", text: cita.fecha }, // {{3}}
                { type: "text", text: cita.hora } // {{4}}
              ]
            }
          ]
        }
      }

      const response = await fetch(metaUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappBody),
      })

      const metaData = await response.json()

      if (response.ok) {
        // Actualizar el estado de la cita a enviado y guardar el ID de mensaje
        await supabase
          .from("appointments")
          .update({
            reminder_status: "sent",
            whatsapp_message_id: metaData.messages?.[0]?.id
          })
          .eq("id", cita.id)

        results.push({ cita_id: cita.id, status: "success" })
      } else {
        // Registrar fallo en la base de datos para auditoría del doctor
        await supabase
          .from("appointments")
          .update({ reminder_status: "failed" })
          .eq("id", cita.id)

        results.push({ cita_id: cita.id, status: "failed", error: metaData })
      }
    }

    return new Response(JSON.stringify({ processed: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})