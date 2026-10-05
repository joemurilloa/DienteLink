import React, { useState } from 'react';
import { DatabaseBackup, Download, CheckCircle2 } from 'lucide-react';
import { sileo } from 'sileo';
import { useAuth } from '../../../services/authService';
import { createFullBackup, getLastBackupDate } from '../../../lib/backup';

const BackupSettings: React.FC = () => {
  const { clinicId, profile, isGuest } = useAuth();
  const [includePDFs, setIncludePDFs] = useState(true);
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState('');
  const [lastBackup, setLastBackup] = useState<Date | null>(() => getLastBackupDate());

  const daysAgo = lastBackup ? Math.floor((Date.now() - lastBackup.getTime()) / 86_400_000) : null;

  const handleBackup = async () => {
    if (running) return;
    if (isGuest || !clinicId) {
      sileo.warning({ title: 'No disponible en modo demo', description: 'Inicia sesión con tu cuenta para respaldar tus datos.' });
      return;
    }
    setRunning(true);
    setPercent(0);
    try {
      const res = await createFullBackup({
        clinicId,
        clinicName: profile?.clinic_name || 'Consultorio',
        doctorName: profile?.full_name || 'Doctor',
        includePDFs,
        onProgress: (m, p) => { setMessage(m); setPercent(Math.round(p)); },
      });
      setLastBackup(getLastBackupDate());
      sileo.success({
        title: 'Respaldo descargado',
        description: `${res.patients} pacientes y ${res.appointments} citas.${res.pdfFailures ? ` ${res.pdfFailures} PDF no se pudieron generar (sus datos sí están en el archivo).` : ''}`,
      });
    } catch (e) {
      console.error(e);
      sileo.error({ title: 'No se pudo crear el respaldo', description: e instanceof Error ? e.message : 'Intenta de nuevo.' });
    } finally {
      setRunning(false);
      setMessage('');
    }
  };

  return (
    <div className="card-premium p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
          <DatabaseBackup size={18} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Respaldo de tu información</h3>
          <p className="text-sm text-slate-500">Todos tus pacientes en un solo archivo, siempre tuyo</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-3">
        Incluye expedientes, notas, presupuestos, pagos y citas. Un archivo ZIP con los datos completos, tablas para Excel
        y un PDF por paciente. Sirve para guardar tu historial o para llevártelo a otro sistema.
      </p>

      <div className={`flex items-center gap-2 text-xs font-semibold mb-4 ${daysAgo === null || daysAgo > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
        <CheckCircle2 size={14} />
        {lastBackup
          ? `Último respaldo: ${lastBackup.toLocaleDateString('es-HN')} (hace ${daysAgo} día${daysAgo === 1 ? '' : 's'})`
          : 'Aún no has descargado un respaldo'}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-600 mb-4 cursor-pointer">
        <input type="checkbox" checked={includePDFs} onChange={e => setIncludePDFs(e.target.checked)} disabled={running} />
        Incluir un PDF por cada expediente (tarda más si tienes muchos pacientes)
      </label>

      {running && (
        <div className="mb-4">
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{message}</p>
        </div>
      )}

      <button
        onClick={handleBackup}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-all cursor-pointer"
      >
        <Download size={16} />
        {running ? 'Preparando respaldo…' : 'Descargar respaldo completo'}
      </button>
      <p className="text-xs text-slate-400 mt-3">Guárdalo en un disco externo o en tu nube personal. Recomendado: una vez al mes.</p>
    </div>
  );
};

export default BackupSettings;
