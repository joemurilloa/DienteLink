// @ts-nocheck
// Correos al paciente, llamados por el doctor autenticado:
//   confirmed   { appointmentId }                         cita agendada o aceptada
//   rescheduled { appointmentId, previousDate, previousTime }
//   cancelled   { appointmentId }                         cita eliminada
//   rejected    { requestId }                             solicitud declinada
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { Resend } from "https://esm.sh/resend@3.2.0"

const ALLOWED_ORIGINS = [
  "https://diente-link.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
]
const cors = (req: Request) => {
  const o = req.headers.get("origin") || ""
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  }
}
const esc = (s: unknown) =>
  s == null ? "" : String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

function formatDate(iso: unknown) {
  const raw = String(iso || "")
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return esc(raw)
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return esc(d.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }))
}

function shell(title: string, body: string) {
  return `
  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">${title}</h2>
    ${body}
    <p style="color: #6b7280; font-size: 12px;">Equipo DienteLink</p>
  </div>`
}

function box(lines: string[]) {
  return `<div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">${
    lines.map((l, i) => `<p style="margin: ${i ? "8px" : "0"} 0 0 0;">${l}</p>`).join("")
  }</div>`
}

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" }
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers })
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(req) })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return reply({ error: "No autorizado" }, 401)

    const url = Deno.env.get("SUPABASE_URL") ?? ""
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    })
    const body = await req.json()
    const kind = body?.kind || "confirmed"
    if (!["confirmed", "rescheduled", "cancelled", "rejected"].includes(kind)) {
      return reply({ error: "Aviso no válido" }, 400)
    }

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
    let to = ""
    let patientName = ""
    let doctorId = ""
    let subject = ""
    let html = ""

    if (kind === "rejected") {
      if (!body.requestId) return reply({ error: "Falta requestId" }, 400)
      const { data: request } = await userClient.from("appointment_requests").select("*").eq("id", body.requestId).maybeSingle()
      if (!request) return reply({ error: "Solicitud no encontrada" }, 404)
      if (request.status !== "rejected") return reply({ skipped: "estado" })
      if (!request.patient_email) return reply({ skipped: "sin email" })
      to = request.patient_email
      patientName = request.patient_name
      doctorId = request.doctor_id
      const { data: doctor } = await admin.from("profiles").select("full_name, clinic_name").eq("id", doctorId).single()
      const clinic = esc(doctor?.clinic_name || doctor?.full_name || "la clínica")
      subject = `Solicitud no confirmada - ${doctor?.clinic_name || doctor?.full_name || "DienteLink"}`
      html = shell("No pudimos confirmar tu solicitud", `
        <p>Hola ${esc(patientName)},</p>
        <p><strong>${clinic}</strong> no pudo confirmar la cita que pediste.</p>
        ${box([
          `<strong>Fecha pedida:</strong> ${formatDate(request.requested_date)}`,
          `<strong>Hora pedida:</strong> ${esc(request.requested_time)}`,
        ])}
        <p>Puedes elegir otro horario desde la página de reservas de la clínica.</p>`)
    } else {
      if (!body.appointmentId) return reply({ error: "Falta appointmentId" }, 400)
      const { data: appt } = await userClient.from("appointments").select("*").eq("id", body.appointmentId).maybeSingle()
      if (!appt) return reply({ error: "Cita no encontrada" }, 404)
      const live = appt.status === "Programada" || appt.status === "Retrasada"
      if (kind === "cancelled" && appt.status !== "Eliminada") return reply({ skipped: "estado" })
      if (kind === "confirmed" && appt.status !== "Programada") return reply({ skipped: "estado" })
      if (kind === "rescheduled" && !live) return reply({ skipped: "estado" })

      to = await patientEmail(admin, appt)
      if (!to) return reply({ skipped: "sin email" })
      patientName = appt.patient_name
      doctorId = appt.doctor_id
      const { data: doctor } = await admin.from("profiles").select("full_name, clinic_name").eq("id", doctorId).single()
      const clinic = esc(doctor?.clinic_name || doctor?.full_name || "tu clínica")
      const when = `${formatDate(appt.date)} a las ${esc(appt.time)}`
      const clinicLabel = doctor?.clinic_name || doctor?.full_name || "DienteLink"

      if (kind === "cancelled") {
        subject = `Cita cancelada - ${clinicLabel}`
        html = shell("Tu cita fue cancelada", `
          <p>Hola ${esc(patientName)},</p>
          <p><strong>${clinic}</strong> canceló esta cita:</p>
          ${box([`<strong>Cuándo era:</strong> ${when}`, `<strong>Tipo:</strong> ${esc(appt.type)}`])}
          <p>Si quieres otra fecha, responde a este correo o vuelve a reservar.</p>`)
      } else if (kind === "rescheduled") {
        subject = `Tu cita cambió de horario - ${clinicLabel}`
        html = shell("Tu cita cambió de horario", `
          <p>Hola ${esc(patientName)},</p>
          <p><strong>${clinic}</strong> movió tu cita.</p>
          ${box([
            `<strong>Antes:</strong> ${formatDate(body.previousDate)} a las ${esc(body.previousTime)}`,
            `<strong>Ahora:</strong> ${when}`,
            `<strong>Tipo:</strong> ${esc(appt.type)}`,
          ])}
          <p>Si ese horario no te sirve, responde a este correo.</p>`)
      } else {
        subject = `Cita confirmada - ${clinicLabel}`
        html = shell("Tu cita está confirmada", `
          <p>Hola ${esc(patientName)},</p>
          <p>Tu cita en <strong>${clinic}</strong> quedó agendada:</p>
          ${box([`<strong>Cuándo:</strong> ${when}`, `<strong>Tipo:</strong> ${esc(appt.type)}`])}
          <p>Si necesitas cambiarla, responde a este correo o contacta a la clínica.</p>`)
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) return reply({ error: "Correo no configurado" }, 500)
    const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "DienteLink <onboarding@resend.dev>"
    const { data: authUser } = await admin.auth.admin.getUserById(doctorId)

    const sent = await new Resend(resendApiKey).emails.send({
      from,
      to,
      reply_to: authUser?.user?.email || undefined,
      subject,
      html,
    })
    if (sent?.error) {
      console.error("Error Resend (paciente):", JSON.stringify(sent.error))
      return reply({ error: "No se pudo enviar" }, 502)
    }
    return reply({ success: true })
  } catch (err) {
    console.error("notify-patient-booking error:", err?.message)
    return reply({ error: "Error interno" }, 500)
  }
})

async function patientEmail(admin, appt) {
  if (appt.patient_id) {
    const { data: patient } = await admin.from("patients").select("email").eq("id", appt.patient_id).maybeSingle()
    if (patient?.email) return patient.email
  }
  const { data: request } = await admin.from("appointment_requests").select("patient_email")
    .eq("doctor_id", appt.doctor_id)
    .eq("patient_name", appt.patient_name)
    .not("patient_email", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return request?.patient_email || null
}
