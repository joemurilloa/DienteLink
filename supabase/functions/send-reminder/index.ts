// @ts-nocheck — This file runs on Deno (Supabase Edge Functions), not Node.
// Supabase Edge Function: send-reminder
// Sends appointment reminder emails via Resend (free tier: 100 emails/day)
//
// Deploy: supabase functions deploy send-reminder
// Set secret: supabase secrets set RESEND_API_KEY=re_xxxxx

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const getCorsHeaders = (req: Request) => {
  const ALLOWED_ORIGINS = ["https://diente-link.vercel.app", "http://localhost:3000", "http://localhost:5173"];
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin"
  };
};;

interface ReminderPayload {
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  doctorName: string;
  clinicName: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY no configurada" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const payload: ReminderPayload = await req.json();

    if (!payload.patientEmail || !payload.patientName) {
      return new Response(
        JSON.stringify({ error: "Email y nombre del paciente son requeridos" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const fmtDate = (dateStr: string) => {
      const d = new Date(dateStr + "T12:00:00");
      return d.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const fmtTime = (timeStr: string) => {
      const [h, m] = timeStr.split(":");
      const d = new Date(0, 0, 0, parseInt(h), parseInt(m));
      return d.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const clinicDisplay = payload.clinicName || "la clínica";
    const doctorDisplay = payload.doctorName || "su doctor";

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #2563eb; padding: 24px 32px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 700;">✅ Cita Confirmada</h1>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 20px; color: #334155; font-size: 15px; line-height: 1.6;">
        Hola <strong>${payload.patientName}</strong>, se ha agendado exitosamente su próxima cita:
      </p>
      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Fecha</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${fmtDate(payload.appointmentDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Hora</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${fmtTime(payload.appointmentTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Tipo</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${payload.appointmentType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Doctor</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${doctorDisplay}</td>
          </tr>
        </table>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
        Si necesita reagendar o cancelar, por favor comuníquese con ${clinicDisplay} con anticipación.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 11px;">Enviado por DienteLink · ${clinicDisplay}</p>
    </div>
  </div>
</body>
</html>`;

    // Use "onboarding@resend.dev" as sender until domain is verified
    // After verifying your domain, change to "citas@yourdomain.com"
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DienteLink <onboarding@resend.dev>",
        to: [payload.patientEmail],
        subject: `Nueva Cita Agendada: ${payload.appointmentType} - ${fmtDate(payload.appointmentDate)}`,
        html: htmlBody,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(
        JSON.stringify({ error: resendData.message || "Error al enviar email" }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
