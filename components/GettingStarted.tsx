import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useAuth } from '../services/authService';

interface Props {
  hasPatient: boolean;
  hasAppointment: boolean;
  hasPayment: boolean;
  onNewAppointment: () => void;
}

/** Guía de 3 pasos para el doctor nuevo. Se oculta sola al completarse o al cerrarla. */
const GettingStarted: React.FC<Props> = ({ hasPatient, hasAppointment, hasPayment, onNewAppointment }) => {
  const navigate = useNavigate();
  const { clinicId, user } = useAuth();
  const key = `dientelink_getting_started_dismissed_${clinicId || user?.id || 'default'}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(key) === '1'; } catch { return false; }
  });

  const steps = [
    { done: hasPatient, label: 'Registra tu primer paciente', hint: 'Ficha, alergias y odontograma', action: () => navigate('/patients') },
    { done: hasAppointment, label: 'Agenda una cita', hint: 'Desde aquí o con tu enlace de reservas', action: onNewAppointment },
    { done: hasPayment, label: 'Registra un cobro', hint: 'Ficha del paciente → Finanzas → genera el recibo', action: () => navigate('/patients') },
  ];
  const doneCount = steps.filter(s => s.done).length;

  if (dismissed || doneCount === steps.length) return null;

  const dismiss = () => {
    try { localStorage.setItem(key, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <section className="card-premium p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">Empieza en 3 pasos</h2>
          <p className="text-xs text-slate-500 mt-0.5">{doneCount} de {steps.length} completados</p>
        </div>
        <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Cerrar guía">
          <X size={16} />
        </button>
      </div>
      <ul className="space-y-2">
        {steps.map((s, i) => (
          <li key={i}>
            <button
              onClick={s.action}
              disabled={s.done}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-slate-50 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-default"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${s.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {s.done ? <Check size={13} /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${s.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{s.label}</span>
                {!s.done && <span className="block text-xs text-slate-500">{s.hint}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default GettingStarted;
