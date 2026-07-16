import { describe, expect, it } from 'vitest';
import { getLoginRedirectPath, getProtectedLoginPath } from './authRedirect';

describe('auth redirects', () => {
  it('preserves protected route when redirecting to login', () => {
    expect(getProtectedLoginPath('/monthly-closing', '')).toBe('/login?redirect=%2Fmonthly-closing');
  });

  it('preserves query string for protected route redirects', () => {
    expect(getProtectedLoginPath('/monthly-closing', '?month=2026-07')).toBe('/login?redirect=%2Fmonthly-closing%3Fmonth%3D2026-07');
  });

  it('sends logged user back to requested internal route', () => {
    expect(getLoginRedirectPath('/monthly-closing')).toBe('/monthly-closing');
  });

  it('falls back to dashboard when redirect is missing or external', () => {
    expect(getLoginRedirectPath(null)).toBe('/dashboard');
    expect(getLoginRedirectPath('https://evil.test')).toBe('/dashboard');
    expect(getLoginRedirectPath('//evil.test')).toBe('/dashboard');
  });
});
