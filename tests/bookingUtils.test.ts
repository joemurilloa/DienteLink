import { describe, it, expect, vi, afterEach } from 'vitest';
import { generateAvailableSlots } from '../services/bookingUtils';

describe('generateAvailableSlots', () => {
  afterEach(() => {
    // Restore real timers after manipulating clock
    vi.useRealTimers();
  });

  it('returns empty array when the day is disabled', () => {
    const availability = {
      weeklySchedule: Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, enabled: false, timeSlots: [] })),
      slotDuration: 30,
    } as any;

    const slots = generateAvailableSlots('2026-05-24', availability);
    expect(slots).toEqual([]);
  });

  it('generates 30-minute slots for an enabled day', () => {
    // Pick a concrete date and enable only that weekday
    const date = '2026-05-25'; // a Monday in 2026
    const [y, m, d] = date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();

    const weeklySchedule = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      enabled: i === dow,
      timeSlots: i === dow ? [{ start: '09:00', end: '10:00' }] : [],
    }));

    const availability = { weeklySchedule, slotDuration: 30 } as any;
    const slots = generateAvailableSlots(date, availability);
    expect(slots).toEqual(['09:00', '09:30']);
  });

  it('applies today buffer and filters out immediate slots', () => {
    // Simulate 'today' at 08:55 local time
    const date = '2026-05-25';
    const [y, m, d] = date.split('-').map(Number);
    const now = new Date(y, m - 1, d, 8, 55, 0);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const dow = new Date(y, m - 1, d).getDay();
    const weeklySchedule = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      enabled: i === dow,
      timeSlots: i === dow ? [{ start: '09:00', end: '11:00' }] : [],
    }));

    const availability = { weeklySchedule, slotDuration: 30 } as any;

    // With 08:55 + 30min buffer = 09:25 -> first available slot should be 09:30
    const slots = generateAvailableSlots(date, availability);
    expect(slots[0]).toBe('09:30');
    expect(slots).toContain('10:00');
  });
});
