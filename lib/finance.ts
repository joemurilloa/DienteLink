import type { PatientRecord, Payment } from '../types';
import { generateId, getLocalISODate } from './utils';

export const PAYMENT_METHOD_OPTIONS: { value: Payment['method']; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
];

export function paymentMethodLabel(method: Payment['method']): string {
  return PAYMENT_METHOD_OPTIONS.find(m => m.value === method)?.label
    || (method === 'other' ? 'Otro' : method);
}

/** Crea un cobro listo para guardar. El monto es el total del presupuesto. */
export function createPayment(
  amount: number,
  method: Payment['method'] = 'cash',
  note = '',
  date = getLocalISODate(new Date()),
): Payment {
  return { id: generateId(), amount, method, note, date };
}

/** Registra el cobro completo del presupuesto en el expediente. */
export function applyPayment(
  patient: PatientRecord,
  amount: number,
  method: Payment['method'] = 'cash',
  note = '',
  date = getLocalISODate(new Date()),
): PatientRecord {
  return {
    ...patient,
    payments: [...(patient.payments || []), createPayment(amount, method, note, date)],
  };
}

export interface FinanceSummaryData {
  collectedToday: number;
  collectedMonth: number;
}

/** Cobrado hoy y este mes. `todayISO` = 'YYYY-MM-DD' local. */
export function computeFinance(patients: PatientRecord[], todayISO: string): FinanceSummaryData {
  const month = todayISO.slice(0, 7);
  let collectedToday = 0;
  let collectedMonth = 0;

  for (const p of patients) {
    for (const pay of p.payments || []) {
      if (!pay.date) continue;
      if (pay.date === todayISO) collectedToday += pay.amount;
      if (pay.date.startsWith(month)) collectedMonth += pay.amount;
    }
  }

  return { collectedToday, collectedMonth };
}
