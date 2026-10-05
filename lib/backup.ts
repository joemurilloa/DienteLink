import { supabase } from './supabase';
import { dbToPatient } from '../hooks/usePatients';
import { getLocalISODate } from './utils';
import type { PatientRecord } from '../types';

const LAST_BACKUP_KEY = 'dientelink_last_backup';
const PAGE_SIZE = 50;

export function getLastBackupDate(): Date | null {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    return raw ? new Date(raw) : null;
  } catch {
    return null;
  }
}

function markBackupDone() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

function esc(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  return '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
}

function safeFile(name: string): string {
  return (name || 'paciente')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'paciente';
}

interface BackupOptions {
  clinicId: string;
  clinicName: string;
  doctorName: string;
  includePDFs: boolean;
  onProgress?: (message: string, percent: number) => void;
}

/** Descarga TODO lo del consultorio en un ZIP: datos crudos (JSON), tablas (CSV) y un PDF por expediente. */
export async function createFullBackup(opts: BackupOptions): Promise<{ patients: number; appointments: number; pdfFailures: number }> {
  const { clinicId, clinicName, doctorName, includePDFs, onProgress } = opts;
  const progress = (m: string, p: number) => onProgress?.(m, p);

  progress('Leyendo pacientes…', 2);
  const rawPatients: any[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('patients')
      .select('*, evolution_notes(*), clinical_events(*), budget_items(*), payments(*), consent_forms(*), prescriptions(*), lab_works(*)')
      .eq('doctor_id', clinicId)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`No se pudieron leer los pacientes: ${error.message}`);
    if (!data || data.length === 0) break;
    rawPatients.push(...data);
    progress(`Leyendo pacientes… (${rawPatients.length})`, 2 + Math.min(18, rawPatients.length / 10));
    if (data.length < PAGE_SIZE) break;
  }

  progress('Leyendo citas…', 22);
  const { data: rawAppointments, error: aptErr } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', clinicId);
  if (aptErr) throw new Error(`No se pudieron leer las citas: ${aptErr.message}`);

  const patients: PatientRecord[] = rawPatients.map(p =>
    dbToPatient(p, p.evolution_notes || [], p.clinical_events || [], p.budget_items || [], p.payments || [], p.consent_forms || [], p.prescriptions || [], p.lab_works || [])
  );

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const today = getLocalISODate(new Date());

  // 1) Datos crudos: copia fiel de la base, para restaurar o migrar.
  progress('Armando archivo de datos…', 25);
  zip.file('datos_completos.json', JSON.stringify({
    generado: new Date().toISOString(),
    consultorio: clinicName,
    doctor: doctorName,
    version_formato: 1,
    pacientes: rawPatients,
    citas: rawAppointments || [],
  }, null, 2));

  // 2) Tablas para Excel
  zip.file('pacientes.csv', toCSV(
    ['Nombre', 'Teléfono', 'Email', 'Género', 'Fecha nacimiento', 'Dirección', 'Ocupación', 'Alergias', 'Medicamentos', 'Enfermedades previas', 'Motivo de consulta', 'Registrado'],
    patients.map(p => [
      p.identification.fullName, p.identification.phone, p.identification.email, p.identification.gender,
      p.identification.birthDate, p.identification.address, p.identification.occupation,
      p.clinicalHistory.allergies.join('; '), p.clinicalHistory.medications, p.clinicalHistory.previousDiseases,
      p.clinicalHistory.motiveOfConsult, p.createdAt,
    ]),
  ));

  zip.file('notas_de_evolucion.csv', toCSV(
    ['Paciente', 'Fecha', 'Procedimiento', 'Nota'],
    patients.flatMap(p => p.evolutionNotes.map(n => [p.identification.fullName, n.date, n.procedure, n.content])),
  ));

  zip.file('presupuestos.csv', toCSV(
    ['Paciente', 'Fecha', 'Tratamiento', 'Pieza', 'Cantidad', 'Costo unitario', 'Total', 'Estado'],
    patients.flatMap(p => p.budget.map(b => [p.identification.fullName, b.createdAt, b.treatment, b.toothId ?? '', b.quantity, b.unitCost, b.unitCost * b.quantity, b.status])),
  ));

  zip.file('pagos.csv', toCSV(
    ['Paciente', 'Fecha', 'Monto', 'Método', 'Nota'],
    patients.flatMap(p => (p.payments || []).map(x => [p.identification.fullName, x.date, x.amount, x.method, x.note])),
  ));

  zip.file('citas.csv', toCSV(
    ['Paciente', 'Fecha', 'Hora', 'Tipo', 'Estado', 'Teléfono'],
    (rawAppointments || []).map((a: any) => [a.patient_name, a.date, a.time, a.type, a.status, a.phone_number]),
  ));

  // 3) Un PDF legible por expediente
  let pdfFailures = 0;
  if (includePDFs && patients.length > 0) {
    const { generatePatientPDF } = await import('./pdfGenerator');
    const folder = zip.folder('expedientes')!;
    for (let i = 0; i < patients.length; i++) {
      const p = patients[i];
      progress(`Generando expediente ${i + 1} de ${patients.length}…`, 30 + (i / patients.length) * 62);
      try {
        const blob = await generatePatientPDF(p, clinicName, doctorName, { asBlob: true });
        if (blob) folder.file(`${safeFile(p.identification.fullName)}_${p.id.slice(0, 6)}.pdf`, blob);
      } catch (e) {
        pdfFailures++;
        console.error('[backup] PDF falló para', p.id, e);
      }
    }
  }

  zip.file('LEEME.txt', [
    `RESPALDO DE ${clinicName.toUpperCase()}`,
    `Generado: ${new Date().toLocaleString('es-HN')}`,
    `Doctor: ${doctorName}`,
    `Pacientes: ${patients.length} · Citas: ${(rawAppointments || []).length}`,
    '',
    'CONTENIDO',
    '- datos_completos.json : copia fiel de TODA la información (para restaurar o migrar a otro sistema).',
    '- pacientes.csv, notas_de_evolucion.csv, presupuestos.csv, pagos.csv, citas.csv : se abren con Excel.',
    includePDFs ? '- expedientes/ : un PDF legible por paciente (historia clínica, odontograma, notas, recetas, consentimientos).' : '- (No se incluyeron PDFs de expedientes.)',
    '',
    'Guarde este archivo en un lugar seguro (disco externo o nube personal).',
    'Se recomienda hacer un respaldo al menos una vez al mes.',
  ].join('\n'));

  progress('Comprimiendo…', 94);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Respaldo_DienteLink_${safeFile(clinicName)}_${today}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  markBackupDone();
  progress('Listo', 100);
  return { patients: patients.length, appointments: (rawAppointments || []).length, pdfFailures };
}
