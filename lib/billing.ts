// Única fuente de verdad del cobro. Edita aquí y cambia en toda la app.
export const BILLING = {
  planName: 'Plan Profesional',
  priceAmount: 'L. 250',
  priceCurrency: 'Lempiras',
  priceLabel: 'L. 250 / mes',
  trialDays: 14,
  bank: {
    name: 'BAC Credomatic',
    account: '747076151',
    holder: 'Joe Antonio Murillo Argueta',
  },
  adminEmail: 'joemurilloa@gmail.com',
} as const;

/** Paquetes que el admin interno puede sumar a una clínica. */
export const PLAN_DAYS = [30, 60, 90, 365] as const;
export type PlanDays = (typeof PLAN_DAYS)[number];

export function isPlatformAdmin(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase() === BILLING.adminEmail.toLowerCase();
}

export function planDaysLabel(days: number): string {
  if (days === 365) return '+1 año';
  return `+${days} días`;
}

const DAY_MS = 86_400_000;

/** Días enteros que faltan hasta `end`. 0 si ya pasó. */
export function daysRemaining(end: Date | null | undefined, now = new Date()): number {
  if (!end) return 0;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / DAY_MS);
}

/** Fin de la prueba: inicio + 14 días. */
export function trialEndFromStart(startedAt: Date, trialDays = BILLING.trialDays): Date {
  return new Date(startedAt.getTime() + trialDays * DAY_MS);
}

/**
 * Días de prueba que realmente quedan.
 * Se cuenta desde la fecha de inicio, no desde un 14 fijo, para que el número baje cada día.
 */
export function computeTrialDaysLeft(opts: {
  isTrial: boolean;
  expiresAt?: Date | null;
  trialStartedAt?: Date | null;
  periodStart?: Date | null;
  accountCreatedAt?: Date | null;
  now?: Date;
}): number {
  const now = opts.now ?? new Date();
  if (opts.isTrial) {
    const starts = [opts.trialStartedAt, opts.periodStart, opts.accountCreatedAt].filter(
      (d): d is Date => !!d && !Number.isNaN(d.getTime())
    );
    if (starts.length) {
      const start = starts.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
      return daysRemaining(trialEndFromStart(start), now);
    }
  }
  return daysRemaining(opts.expiresAt, now);
}

/**
 * Si aún tiene días, se suman al vencimiento actual.
 * Si ya venció (o no tiene fecha), se cuentan desde ahora.
 */
export function nextPeriodEnd(currentEnd: Date | null | undefined, days: number, now = new Date()): Date {
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return new Date(base.getTime() + days * DAY_MS);
}

export function subscriptionBannerCopy(daysLeft: number, isTrial: boolean): {
  message: string;
  action: string;
  urgent: boolean;
} {
  const action = 'Activar suscripción';
  if (daysLeft <= 0) {
    return {
      message: isTrial ? 'Tu prueba gratuita venció' : 'Tu suscripción venció',
      action,
      urgent: true,
    };
  }
  if (daysLeft === 1) {
    return { message: 'Queda 1 día restante', action, urgent: true };
  }
  const prefix = isTrial ? 'Prueba gratis · ' : '';
  return { message: `${prefix}Quedan ${daysLeft} días`, action, urgent: false };
}
