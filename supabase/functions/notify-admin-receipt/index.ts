// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { Resend } from "https://esm.sh/resend@3.2.0"

// ─────────────────────────────────────────────────────────────
// CONFIGURA AQUÍ TU EMAIL DE ADMIN
// ─────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'joemurillo95@gmail.com';
// ─────────────────────────────────────────────────────────────

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  try {
    const payload = await req.json();
    const { clinicId, doctorEmail, doctorName, imageUrl, notes } = payload;

    if (!clinicId || !doctorEmail) {
      return new Response(
        JSON.stringify({ error: 'clinicId y doctorEmail son requeridos' }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("RESEND_API_KEY no configurado — email no enviado");
      return new Response(
        JSON.stringify({ success: true, warning: 'Email no enviado: RESEND_API_KEY faltante' }),
        { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);

    const now = new Date().toLocaleString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">🦷 DienteLink</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px;">Sistema de Administración</p>
        </div>
        
        <!-- Card -->
        <div style="background: white; padding: 28px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 15px;">
              💰 Nuevo comprobante de pago recibido
            </p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px; width: 40%;">Doctor</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">${doctorName || 'No especificado'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Email (referencia)</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #1d4ed8; font-weight: 600;">${doctorEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Clinic ID</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-size: 12px; font-family: monospace;">${clinicId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 13px;">Fecha y hora</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${now}</td>
            </tr>
            ${notes ? `
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Nota del doctor</td>
              <td style="padding: 10px 0; color: #0f172a; font-style: italic;">"${notes}"</td>
            </tr>` : ''}
          </table>
          
          <!-- Comprobante -->
          ${imageUrl ? `
          <div style="margin: 24px 0;">
            <p style="color: #64748b; font-size: 13px; margin-bottom: 8px;">Comprobante adjunto:</p>
            <a href="${imageUrl}" target="_blank" style="display: inline-block; background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 10px 20px; color: #1d4ed8; text-decoration: none; font-weight: 600;">
              📄 Ver comprobante
            </a>
            <img src="${imageUrl}" alt="Comprobante" style="display: block; margin-top: 12px; max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #e2e8f0;" />
          </div>
          ` : `
          <div style="margin: 24px 0; background: #fef2f2; border-radius: 8px; padding: 12px; color: #dc2626; font-size: 13px;">
            ⚠️ No se adjuntó imagen del comprobante.
          </div>`}
          
          <!-- Acción -->
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin-top: 16px;">
            <p style="margin: 0 0 8px 0; color: #166534; font-weight: 600; font-size: 14px;">✅ Pasos para activar la cuenta:</p>
            <ol style="margin: 0; padding-left: 20px; color: #15803d; font-size: 13px; line-height: 1.8;">
              <li>Verifica la transferencia en tu app bancaria (busca el email: <strong>${doctorEmail}</strong>)</li>
              <li>Ve a Supabase → Table Editor → <code>subscriptions</code></li>
              <li>Busca por <code>clinic_id</code>: <code style="font-size: 11px;">${clinicId}</code></li>
              <li>Cambia <code>status</code> → <code>'active'</code></li>
              <li>Cambia <code>current_period_end</code> → fecha de hoy + 30 días</li>
              <li>Guarda — ¡listo!</li>
            </ol>
          </div>
          
        </div>
        
        <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 16px;">
          DienteLink — Sistema de gestión odontológica
        </p>
      </div>
    `;

    await resend.emails.send({
      from: 'DienteLink Admin <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `💰 Nuevo comprobante de pago — ${doctorName || doctorEmail}`,
      html: emailHtml,
    });

    console.log(`[notify-admin-receipt] Email enviado al admin por pago de ${doctorEmail}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[notify-admin-receipt] Error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
