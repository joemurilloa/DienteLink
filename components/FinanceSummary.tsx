import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { PatientRecord, Payment } from '../types';
import { cn, formatCurrency, getLocalISODate } from '../lib/utils';
import { whatsappService } from '../services/whatsappService';
import { computeFinance, createPayment, PAYMENT_METHOD_OPTIONS, paymentMethodLabel } from '../lib/finance';
import { usePatientMutations } from '../hooks/usePatients';
import WhatsAppAction from './WhatsAppAction';
import { sileo } from 'sileo';

interface Props {
  patients: PatientRecord[];
  clinicName?: string;
}

const MAX_VISIBLE = 5;

const FinanceSummary: React.FC<Props> = ({ patients, clinicName }) => {
  const navigate = useNavigate();
  const { addPayment } = usePatientMutations();
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState<{ patient: PatientRecord; balance: number } | null>(null);
  const [method, setMethod] = useState<Payment['method']>('cash');

  const { collectedToday, collectedMonth, totalOwed, debtors } = useMemo(
    () => computeFinance(patients, getLocalISODate(new Date())),
    [patients],
  );

  const visible = expanded ? debtors : debtors.slice(0, MAX_VISIBLE);

  const handleConfirmPay = async () => {
    if (!confirming || addPayment.isPending) return;
    const { patient, balance } = confirming;
    const payment = createPayment(balance, method, 'Pago de saldo pendiente');
    try {
      await addPayment.mutateAsync({ patientId: patient.id, payment });
      sileo.success({
        title: 'Pago registrado',
        description: `${patient.identification.fullName} · ${formatCurrency(balance)} · ${paymentMethodLabel(method)}`,
      });
      setConfirming(null);
      setMethod('cash');
    } catch {
      // El error lo muestra la mutación
    }
  };

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
              <li key={patient.id} className="flex items-center justify-between gap-2 py-2.5 px-1">
                <button
                  onClick={() => navigate(`/patient/${patient.id}?tab=budget`)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <p className="text-sm font-semibold text-slate-800 truncate">{patient.identification.fullName}</p>
                  <p className="text-xs font-bold text-amber-600">{formatCurrency(balance)}</p>
                </button>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <WhatsAppAction
                    storageKey={`cobro_${patient.id}`}
                    variant="icon"
                    label="Recordar por WhatsApp"
                    sentLabel="Avisado"
                    title="Abrir WhatsApp con el recordatorio de pago"
                    send={() => whatsappService.sendPaymentReminder(
                      patient.identification.phone,
                      patient.identification.fullName,
                      formatCurrency(balance),
                      clinicName,
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => { setMethod('cash'); setConfirming({ patient, balance }); }}
                    className="h-10 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all whitespace-nowrap"
                  >
                    Confirmar pago
                  </button>
                </div>
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

      {confirming && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => !addPayment.isPending && setConfirming(null)}>
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Pago tardío</p>
            <h3 className="text-xl font-bold text-slate-900 mb-1">{confirming.patient.identification.fullName}</h3>
            <p className="text-3xl font-black text-slate-900 tabular-nums mb-2">{formatCurrency(confirming.balance)}</p>
            <p className="text-sm text-slate-500 mb-5">Se registra el saldo completo con fecha de hoy.</p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {PAYMENT_METHOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMethod(opt.value)}
                  className={cn(
                    'py-3 rounded-xl text-sm font-bold border transition-all',
                    method === opt.value
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={addPayment.isPending}
                onClick={() => setConfirming(null)}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={addPayment.isPending}
                onClick={handleConfirmPay}
                className="flex-[2] py-3.5 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
              >
                {addPayment.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {addPayment.isPending ? 'Registrando...' : 'Sí, ya pagó'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FinanceSummary;
