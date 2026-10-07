import type { DayAvailability, DoctorAvailability } from '../types';

export const CLINIC_DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
] as const;

export interface ClinicHours {
  days: number[];
  start: string;
  end: string;
  lunch: boolean;
  lunchStart: string;
  lunchEnd: string;
}

export const DEFAULT_CLINIC_HOURS: ClinicHours = {
  days: [1, 2, 3, 4, 5],
  start: '08:00',
  end: '17:00',
  lunch: true,
  lunchStart: '12:00',
  lunchEnd: '14:00',
};

export function hoursFromAvailability(availability: DoctorAvailability): ClinicHours {
  const enabled = availability.weeklySchedule.filter(d => d.enabled && d.timeSlots.length > 0);
  if (!enabled.length) return { ...DEFAULT_CLINIC_HOURS, days: [] };

  const first = enabled[0].timeSlots;
  const lunch = first.length >= 2;
  return {
    days: enabled.map(d => d.dayOfWeek),
    start: first[0].start,
    end: first[first.length - 1].end,
    lunch,
    lunchStart: lunch ? first[0].end : DEFAULT_CLINIC_HOURS.lunchStart,
    lunchEnd: lunch ? first[1].start : DEFAULT_CLINIC_HOURS.lunchEnd,
  };
}

export function scheduleFromHours(hours: ClinicHours): DayAvailability[] {
  const slots = hours.lunch
    ? [{ start: hours.start, end: hours.lunchStart }, { start: hours.lunchEnd, end: hours.end }]
    : [{ start: hours.start, end: hours.end }];

  return [0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => ({
    dayOfWeek,
    enabled: hours.days.includes(dayOfWeek),
    timeSlots: hours.days.includes(dayOfWeek) ? slots : [],
  }));
}

export function hoursError(hours: ClinicHours): string | null {
  if (!hours.days.length) return 'Elige al menos un día.';
  if (hours.start >= hours.end) return 'La hora de salida tiene que ser después de la de entrada.';
  if (!hours.lunch) return null;
  if (hours.lunchStart <= hours.start || hours.lunchEnd >= hours.end || hours.lunchStart >= hours.lunchEnd) {
    return 'La pausa tiene que quedar dentro del horario.';
  }
  return null;
}
