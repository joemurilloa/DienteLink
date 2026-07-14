// @ts-nocheck — Runs on Deno (Supabase Edge Functions), not Node.
// Supabase Edge Function: process-reminders
//
// Automated reminder system that runs via cron (every hour).
// Sends EMAIL reminders for tomorrow's appointments.
// Respects subscription status: only trial (limited) and pro (unlimited).
//
// Deploy: supabase functions deploy process-reminders
// Secrets needed: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const TRIAL_DAILY_EMAIL_LIMIT = 5;

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// ─── Send a single email reminder via Resend ─────────────────────────────────

async function sendEmailReminder(payload: {
  patientName: string;
  patientEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  doctorName: string;
  clinicName: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) return { success: false, error: "RESEND_API_KEY not set" };

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  };

  const fmtTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const d = new Date(0, 0, 0, parseInt(h), parseInt(m));
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const clinicDisplay = payload.clinicName || "la clínica";

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; padding: 40px 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="background: #2563eb; padding: 24px 32px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 700;">📋 Recordatorio de Cita</h1>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 20px; color: #334155; font-size: 15px; line-height: 1.6;">
        Hola <strong>${payload.patientName}</strong>, le recordamos que tiene una cita programada:
      </p>
      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Fecha</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${fmtDate(payload.appointmentDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Hora</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${fmtTime(payload.appointmentTime)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Tipo</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${payload.appointmentType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Doctor</td>
            <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${payload.doctorName}</td>
          </tr>
        </table>
      </div>
      <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
        Si necesita reagendar o cancelar, por favor comuníquese con ${clinicDisplay} con anticipación.
      </p>
    </div>
    <div style="padding: 16px 32px; background: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0; color: #94a3b8; font-size: 11px;">Recordatorio enviado por DienteLink · ${clinicDisplay}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "DienteLink <onboarding@resend.dev>",
        to: [payload.patientEmail],
        subject: `Recordatorio: ${payload.appointmentType} — ${fmtDate(payload.appointmentDate)}`,
        html: htmlBody,
      }),
    });

    const data = await res.json();
    if (!res.ok) return { success: false, error: data.message || "Resend API error" };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return json({ error: "Supabase env vars not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── 1. Calculate tomorrow's date (UTC-based, safe for LATAM timezones) ──
    const now = new Date();
    // Use UTC-6 (Honduras/Central America) to get the correct "tomorrow"
    const localNow = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const tomorrow = new Date(localNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`[process-reminders] Running for date: ${tomorrowStr}`);

    // ── 2. Get tomorrow's appointments that haven't been reminded ────────
    const { data: appointments, error: aptErr } = await supabase
      .from("appointments")
      .select(`
        id, patient_name, phone_number, date, time, type, status, reminder_status,
        doctor_id, patient_id
      `)
      .eq("date", tomorrowStr)
      .eq("reminder_status", "not_sent")
      .is("deleted_at", null)
      .not("status", "in", '("Eliminada","Completada")');

    if (aptErr) {
      console.error("Error fetching appointments:", aptErr);
      return json({ error: aptErr.message }, 500);
    }

    if (!appointments || appointments.length === 0) {
      console.log("[process-reminders] No appointments to remind.");
      return json({ processed: 0, sent: 0, errors: 0, skipped: 0 });
    }

    console.log(`[process-reminders] Found ${appointments.length} appointments to process.`);

    // ── 3. Get unique doctor IDs and their subscription + profile info ────
    const doctorIds = [...new Set(appointments.map((a) => a.doctor_id))];

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, clinic_name")
      .in("id", doctorIds);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Track emails sent per doctor (for trial daily limit)
    const emailsSentByDoctor: Record<string, number> = {};

    // ── 4. Get patient emails ──────────────────────────────────────────────
    const patientIds = [...new Set(appointments.filter(a => a.patient_id).map((a) => a.patient_id))];
    
    const { data: patients } = patientIds.length > 0
      ? await supabase.from("patients").select("id, email").in("id", patientIds)
      : { data: [] };

    const patientEmailMap = new Map((patients || []).map((p) => [p.id, p.email]));

    // ── 5. Process each appointment ────────────────────────────────────────
    let sent = 0;
    let errors = 0;
    let skipped = 0;

    for (const apt of appointments) {
      const profile = profileMap.get(apt.doctor_id);
      // Get patient email
      const patientEmail = patientEmailMap.get(apt.patient_id);
      if (!patientEmail) {
        // No email → can't send, skip silently
        skipped++;
        continue;
      }

      // Send email
      const result = await sendEmailReminder({
        patientName: apt.patient_name,
        patientEmail,
        appointmentDate: apt.date,
        appointmentTime: apt.time,
        appointmentType: apt.type,
        doctorName: profile?.full_name || "Doctor",
        clinicName: profile?.clinic_name || "",
      });

      if (result.success) {
        sent++;
        emailsSentByDoctor[apt.doctor_id] = (emailsSentByDoctor[apt.doctor_id] || 0) + 1;

        // Update reminder status to 'sent'
        await supabase
          .from("appointments")
          .update({ reminder_status: "sent" })
          .eq("id", apt.id);
      } else {
        errors++;
        console.error(`[process-reminders] Failed for apt ${apt.id}: ${result.error}`);

        // Update reminder status to 'error'
        await supabase
          .from("appointments")
          .update({ reminder_status: "error" })
          .eq("id", apt.id);
      }
    }

    const summary = {
      processed: appointments.length,
      sent,
      errors,
      skipped,
      date: tomorrowStr,
    };

    console.log("[process-reminders] Complete:", summary);
    return json(summary);
  } catch (err) {
    console.error("[process-reminders] Unexpected error:", err);
    return json({ error: err.message || "Internal error" }, 500);
  }
});
