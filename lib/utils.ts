
import { PerioSite, PerioToothData, PeriodontogramData } from '../types';

export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
  }).format(amount);
}

export function generateId(): string {
  return crypto.randomUUID();
}

// --- Periodontogram helpers ---

const DEFAULT_SITE: PerioSite = { depth: 0, recession: 0, bleeding: false };

export function createDefaultPeriodontogramData(): PeriodontogramData {
  return {
    teeth: Array.from({ length: 32 }, (_, i): PerioToothData => ({
      toothId: i + 1,
      buccal: [{ ...DEFAULT_SITE }, { ...DEFAULT_SITE }, { ...DEFAULT_SITE }],
      lingual: [{ ...DEFAULT_SITE }, { ...DEFAULT_SITE }, { ...DEFAULT_SITE }],
      mobility: 0,
      furcation: 0,
    })),
  };
}

export function migrateLegacyPeriodontogram(old: number[]): PeriodontogramData {
  return {
    teeth: Array.from({ length: 32 }, (_, i): PerioToothData => {
      const d = old[i] || 0;
      const site: PerioSite = { depth: d, recession: 0, bleeding: false };
      return {
        toothId: i + 1,
        buccal: [{ ...site }, { ...site }, { ...site }],
        lingual: [{ ...site }, { ...site }, { ...site }],
        mobility: 0,
        furcation: 0,
      };
    }),
  };
}

/** Detects old number[] format and converts to PeriodontogramData */
export function ensurePeriodontogramData(raw: any): PeriodontogramData {
  if (!raw) return createDefaultPeriodontogramData();
  if (Array.isArray(raw)) return migrateLegacyPeriodontogram(raw);
  if (raw.teeth && Array.isArray(raw.teeth)) return raw as PeriodontogramData;
  return createDefaultPeriodontogramData();
}
