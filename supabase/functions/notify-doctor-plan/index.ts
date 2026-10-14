// @ts-nocheck
// Avisa al doctor cuando el admin activa o extiende su plan.
// Lo llama el panel interno, con la sesión del admin.
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
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_platform_admin")
    if (adminError || isAdmin !== true) return reply({ error: "No autorizado" }, 401)

    const { clinicId, daysAdded, periodEnd } = await req.json()
    if (!clinicId || !periodEnd) return reply({ error: "Faltan datos" }, 400)

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
    const { data: doctor } = await admin.from("profiles").select("full_name, clinic_name").eq("id", clinicId).maybeSingle()
    const { data: authUser } = await admin.auth.admin.getUserById(clinicId)
    const email = authUser?.user?.email
    if (!email) return reply({ skipped: "sin email" })

    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) return reply({ error: "Correo no configurado" }, 500)
    const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "DienteLink <onboarding@resend.dev>"

    const until = new Date(periodEnd)
    const untilLabel = isNaN(until.getTime())
      ? esc(periodEnd)
      : esc(until.toLocaleDateString("es-HN", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Tegucigalpa" }))

    const sent = await new Resend(resendApiKey).emails.send({
      from,
      to: email,
      subject: "Tu plan de DienteLink quedó activo",
      html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">Plan activo</h2>
        <p>Hola Dr. ${esc(doctor?.full_name || "")},</p>
        <p>Revisamos tu pago y tu plan de <strong>${esc(doctor?.clinic_name || "DienteLink")}</strong> quedó activo.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Días sumados:</strong> ${esc(daysAdded || "")}</p>
          <p style="margin: 0;"><strong>Activo hasta:</strong> ${untilLabel}</p>
        </div>
        <p>Ya puedes seguir usando DienteLink con normalidad.</p>
        <p style="color: #6b7280; font-size: 12px;">Equipo DienteLink</p>
      </div>`,
    })
    if (sent?.error) {
      console.error("Error Resend (plan):", JSON.stringify(sent.error))
      return reply({ error: "No se pudo enviar" }, 502)
    }
    return reply({ success: true })
  } catch (err) {
    console.error("notify-doctor-plan error:", err?.message)
    return reply({ error: "Error interno" }, 500)
  }
})
