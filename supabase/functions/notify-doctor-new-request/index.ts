// @ts-nocheck
// Aviso de solicitud nueva (pública) -> doctor + acuse al paciente.
// Lo invoca un disparador de la base (ver database/notifications_setup.sql).
// No usa secretos compartidos: ignora el contenido del payload salvo el id y
// valida contra la base que la solicitud exista, sea reciente y no se haya avisado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { Resend } from "https://esm.sh/resend@3.2.0"

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

const esc = (s: unknown) =>
  s == null ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405)

  try {
    const payload = await req.json()
    const requestId = payload?.record?.id
    if (!requestId || typeof requestId !== "string") return json({ error: "Payload inválido" }, 400)

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    // Reclamar la solicitud de forma atómica: solo si es pendiente, reciente y sin avisar.
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { data: claimed, error: claimError } = await supabase
      .from("appointment_requests")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", requestId)
      .eq("status", "pending")
      .is("notified_at", null)
      .gte("created_at", since)
      .select("*")
      .maybeSingle()

    if (claimError) throw new Error(claimError.message)
    if (!claimed) return json({ skipped: true })
    const record = claimed

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) {
      console.error("RESEND_API_KEY no está configurado")
      return json({ error: "Correo no configurado" }, 500)
    }
    const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "DienteLink <onboarding@resend.dev>"

    const { data: doctor } = await supabase.from("profiles").select("full_name, clinic_name").eq("id", record.doctor_id).single()
    const { data: authUser } = await supabase.auth.admin.getUserById(record.doctor_id)
    const doctorEmail = authUser?.user?.email
    const doctorName = esc(doctor?.full_name ?? "")

    const date = esc(record.requested_date)
    const time = esc(record.requested_time)
    const type = esc(record.appointment_type ?? "Consulta General")
    const message = esc(record.message || "Sin mensaje adicional")
    const resend = new Resend(resendApiKey)

    if (doctorEmail) {
      const r = await resend.emails.send({
        from,
        to: doctorEmail,
        reply_to: record.patient_email || undefined,
        subject: `Nueva solicitud de cita - ${record.patient_name}`,
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Nueva Solicitud de Cita</h2>
          <p>Hola Dr. ${doctorName},</p>
          <p>Tienes una nueva solicitud de cita de parte de <strong>${esc(record.patient_name)}</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${date}</p>
            <p style="margin: 0 0 8px 0;"><strong>Hora:</strong> ${time}</p>
            <p style="margin: 0;"><strong>Tipo:</strong> ${type}</p>
            <p style="margin: 12px 0 0 0;"><strong>Motivo:</strong><br/>${message}</p>
          </div>
          <p>Ingresa a tu panel de DienteLink para aceptar o rechazar la solicitud.</p>
          <p style="color: #6b7280; font-size: 12px;">Equipo DienteLink</p>
        </div>`,
      })
      if (r?.error) console.error("Error Resend (doctor):", JSON.stringify(r.error))
    } else {
      console.warn("El doctor no tiene email", record.doctor_id)
    }

    if (record.patient_email) {
      const r = await resend.emails.send({
        from,
        to: record.patient_email,
        subject: "Recibimos tu solicitud de cita",
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Solicitud de Cita Recibida</h2>
          <p>Hola ${esc(record.patient_name)},</p>
          <p>Recibimos tu solicitud para la clínica del Dr(a). <strong>${doctorName}</strong>.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Fecha solicitada:</strong> ${date}</p>
            <p style="margin: 0 0 8px 0;"><strong>Hora solicitada:</strong> ${time}</p>
            <p style="margin: 0;"><strong>Tipo:</strong> ${type}</p>
          </div>
          <p>La clínica revisará tu solicitud y te contactará para confirmarla.</p>
          <p style="color: #6b7280; font-size: 12px;">Equipo DienteLink</p>
        </div>`,
      })
      if (r?.error) console.error("Error Resend (paciente):", JSON.stringify(r.error))
    }

    return json({ success: true })
  } catch (err) {
    console.error("notify-doctor-new-request error:", err?.message)
    return json({ error: "Error interno" }, 500)
  }
})
