import { describe, expect, it, vi } from 'vitest';
import { loadMe, ProfileError } from '../src/lib/api';
import { loadProfile } from '../src/features/auth/profile';

describe('Authenticated profile client', () => {
  it('requests a same-origin uncached profile and keeps only public fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          user: {
            id: 'member',
            email: 'member@example.invalid',
            role: 'admin',
            name: 'Member',
            token: 'hidden',
          },
        }),
      ),
    );
    expect(await loadMe()).toEqual({
      id: 'member',
      email: 'member@example.invalid',
      role: 'admin',
      name: 'Member',
    });
    expect(fetch).toHaveBeenCalledWith(
      '/api/me',
      expect.objectContaining({
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'manual',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'application/json',
        },
      }),
    );
  });

  it.each([401, 302])(
    'treats Access status %s as requiring authentication',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(null, { status })),
      );
      expect(await loadProfile()).toEqual({ status: 'authentication' });
    },
  );

  it('handles browser opaque Access redirects', async () => {
    const response = new Response();
    Object.defineProperty(response, 'type', { value: 'opaqueredirect' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response),
    );
    await expect(loadMe()).rejects.toEqual(new ProfileError('authentication'));
  });

  it.each([
    {},
    { user: null },
    { user: { id: 'member', email: 'member@example.invalid', role: 'owner' } },
    {
      user: {
        id: 'member',
        email: 'member@example.invalid',
        role: 'developer',
        name: 7,
      },
    },
  ])('rejects invalid profile contracts', async (body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(body)),
    );
    expect(await loadProfile()).toEqual({ status: 'unavailable' });
  });

  it('hides HTML login pages and provider errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>private details</html>')),
    );
    expect(await loadProfile()).toEqual({ status: 'unavailable' });
  });
});
