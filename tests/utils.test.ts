import { describe, it, expect, beforeEach } from 'vitest';
import {
  cn,
  formatCurrency,
  setCurrencyConfig,
  generateId,
  createDefaultPeriodontogramData,
  migrateLegacyPeriodontogram,
  ensurePeriodontogramData,
} from '../lib/utils';

// ─── cn() ───
describe('cn() — class name helper', () => {
  it('joins multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('a', false, undefined, 'b', '')).toBe('a b');
  });

  it('returns empty string for no valid classes', () => {
    expect(cn(false, undefined)).toBe('');
  });
});

// ─── formatCurrency() ───
describe('formatCurrency()', () => {
  beforeEach(() => {
    setCurrencyConfig('USD', 'en-US');
  });

  it('formats number as USD currency', () => {
    const result = formatCurrency(1500);
    expect(result).toContain('1,500');
    expect(result).toContain('$');
  });

  it('formats zero correctly', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('formats decimals correctly', () => {
    const result = formatCurrency(99.5);
    expect(result).toContain('99.50');
  });

  it('respects currency config changes', () => {
    setCurrencyConfig('EUR', 'es-ES');
    const result = formatCurrency(1000);
    // Should contain euro symbol or EUR text
    expect(result).toMatch(/€|EUR/);
  });
});

// ─── generateId() ───
describe('generateId()', () => {
  it('returns a non-empty string', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('returns unique IDs on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('returns a valid UUID format', () => {
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

// ─── Periodontogram helpers ───
describe('createDefaultPeriodontogramData()', () => {
  it('creates data with 32 teeth', () => {
    const data = createDefaultPeriodontogramData();
    expect(data.teeth).toHaveLength(32);
  });

  it('each tooth has correct structure', () => {
    const data = createDefaultPeriodontogramData();
    const tooth = data.teeth[0];
    expect(tooth.toothId).toBe(1);
    expect(tooth.buccal).toHaveLength(3);
    expect(tooth.lingual).toHaveLength(3);
    expect(tooth.mobility).toBe(0);
    expect(tooth.furcation).toBe(0);
  });

  it('all sites default to zero/false', () => {
    const data = createDefaultPeriodontogramData();
    for (const tooth of data.teeth) {
      for (const site of [...tooth.buccal, ...tooth.lingual]) {
        expect(site.depth).toBe(0);
        expect(site.recession).toBe(0);
        expect(site.bleeding).toBe(false);
      }
    }
  });
});

describe('migrateLegacyPeriodontogram()', () => {
  it('converts number array to PeriodontogramData', () => {
    const old = Array.from({ length: 32 }, (_, i) => i + 1);
    const result = migrateLegacyPeriodontogram(old);
    expect(result.teeth).toHaveLength(32);
    expect(result.teeth[0].buccal[0].depth).toBe(1);
    expect(result.teeth[4].buccal[0].depth).toBe(5);
  });

  it('handles empty legacy array', () => {
    const result = migrateLegacyPeriodontogram([]);
    expect(result.teeth).toHaveLength(32);
    expect(result.teeth[0].buccal[0].depth).toBe(0);
  });
});

describe('ensurePeriodontogramData()', () => {
  it('returns default for null/undefined', () => {
    expect(ensurePeriodontogramData(null).teeth).toHaveLength(32);
    expect(ensurePeriodontogramData(undefined).teeth).toHaveLength(32);
  });

  it('migrates legacy number array', () => {
    const result = ensurePeriodontogramData([3, 4, 5]);
    expect(result.teeth[0].buccal[0].depth).toBe(3);
    expect(result.teeth[1].buccal[0].depth).toBe(4);
  });

  it('passes through valid PeriodontogramData', () => {
    const valid = createDefaultPeriodontogramData();
    valid.teeth[0].mobility = 2;
    const result = ensurePeriodontogramData(valid);
    expect(result.teeth[0].mobility).toBe(2);
  });

  it('returns default for malformed object', () => {
    const result = ensurePeriodontogramData({ foo: 'bar' });
    expect(result.teeth).toHaveLength(32);
  });
});
