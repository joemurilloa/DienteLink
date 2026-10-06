import { describe, it, expect } from 'vitest';
import { legacyHashToPath, publicBookingUrl } from '../lib/legacyHash';

describe('legacyHashToPath()', () => {
  it('converts HashRouter paths', () => {
    expect(legacyHashToPath('#/welcome')).toBe('/welcome');
    expect(legacyHashToPath('#/p/abc-123')).toBe('/p/abc-123');
    expect(legacyHashToPath('#/login')).toBe('/login');
  });

  it('ignores OAuth hashes and in-page anchors', () => {
    expect(legacyHashToPath('#access_token=aaa')).toBeNull();
    expect(legacyHashToPath('#main-content')).toBeNull();
    expect(legacyHashToPath('')).toBeNull();
  });
});

describe('publicBookingUrl()', () => {
  it('builds a clean booking link', () => {
    expect(publicBookingUrl('https://diente-link.vercel.app', 'clinic-1'))
      .toBe('https://diente-link.vercel.app/p/clinic-1');
    expect(publicBookingUrl('https://diente-link.vercel.app/', 'clinic-1'))
      .toBe('https://diente-link.vercel.app/p/clinic-1');
  });
});
