import { describe, expect, it } from 'vitest';
import { safeReturnTo, signInHref } from '../shared/auth-navigation';
import { app } from '../worker/app';

describe('Authentication return routing', () => {
  it('preserves internal pages, search, and anchors', () => {
    expect(safeReturnTo('/projects/northstar?q=hello#implementation')).toBe(
      '/projects/northstar?q=hello#implementation',
    );
    expect(signInHref('/projects')).toBe(
      '/api/auth/sign-in?returnTo=%2Fprojects',
    );
  });

  it.each([
    undefined,
    '',
    'https://attacker.invalid',
    '//attacker.invalid',
    '/\\attacker.invalid',
    '/path/..//attacker.invalid',
    '/%2f%2fattacker.invalid',
    '/%5cattacker.invalid',
    '/%0d%0aLocation:evil',
    '/sign-in',
    '/sign-in?returnTo=/sign-in',
    '/api/me',
    '/%61pi/me',
    '/cdn-cgi/access/logout',
    '/bad%encoding',
  ])('rejects unsafe or looping destinations: %s', (value) => {
    expect(safeReturnTo(value)).toBe('/');
  });

  it.each([
    ['/projects/northstar', '/projects/northstar'],
    ['https://attacker.invalid', '/'],
    ['/sign-in', '/'],
  ])(
    'returns the browser safely after Access login: %s',
    async (returnTo, expected) => {
      const response = await app.request(
        `/api/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
      );
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe(expected);
      expect(response.headers.get('cache-control')).toBe('no-store');
    },
  );

  it('rejects unsupported sign-in methods', async () => {
    const response = await app.request('/api/auth/sign-in', { method: 'POST' });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
  });
});
