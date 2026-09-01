// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const getCorsHeaders = (req: Request) => {
  const ALLOWED_ORIGINS = ["https://diente-link.vercel.app", "http://localhost:3000", "http://localhost:5173"];
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin"
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) })
  }

  try {
    const { appointment_id } = await req.json()
    if (!appointment_id) {
      throw new Error("appointment_id is required")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = Deno.env.get("WHATSAPP_PERMANENT_TOKEN")
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")

    if (!token || !phoneId) {
      throw new Error("Meta API Secrets (WHATSAPP_PERMANENT_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are not configured.")
    }

    // Fetch appointment details
    const { data: cita, error: dbError } = await supabase
      .from("appointments")
      .select("*, profiles:doctor_id(full_name, clinic_name)")
      .eq("id", appointment_id)
      .single()

    if (dbError || !cita) {
      throw new Error("Appointment not found")
    }

    let toPhone = (cita.phone_number || cita.telefono || "").replace(/[^0-9]/g, "")
    if (!toPhone) {
      return new Response(JSON.stringify({ skipped: true, reason: "No phone number" }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      })
    }

    if (toPhone.length === 8) toPhone = "504" + toPhone
    else if (toPhone.length === 10 && !toPhone.startsWith("52")) toPhone = "52" + toPhone

    const profileData = cita.profiles as any
    const clinicName = profileData?.clinic_name || "Clínica Dental"

    const dateFormatted = (() => {
      try {
        const d = new Date(cita.date + "T12:00:00")
        return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })
      } catch { return cita.date }
    })()

    const timeFormatted = (() => {
      try {
        const [h, m] = cita.time.split(":")
        const d = new Date(0, 0, 0, parseInt(h), parseInt(m))
        return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true })
      } catch { return cita.time }
    })()

    const metaUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`

    const whatsappBody = {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: "appointment_reminder_v1",
        language: { code: "es" },
        components: [{
          type: "body",
          parameters: [
            { type: "text", text: cita.patient_name || "Paciente" },
            { type: "text", text: clinicName },
            { type: "text", text: dateFormatted },
            { type: "text", text: timeFormatted }
          ]
        }]
      }
    }

    const response = await fetch(metaUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(whatsappBody)
    })

    const metaData = await response.json()

    if (response.ok) {
      return new Response(JSON.stringify({ success: true, message_id: metaData.messages?.[0]?.id }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
      })
    } else {
      throw new Error(JSON.stringify(metaData))
    }

  } catch (err) {
    console.error("Error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" }
    })
  }
})
