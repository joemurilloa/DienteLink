import React from 'react';
import { cn } from '../lib/utils';
import { CLINIC_DAYS, type ClinicHours } from '../lib/clinicHours';

interface Props {
  value: ClinicHours;
  onChange: (next: ClinicHours) => void;
}

const ClinicHoursFields: React.FC<Props> = ({ value, onChange }) => {
  const toggleDay = (day: number) => {
    const days = value.days.includes(day)
      ? value.days.filter(d => d !== day)
      : [...value.days, day];
    onChange({ ...value, days });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {CLINIC_DAYS.map(day => {
          const on = value.days.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggleDay(day.value)}
              className={cn(
                'h-11 min-w-11 px-3 rounded-xl text-sm font-bold border transition-all',
                on ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500',
              )}
            >
              {day.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">De</span>
          <input
            type="time"
            value={value.start}
            onChange={e => onChange({ ...value, start: e.target.value })}
            className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">A</span>
          <input
            type="time"
            value={value.end}
            onChange={e => onChange({ ...value, end: e.target.value })}
            className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="flex items-center justify-between gap-3 cursor-pointer">
        <span className="text-sm font-semibold text-slate-700">Pausa al mediodía</span>
        <input
          type="checkbox"
          checked={value.lunch}
          onChange={e => onChange({ ...value, lunch: e.target.checked })}
          className="w-5 h-5 rounded-md"
        />
      </label>

      {value.lunch && (
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pausa desde</span>
            <input
              type="time"
              value={value.lunchStart}
              onChange={e => onChange({ ...value, lunchStart: e.target.value })}
              className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vuelvo a</span>
            <input
              type="time"
              value={value.lunchEnd}
              onChange={e => onChange({ ...value, lunchEnd: e.target.value })}
              className="w-full px-3 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold outline-none focus:border-blue-500"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default ClinicHoursFields;
