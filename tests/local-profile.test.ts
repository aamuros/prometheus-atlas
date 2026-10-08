import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { describe, expect, it, vi } from 'vitest';
import { handleLocalProfile } from '../tools/local-profile';

function request(path: string, cookie?: string, method = 'GET') {
  // Real Node request/response objects without a listening server or network I/O.
  const incoming = new IncomingMessage(new Socket());
  incoming.url = path;
  incoming.method = method;
  if (cookie) incoming.headers.cookie = cookie;
  const response = new ServerResponse(incoming);
  const end = vi.spyOn(response, 'end').mockReturnValue(response);
  const next = vi.fn();
  handleLocalProfile(incoming, response, next);
  return { response, end, next };
}

describe('Development-only profile fixture navigation', () => {
  it('simulates logout, denies the profile, and permits an explicit fixture sign-in', () => {
    expect(request('/api/me').response.statusCode).toBe(200);
    const logout = request('/cdn-cgi/access/logout');
    expect(logout.response.statusCode).toBe(204);
    const cookie = logout.response.getHeader('set-cookie');
    expect(typeof cookie).toBe('string');
    const profile = request('/api/me', String(cookie));
    expect(profile.response.statusCode).toBe(401);
    expect(profile.end).toHaveBeenCalledWith(
      JSON.stringify({ error: 'Authentication required' }),
    );
    const login = request(
      '/api/auth/sign-in?returnTo=%2Fprojects',
      String(cookie),
    );
    expect(login.response.statusCode).toBe(302);
    expect(login.response.getHeader('location')).toBe('/projects');
    expect(login.response.getHeader('set-cookie')).toContain('Max-Age=0');
    expect(
      request('/api/me', String(login.response.getHeader('set-cookie')))
        .response.statusCode,
    ).toBe(200);
  });

  it('rejects external redirects in fixture login', () => {
    expect(
      request(
        '/api/auth/sign-in?returnTo=https://attacker.invalid',
      ).response.getHeader('location'),
    ).toBe('/');
  });

  it('passes unrelated routes and methods to the real Worker', () => {
    expect(request('/api/admin/members').next).toHaveBeenCalledOnce();
    expect(request('/api/me', undefined, 'POST').next).toHaveBeenCalledOnce();
  });
});
