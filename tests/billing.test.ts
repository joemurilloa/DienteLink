import { describe, it, expect } from 'vitest';
import {
  BILLING,
  daysRemaining,
  trialEndFromStart,
  computeTrialDaysLeft,
  isPlatformAdmin,
  nextPeriodEnd,
  subscriptionBannerCopy,
} from '../lib/billing';

describe('computeTrialDaysLeft', () => {
  const start = new Date('2026-10-01T12:00:00');

  it('cuenta 14 el primer día de la prueba', () => {
    expect(computeTrialDaysLeft({
      isTrial: true,
      trialStartedAt: start,
      now: start,
    })).toBe(BILLING.trialDays);
  });

  it('baja los días según pasan', () => {
    expect(computeTrialDaysLeft({
      isTrial: true,
      trialStartedAt: start,
      now: new Date('2026-10-05T12:00:00'),
    })).toBe(10);
  });

  it('llega a 1 el último día y a 0 al vencer', () => {
    expect(computeTrialDaysLeft({
      isTrial: true,
      trialStartedAt: start,
      now: new Date('2026-10-14T12:00:01'),
    })).toBe(1);
    expect(computeTrialDaysLeft({
      isTrial: true,
      trialStartedAt: start,
      now: new Date('2026-10-16T12:00:00'),
    })).toBe(0);
  });

  it('usa la fecha más antigua si la suscripción se reinició', () => {
    expect(computeTrialDaysLeft({
      isTrial: true,
      trialStartedAt: new Date('2026-10-05T12:00:00'),
      accountCreatedAt: start,
      now: new Date('2026-10-08T12:00:00'),
    })).toBe(7);
  });
});

describe('daysRemaining', () => {
  it('devuelve 0 si ya pasó o no hay fecha', () => {
    expect(daysRemaining(null)).toBe(0);
    expect(daysRemaining(new Date('2020-01-01'), new Date('2026-10-05'))).toBe(0);
  });

  it('redondea hacia arriba el día que aún no termina', () => {
    const end = trialEndFromStart(new Date('2026-10-01T12:00:00'));
    expect(daysRemaining(end, new Date('2026-10-14T18:00:00'))).toBe(1);
  });
});

describe('isPlatformAdmin', () => {
  it('solo reconoce el email interno', () => {
    expect(isPlatformAdmin(BILLING.adminEmail)).toBe(true);
    expect(isPlatformAdmin(BILLING.adminEmail.toUpperCase())).toBe(true);
    expect(isPlatformAdmin('otro@clinica.com')).toBe(false);
    expect(isPlatformAdmin('joemurillo95+hack@gmail.com')).toBe(false);
    expect(isPlatformAdmin(null)).toBe(false);
  });
});

describe('nextPeriodEnd', () => {
  const now = new Date('2026-10-05T12:00:00');

  it('suma desde ahora si ya venció', () => {
    const end = nextPeriodEnd(new Date('2026-09-01T12:00:00'), 30, now);
    expect(end.toISOString()).toBe(new Date('2026-11-04T12:00:00').toISOString());
  });

  it('acumula si todavía tiene días', () => {
    const current = new Date('2026-10-20T12:00:00');
    const end = nextPeriodEnd(current, 30, now);
    expect(end.toISOString()).toBe(new Date('2026-11-19T12:00:00').toISOString());
  });
});

describe('subscriptionBannerCopy', () => {
  it('muestra quedan N días y urge el último día', () => {
    expect(subscriptionBannerCopy(90, false).message).toBe('Quedan 90 días');
    expect(subscriptionBannerCopy(1, false)).toEqual({
      message: 'Queda 1 día restante',
      action: 'Activar suscripción',
      urgent: true,
    });
  });
});
