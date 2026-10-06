import { describe, it, expect } from 'vitest';
import { isAuthCallbackUrl } from '../lib/supabase';

describe('isAuthCallbackUrl()', () => {
  it('ignores marketing and app paths', () => {
    expect(isAuthCallbackUrl('http://localhost:3000/welcome')).toBe(false);
    expect(isAuthCallbackUrl('http://localhost:3000/')).toBe(false);
    expect(isAuthCallbackUrl('http://localhost:3000/login')).toBe(false);
    expect(isAuthCallbackUrl('https://dientelink.app/calendar')).toBe(false);
    expect(isAuthCallbackUrl('http://localhost:3000/#/welcome')).toBe(false);
  });

  it('detects PKCE query callbacks', () => {
    expect(isAuthCallbackUrl('http://localhost:3000/?code=abc123')).toBe(true);
    expect(isAuthCallbackUrl('http://localhost:3000/?error=access_denied')).toBe(true);
  });

  it('detects implicit-grant tokens in the hash', () => {
    expect(isAuthCallbackUrl('http://localhost:3000/#access_token=aaa&refresh_token=bbb')).toBe(true);
    expect(isAuthCallbackUrl('http://localhost:3000/#error_description=denied')).toBe(true);
  });
});
