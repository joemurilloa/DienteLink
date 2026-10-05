import type { PatientRecord } from '../types';

export interface FinanceSummaryData {
  collectedToday: number;
  collectedMonth: number;
  totalOwed: number;
  debtors: { patient: PatientRecord; balance: number }[];
}

/** Cobrado hoy / este mes y saldos pendientes. `todayISO` = 'YYYY-MM-DD' local. */
export function computeFinance(patients: PatientRecord[], todayISO: string): FinanceSummaryData {
  const month = todayISO.slice(0, 7);
  let collectedToday = 0;
  let collectedMonth = 0;
  const debtors: { patient: PatientRecord; balance: number }[] = [];

  for (const p of patients) {
    const payments = p.payments || [];
    for (const pay of payments) {
      if (!pay.date) continue;
      if (pay.date === todayISO) collectedToday += pay.amount;
      if (pay.date.startsWith(month)) collectedMonth += pay.amount;
    }
    const budget = (p.budget || []).reduce((s, b) => s + b.unitCost * b.quantity, 0);
    const paid = payments.reduce((s, x) => s + x.amount, 0);
    const balance = budget - paid;
    if (balance > 0) debtors.push({ patient: p, balance });
  }

  debtors.sort((a, b) => b.balance - a.balance);
  return {
    collectedToday,
    collectedMonth,
    totalOwed: debtors.reduce((s, d) => s + d.balance, 0),
    debtors,
  };
}
