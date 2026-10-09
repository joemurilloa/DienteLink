import React, { useMemo } from 'react';
import type { PatientRecord } from '../types';
import { formatCurrency, getLocalISODate } from '../lib/utils';
import { computeFinance } from '../lib/finance';

interface Props {
  patients: PatientRecord[];
}

const FinanceSummary: React.FC<Props> = ({ patients }) => {
  const { collectedToday, collectedMonth } = useMemo(
    () => computeFinance(patients, getLocalISODate(new Date())),
    [patients],
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="card-premium flex flex-col px-3 sm:px-5 py-3.5 sm:py-4 gap-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Cobrado hoy</span>
          <span className="text-[15px] sm:text-2xl font-bold whitespace-nowrap text-emerald-600 tabular-nums leading-none tracking-tight">{formatCurrency(collectedToday)}</span>
        </div>
        <div className="card-premium flex flex-col px-3 sm:px-5 py-3.5 sm:py-4 gap-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Este mes</span>
          <span className="text-[15px] sm:text-2xl font-bold whitespace-nowrap text-slate-900 tabular-nums leading-none tracking-tight">{formatCurrency(collectedMonth)}</span>
        </div>
      </div>
    </section>
  );
};

export default FinanceSummary;
