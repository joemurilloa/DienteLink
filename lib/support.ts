// Soporte directo por WhatsApp (sin subir capturas a la web).
export const SUPPORT_WHATSAPP = '50498053628';

interface ReportContext {
  doctorName?: string;
  clinicName?: string;
  email?: string;
}

/** Abre WhatsApp con un mensaje listo que incluye dónde estaba el doctor y su navegador. */
export function openProblemReport(ctx: ReportContext = {}): void {
  const page = window.location.hash || window.location.pathname;
  const lines = [
    'Hola, quiero reportar un problema en DienteLink:',
    '',
    '(Escribe aquí qué pasó)',
    '',
    '— Datos automáticos —',
    ctx.doctorName ? `Doctor: ${ctx.doctorName}` : '',
    ctx.clinicName ? `Clínica: ${ctx.clinicName}` : '',
    ctx.email ? `Correo: ${ctx.email}` : '',
    `Pantalla: ${page}`,
    `Fecha: ${new Date().toLocaleString('es-HN')}`,
    `Navegador: ${navigator.userAgent.slice(0, 120)}`,
  ];
  const url = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
