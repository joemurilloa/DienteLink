// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Language codes to try in order (most common for Latin America first)
const LANG_FALLBACKS = ["es_MX", "es_ES", "es_AR", "en_US"];

async function sendWhatsAppTemplate(
  token: string,
  phoneId: string,
  toPhone: string,
  templateName: string,
  parameters: { type: string; text: string }[]
): Promise<{ ok: boolean; data: any; lang: string }> {
  const metaUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`;

  for (const lang of LANG_FALLBACKS) {
    const body = {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: lang },
        components: [{ type: "body", parameters }]
      }
    };

    const response = await fetch(metaUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`[whatsapp-reminder] Template sent with lang=${lang}`);
      return { ok: true, data, lang };
    }

    // Error 132001 = template doesn't exist in this language → try next
    const errorCode = data?.error?.code;
    if (errorCode !== 132001) {
      console.error(`[whatsapp-reminder] Non-language error (${errorCode}) with lang=${lang}:`, JSON.stringify(data));
      return { ok: false, data, lang };
    }

    console.warn(`[whatsapp-reminder] Template not found in lang=${lang}, trying next...`);
  }

  return { ok: false, data: { error: { message: "Template not found in any supported language" } }, lang: "none" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = Deno.env.get("WHATSAPP_PERMANENT_TOKEN")
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")

    if (!token || !phoneId) {
      throw new Error("Meta API Secrets (WHATSAPP_PERMANENT_TOKEN or WHATSAPP_PHONE_NUMBER_ID) are not configured.")
    }

    const { data: appointments, error: dbError } = await supabase
      .from("appointments")
      .select("*, profiles:doctor_id(full_name, clinic_name)")
      .eq("reminder_status", "not_sent")
      .not("reminder_scheduled_at", "is", null)
      .lte("reminder_scheduled_at", new Date().toISOString())
      .not("status", "in", '("Eliminada","cancelled")')
      .limit(10)

    if (dbError) throw dbError

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: "No hay recordatorios pendientes por enviar." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const results = []

    for (const cita of appointments) {
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

      let toPhone = (cita.phone_number || cita.telefono || "").replace(/[^0-9]/g, "")
      if (toPhone.length === 8) toPhone = "504" + toPhone
      else if (toPhone.length === 10 && !toPhone.startsWith("52")) toPhone = "52" + toPhone

      const parameters = [
        { type: "text", text: cita.patient_name || "Paciente" },
        { type: "text", text: clinicName },
        { type: "text", text: dateFormatted },
        { type: "text", text: timeFormatted }
      ]

      const result = await sendWhatsAppTemplate(token, phoneId, toPhone, "appointment_reminder_v1", parameters)

      if (result.ok) {
        await supabase
          .from("appointments")
          .update({
            reminder_status: "sent",
            whatsapp_message_id: result.data.messages?.[0]?.id
          })
          .eq("id", cita.id)

        results.push({ cita_id: cita.id, status: "success", lang: result.lang })
      } else {
        await supabase
          .from("appointments")
          .update({ reminder_status: "failed" })
          .eq("id", cita.id)

        results.push({ cita_id: cita.id, status: "failed", error: result.data })
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