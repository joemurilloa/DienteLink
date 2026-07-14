// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { Resend } from "https://esm.sh/resend@3.2.0"

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
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const payload = await req.json()

    // This webhook is triggered by an INSERT into appointments table.
    const record = payload.record;

    if (!record || (record.status !== 'pending' && record.status !== 'Programada')) {
      return new Response("Not a pending or scheduled appointment, or invalid payload", { status: 200, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get doctor profile to get email
    const { data: doctor, error: doctorError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', record.doctor_id)
      .single()

    if (doctorError || !doctor) {
      throw new Error(`Doctor not found: ${doctorError?.message}`)
    }

    // Get doctor email from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(record.doctor_id)
    const doctorEmail = authUser?.user?.email

    if (!doctorEmail) {
      console.warn("No email found for doctor", record.doctor_id)
    }

    // Handle field names from both 'appointments' and 'appointment_requests' tables
    
    function escapeHtml(str: any): string {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    const date = escapeHtml(record.requested_date || record.date || 'Fecha no especificada');
    const time = escapeHtml(record.requested_time || record.time || 'Hora no especificada');
    const type = escapeHtml(record.appointment_type || record.type || 'Consulta General');
    const message = escapeHtml(record.message || 'Sin mensaje adicional');

    // Note: To use Resend, make sure to set the RESEND_API_KEY environment variable in Supabase.
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (resendApiKey && doctorEmail) {
      const resend = new Resend(resendApiKey)
      
      const isManual = record.status === 'Programada';
      const title = isManual ? 'Nueva Cita Agendada' : 'Nueva Solicitud de Cita';
      const greetingText = isManual 
        ? `<p>Se ha agendado una nueva cita en tu calendario para <strong>${escapeHtml(record.patient_name)}</strong>.</p>`
        : `<p>Tienes una nueva solicitud de cita en DienteLink de parte de <strong>${escapeHtml(record.patient_name)}</strong>.</p>`;
      
      const actionText = isManual 
        ? `<p>Puedes ver los detalles completos ingresando a tu calendario en DienteLink.</p>`
        : `<p>Por favor, ingresa a tu panel de DienteLink para Aceptar o Rechazar esta solicitud.</p>`;

      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">${title}</h2>
          <p>Hola Dr. ${doctor.full_name},</p>
          ${greetingText}
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> ${date}</p>
            <p style="margin: 0 0 8px 0;"><strong>Hora:</strong> ${time}</p>
            <p style="margin: 0;"><strong>Tipo:</strong> ${type}</p>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #d1d5db;">
              <p style="margin: 0;"><strong>Comentarios / Motivo:</strong><br/>${message}</p>
            </div>
          </div>
          ${actionText}
          <br/>
          <p style="color: #6b7280; font-size: 12px;">Equipo DienteLink</p>
        </div>
      `;

      // Enviar correo al doctor
      await resend.emails.send({
        from: 'DienteLink Notificaciones <onboarding@resend.dev>', // Update with a verified domain if you have one
        to: doctorEmail,
        subject: isManual ? `Nueva Cita Agendada - ${escapeHtml(record.patient_name)}` : `Nueva solicitud de cita - ${escapeHtml(record.patient_name)}`,
        html: emailHtml,
      });
      console.log('Correo enviado a', doctorEmail);

      // Si es una solicitud pública, enviar acuse de recibo al paciente
      if (!isManual && record.patient_email) {
        const patientEmailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Solicitud de Cita Recibida</h2>
            <p>Hola ${escapeHtml(record.patient_name)},</p>
            <p>Hemos recibido exitosamente tu solicitud de cita para la clínica del Dr(a). <strong>${doctor.full_name}</strong>.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 8px 0;"><strong>Fecha solicitada:</strong> ${date}</p>
              <p style="margin: 0 0 8px 0;"><strong>Hora solicitada:</strong> ${time}</p>
              <p style="margin: 0;"><strong>Tipo de atención:</strong> ${type}</p>
            </div>
            <p><strong>¿Qué sigue?</strong><br/>
            La clínica revisará tu solicitud y te contactará pronto para confirmarla. Nuestro tiempo medio de respuesta es de unas cuantas horas.</p>
            <br/>
            <p style="color: #6b7280; font-size: 12px;">Equipo DienteLink</p>
          </div>
        `;
        
        await resend.emails.send({
          from: 'DienteLink Citas <onboarding@resend.dev>', 
          to: record.patient_email,
          subject: 'Recibimos tu solicitud de cita',
          html: patientEmailHtml,
        });
        console.log('Correo enviado al paciente', record.patient_email);
      }

    } else {
      console.warn("RESEND_API_KEY no está configurado o el doctor no tiene email.");
    }

    // 2. Sileo In-App Notification (If Sileo supports API triggers)
    // Sileo usually works on the client-side for toast notifications. 
    // To send a notification to a specific user using Sileo remotely, you might need a realtime DB table 
    // like 'notifications' that the client listens to, or if Sileo provides a webhook, call it here.
    // For now, we will insert a notification into a hypothetical 'notifications' table if it exists.
    
    // await supabase.from('notifications').insert({ ... })

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } })

  } catch (err) {
    console.error("Webhook Error:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } })
  }
})
