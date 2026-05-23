// Pure helpers for time slot calculation used by BookingService.
// Kept isolated so they can be unit tested and are resilient to
// runtime failures in the rest of the service.

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(m: number): string {
  return `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
}

/**
 * Generate available slot times (HH:MM) for a given date and availability.
 * This is pure logic and does not touch network/DB.
 */
export function generateAvailableSlots(date: string, availability: any): string[] {
  // Parse targetDate properly from YYYY-MM-DD
  const [y, m, d] = date.split('-').map(Number);
  const localTargetDate = new Date(y, m - 1, d);
  const dayOfWeek = localTargetDate.getDay();
  const dayConfig = availability.weeklySchedule.find((dd: any) => dd.dayOfWeek === dayOfWeek);
  if (!dayConfig || !dayConfig.enabled) return [];

  const slots: string[] = [];

  // Calculate current time in minutes to filter out past slots if the date is today
  const nowLocal = new Date();
  const isToday = nowLocal.getFullYear() === y && nowLocal.getMonth() === m - 1 && nowLocal.getDate() === d;
  const currentMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();
  // Add a 30-minute buffer so they can't book for "right now"
  const minimumMinutes = isToday ? currentMinutes + 30 : 0;

  for (const ts of dayConfig.timeSlots) {
    const start = timeToMinutes(ts.start);
    const end = timeToMinutes(ts.end);
    for (let t = start; t < end; t += availability.slotDuration) {
      if (t >= minimumMinutes) {
        slots.push(minutesToTime(t));
      }
    }
  }
  return slots;
}
