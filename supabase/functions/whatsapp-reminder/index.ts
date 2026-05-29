// @ts-nocheck
// Supabase Edge Function: whatsapp-reminder
// Sends WhatsApp appointment reminders via Meta Cloud API
//
// Deploy: supabase functions deploy whatsapp-reminder --no-verify-jwt
// Secrets required:
//   supabase secrets set WHATSAPP_PERMANENT_TOKEN=your_token
//   supabase secrets set WHATSAPP_PHONE_NUMBER_ID=your_phone_id

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * Sanitize phone number for WhatsApp API.
 * Meta requires: country code + number, no "+", no spaces, no dashes.
 * e.g. "+504 1234-5678" → "50412345678"
 */
function sanitizePhone(raw: string): string {
  if (!raw) return ""
  let clean = raw.replace(/[^0-9]/g, "")
  // Honduras: 8-digit numbers → prepend 504
  if (clean.length === 8) clean = "504" + clean
  // Mexico: 10-digit numbers without country code → prepend 52
  else if (clean.length === 10 && !clean.startsWith("52")) clean = "52" + clean
  return clean
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // ── 1. Clients & Credentials ──────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = Deno.env.get("WHATSAPP_PERMANENT_TOKEN")
    const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")

    if (!token || !phoneId) {
      console.error("Missing secrets: WHATSAPP_PERMANENT_TOKEN or WHATSAPP_PHONE_NUMBER_ID")
      return new Response(
        JSON.stringify({ error: "WHATSAPP_PERMANENT_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados en Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── 2. Query appointments due for reminder ────────────────────
    // Conditions:
    //   - reminder_status = 'not_sent'  (matches the app's default)
    //   - reminder_scheduled_at <= NOW  (it's time to send)
    //   - reminder_scheduled_at IS NOT NULL
    //   - status is NOT deleted/cancelled
    const { data: appointments, error: dbError } = await supabase
      .from("appointments")
      .select("*, profiles:doctor_id(full_name, clinic_name)")
      .eq("reminder_status", "not_sent")
      .not("reminder_scheduled_at", "is", null)
      .lte("reminder_scheduled_at", new Date().toISOString())
      .not("status", "in", '("Eliminada","cancelled")')
      .limit(10)

    if (dbError) {
      console.error("DB query error:", dbError)
      throw dbError
    }

    if (!appointments || appointments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No hay recordatorios pendientes por enviar." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    console.log(`Processing ${appointments.length} reminder(s)...`)
    const results: any[] = []

    // ── 3. Send WhatsApp for each appointment ─────────────────────
    for (const cita of appointments) {
      // Use phone_number (written by the app) with telefono as fallback
      const rawPhone = cita.phone_number || cita.telefono || ""
      const toPhone = sanitizePhone(rawPhone)

      if (!toPhone) {
        console.warn(`Appointment ${cita.id}: no phone number, marking as failed`)
        await supabase
          .from("appointments")
          .update({ reminder_status: "failed" })
          .eq("id", cita.id)
        results.push({ cita_id: cita.id, status: "failed", error: "Sin número de teléfono" })
        continue
      }

      // Doctor / clinic name from joined profiles table
      const profileData = cita.profiles as any
      const clinicName = profileData?.clinic_name || "Clínica Dental"

      // Format date for display: "miércoles 4 de junio"
      const dateFormatted = (() => {
        try {
          const d = new Date(cita.date + "T12:00:00")
          return d.toLocaleDateString("es-ES", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        } catch {
          return cita.date
        }
      })()

      // Format time for display: "01:00 p. m."
      const timeFormatted = (() => {
        try {
          const [h, m] = cita.time.split(":")
          const d = new Date(0, 0, 0, parseInt(h), parseInt(m))
          return d.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        } catch {
          return cita.time
        }
      })()

      // ── Build the WhatsApp template payload ───────────────────
      // Template: appointment_reminder_v1
      // "Hola {{1}}, te recordamos tu cita en {{2}} mañana {{3}} a las {{4}}."
      const metaUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`

      const whatsappBody = {
        messaging_product: "whatsapp",
        to: toPhone,
        type: "template",
        template: {
          name: "appointment_reminder_v1",
          language: { code: "es" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: cita.patient_name || "Paciente" },  // {{1}} nombre
                { type: "text", text: clinicName },                       // {{2}} clínica
                { type: "text", text: dateFormatted },                    // {{3}} fecha
                { type: "text", text: timeFormatted },                    // {{4}} hora
              ],
            },
          ],
        },
      }

      console.log(`Sending to ${toPhone} for appointment ${cita.id}...`)

      const response = await fetch(metaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(whatsappBody),
      })

      const metaData = await response.json()

      if (response.ok) {
        // ✅ Update appointment as sent
        await supabase
          .from("appointments")
          .update({
            reminder_status: "sent",
            whatsapp_message_id: metaData.messages?.[0]?.id,
          })
          .eq("id", cita.id)

        console.log(`✅ Appointment ${cita.id} → sent (wa_id: ${metaData.messages?.[0]?.id})`)
        results.push({ cita_id: cita.id, status: "success", wa_id: metaData.messages?.[0]?.id })
      } else {
        // ❌ Mark as failed for audit
        await supabase
          .from("appointments")
          .update({ reminder_status: "failed" })
          .eq("id", cita.id)

        console.error(`❌ Appointment ${cita.id} → failed:`, metaData)
        results.push({ cita_id: cita.id, status: "failed", error: metaData })
      }
    }

    return new Response(JSON.stringify({ processed: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Unexpected error:", err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})