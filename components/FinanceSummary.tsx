import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PatientRecord } from '../types';
import { cn, formatCurrency, getLocalISODate } from '../lib/utils';
import { whatsappService } from '../services/whatsappService';
import { computeFinance } from '../lib/finance';
import WhatsAppAction from './WhatsAppAction';

interface Props {
  patients: PatientRecord[];
  clinicName?: string;
}

const MAX_VISIBLE = 5;

const FinanceSummary: React.FC<Props> = ({ patients, clinicName }) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const { collectedToday, collectedMonth, totalOwed, debtors } = useMemo(
    () => computeFinance(patients, getLocalISODate(new Date())),
    [patients],
  );

  const visible = expanded ? debtors : debtors.slice(0, MAX_VISIBLE);

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="card-premium flex flex-col px-3 sm:px-5 py-3.5 sm:py-4 gap-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Cobrado hoy</span>
          <span className="text-[15px] sm:text-2xl font-bold whitespace-nowrap text-emerald-600 tabular-nums leading-none tracking-tight">{formatCurrency(collectedToday)}</span>
        </div>
        <div className="card-premium flex flex-col px-3 sm:px-5 py-3.5 sm:py-4 gap-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Este mes</span>
          <span className="text-[15px] sm:text-2xl font-bold whitespace-nowrap text-slate-900 tabular-nums leading-none tracking-tight">{formatCurrency(collectedMonth)}</span>
        </div>
        <div className="card-premium flex flex-col px-3 sm:px-5 py-3.5 sm:py-4 gap-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Me deben</span>
          <span className={cn('text-[15px] sm:text-2xl font-bold whitespace-nowrap tabular-nums leading-none tracking-tight', totalOwed > 0 ? 'text-amber-600' : 'text-slate-400')}>
            {formatCurrency(totalOwed)}
          </span>
        </div>
      </div>

      {debtors.length > 0 && (
        <div className="card-premium p-3 sm:p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2 px-1">
            Saldos pendientes ({debtors.length})
          </p>
          <ul className="divide-y divide-slate-100">
            {visible.map(({ patient, balance }) => (
              <li key={patient.id} className="flex items-center justify-between gap-3 py-2.5 px-1">
                <button
                  onClick={() => navigate(`/patient/${patient.id}`)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <p className="text-sm font-semibold text-slate-800 truncate">{patient.identification.fullName}</p>
                  <p className="text-xs font-bold text-amber-600">{formatCurrency(balance)}</p>
                </button>
                <WhatsAppAction
                  storageKey={`cobro_${patient.id}`}
                  label="Cobrar"
                  sentLabel="Avisado"
                  title="Abrir WhatsApp con el recordatorio de pago"
                  send={() => whatsappService.sendPaymentReminder(
                    patient.identification.phone,
                    patient.identification.fullName,
                    formatCurrency(balance),
                    clinicName,
                  )}
                />
              </li>
            ))}
          </ul>
          {debtors.length > MAX_VISIBLE && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="mt-1 w-full flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 py-2 cursor-pointer"
            >
              {expanded ? <>Ver menos <ChevronUp size={13} /></> : <>Ver todos ({debtors.length}) <ChevronDown size={13} /></>}
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default FinanceSummary;
