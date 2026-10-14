// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { Resend } from "https://esm.sh/resend@3.2.0"

// El comprobante NO se guarda en ningún lado: se recibe, se manda adjunto al
// correo del administrador y se descarta. En la base de datos solo queda el
// registro "por revisar" (sin imagen).

const ADMIN_EMAIL = 'joemurilloa@gmail.com';
const APP_URL = 'https://diente-link.vercel.app';
const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const getCorsHeaders = (req: Request) => {
  const ALLOWED_ORIGINS = [
    "https://diente-link.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
  ];
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };
  const fail = (status: number, message: string) =>
    new Response(JSON.stringify({ error: message }), { status, headers });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return fail(401, 'No autorizado');

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    const { data: { user }, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !user) return fail(401, 'No autorizado');

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("[submit-receipt] RESEND_API_KEY no está configurado");
      return fail(500, 'El envío de comprobantes no está configurado. Escríbenos por WhatsApp.');
    }

    const body = await req.json();
    const mimeType = String(body?.mimeType ?? '');
    const contentBase64 = String(body?.contentBase64 ?? '');
    const notes = String(body?.notes ?? '').slice(0, 200);
    const extension = ALLOWED_TYPES[mimeType];

    if (!extension) return fail(400, 'Solo se aceptan JPG, PNG, WebP o PDF.');
    if (!contentBase64) return fail(400, 'Falta el archivo del comprobante.');
    // Tamaño real aproximado del archivo a partir del base64.
    const approxBytes = Math.floor(contentBase64.length * 3 / 4);
    if (approxBytes > MAX_BYTES) return fail(413, 'El comprobante pesa demasiado (máximo 3 MB).');

    // 1) Registrar como "por revisar" usando la sesión del usuario: la función SQL
    //    valida pendientes duplicados y decide si corresponde el acceso provisional.
    const asUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: rows, error: rpcError } = await asUser.rpc('submit_payment_receipt', {
      p_email_referencia: user.email ?? '',
      p_notes: notes || null,
    });
    if (rpcError) {
      const message = rpcError.message || '';
      if (message.includes('pendiente')) return fail(409, 'Ya tienes un comprobante pendiente de revisión.');
      console.error("[submit-receipt] RPC error:", message);
      return fail(500, 'No se pudo registrar el comprobante. Intenta de nuevo.');
    }
    const receipt = Array.isArray(rows) ? rows[0] : rows;
    const receiptId = receipt?.receipt_id;
    const provisionalUntil = receipt?.provisional_access_until ?? null;

    // 2) Mandar el aviso con el comprobante adjunto. Si falla, se deshace el registro
    //    para que el usuario pueda reintentar y tú nunca pierdas un comprobante.
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, clinic_name')
      .eq('id', user.id)
      .maybeSingle();

    const when = new Date().toLocaleString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      dateStyle: 'full',
      timeStyle: 'short',
    });
    const doctorName = escapeHtml(profile?.full_name || 'Sin nombre');
    const clinicName = escapeHtml(profile?.clinic_name || 'Sin clínica');
    const accountEmail = escapeHtml(user.email);
    const safeNotes = escapeHtml(notes);

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #b45309; margin: 0 0 12px;">Comprobante por revisar</h2>
        <p style="margin: 0 0 16px; color: #475569;">${when}</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #64748b;">Doctor</td><td><strong>${doctorName}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Clínica</td><td>${clinicName}</td></tr>
          <tr><td style="padding: 6px 0; color: #64748b;">Cuenta</td><td>${accountEmail}</td></tr>
          ${safeNotes ? `<tr><td style="padding: 6px 0; color: #64748b;">Nota</td><td>${safeNotes}</td></tr>` : ''}
          <tr><td style="padding: 6px 0; color: #64748b;">Acceso provisional</td><td>${provisionalUntil ? 'Sí, 3 días' : 'No (ya usó uno reciente)'}</td></tr>
        </table>
        <p style="margin: 20px 0 8px; color: #334155;">La captura va adjunta a este correo.</p>
        <p style="margin: 0 0 20px; color: #334155;">
          Revisa el pago y suma los días desde
          <a href="${APP_URL}/admin" style="color: #2563eb;">Ajustes → Panel interno de cobros</a>.
        </p>
      </div>
    `;

    const resend = new Resend(resendApiKey);
    const { error: sendError } = await resend.emails.send({
      from: Deno.env.get('RESEND_FROM_EMAIL') ?? 'DienteLink Cobros <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `Por revisar: ${profile?.full_name || user.email}`,
      html,
      attachments: [{ filename: `comprobante-${Date.now()}.${extension}`, content: contentBase64 }],
    });

    if (sendError) {
      console.error("[submit-receipt] Resend rechazó el correo:", JSON.stringify(sendError));
      if (receiptId) await admin.from('payment_receipts').delete().eq('id', receiptId);
      return fail(502, 'No se pudo enviar el comprobante. Intenta de nuevo en unos minutos.');
    }

    return new Response(
      JSON.stringify({ success: true, provisional_access_until: provisionalUntil }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("[submit-receipt] Error:", err?.message);
    return fail(500, 'Error inesperado. Intenta de nuevo.');
  }
});
