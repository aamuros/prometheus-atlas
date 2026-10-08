import type { HealthResponse, MemberProfile } from '../../shared/api';

export async function logoutAccess(): Promise<void> {
  const response = await fetch('/cdn-cgi/access/logout', {
    credentials: 'same-origin',
    cache: 'no-store',
    redirect: 'manual',
  });
  // Do not follow provider redirects. The logout response clears the cookie;
  // the loaded SPA can display /sign-in without requesting protected assets.
  if (
    !response.ok &&
    response.type !== 'opaqueredirect' &&
    !(response.status >= 300 && response.status < 400)
  )
    throw new Error('Sign out failed');
}

export class ProfileError extends Error {
  constructor(
    public readonly reason: 'authentication' | 'denied' | 'unavailable',
  ) {
    super('Unable to load Atlas profile');
  }
}

export async function loadMe(): Promise<MemberProfile> {
  const response = await fetch('/api/me', {
    credentials: 'same-origin',
    redirect: 'manual',
    cache: 'no-store',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'application/json',
    },
  });
  // Access can intercept expired AJAX sessions before Hono is invoked.
  if (
    response.status === 401 ||
    response.type === 'opaqueredirect' ||
    (response.status >= 300 && response.status < 400)
  )
    throw new ProfileError('authentication');
  if (response.status === 403) throw new ProfileError('denied');
  if (!response.ok) throw new ProfileError('unavailable');
  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('user' in data) ||
    typeof data.user !== 'object' ||
    data.user === null
  )
    throw new ProfileError('unavailable');
  const user = data.user;
  if (
    !('id' in user) ||
    typeof user.id !== 'string' ||
    !user.id ||
    !('email' in user) ||
    typeof user.email !== 'string' ||
    !user.email ||
    !('role' in user) ||
    (user.role !== 'admin' && user.role !== 'developer') ||
    ('name' in user && typeof user.name !== 'string')
  )
    throw new ProfileError('unavailable');
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    ...('name' in user && typeof user.name === 'string'
      ? { name: user.name }
      : {}),
  };
}

export async function loadHealth(): Promise<HealthResponse> {
  const response = await fetch('/api/health');
  if (!response.ok) throw new Error('API request failed.');

  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    data.status !== 'ok'
  ) {
    throw new Error('Invalid API response.');
  }
  return { status: data.status };
}
