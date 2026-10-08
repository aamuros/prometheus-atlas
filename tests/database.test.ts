import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDatabase } from '../worker/db/client';
import { findMember } from '../worker/db/members';
import { createApp } from '../worker/app';

const identity = {
  issuer: 'https://atlas-test.cloudflareaccess.com',
  subject: 'verified-subject',
  email: 'developer@example.invalid',
};
const columns = [
  'id',
  'access_issuer',
  'access_subject',
  'email',
  'role',
  'active',
  'created_at',
  'updated_at',
];
const databaseUrl = new URL(
  'postgresql://ep-fixture.neon.tech/atlas?sslmode=require',
);
// Generated disposable values, not credentials to any real database.
databaseUrl.username = crypto.randomUUID();
databaseUrl.password = crypto.randomUUID();
const db = createDatabase(databaseUrl.href);

function result(role = 'developer', active = 't') {
  return Response.json({
    fields: columns.map((name) => ({
      name,
      dataTypeID: name === 'active' ? 16 : 25,
    })),
    rows: [
      [
        'member-id',
        identity.issuer,
        identity.subject,
        identity.email,
        role,
        active,
        '2026-10-08T00:00:00Z',
        '2026-10-08T00:00:00Z',
      ],
    ],
  });
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => result()),
  );
});

describe('Neon HTTP membership persistence boundary', () => {
  it('looks up the exact verified issuer and subject with SQL parameters', async () => {
    const member = await findMember(db, identity);
    expect(member).toMatchObject({
      id: 'member-id',
      role: 'developer',
      active: true,
    });
    expect(member?.createdAt).toBeInstanceOf(Date);
    const call = vi.mocked(fetch).mock.calls[0];
    expect(call?.[0]).toBe('https://api.neon.tech/sql');
    const body: unknown = JSON.parse(String(call?.[1]?.body));
    expect(body).toMatchObject({
      params: [identity.issuer, identity.subject, '1'],
    });
    expect(body).toHaveProperty(
      'query',
      expect.stringContaining('"access_issuer" = $1'),
    );
    expect(body).toHaveProperty(
      'query',
      expect.stringContaining('"access_subject" = $2'),
    );
  });

  it('does not match by email or provision unknown members', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ fields: [], rows: [] }));
    expect(await findMember(db, identity)).toBeUndefined();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('preserves inactive status from the database', async () => {
    vi.mocked(fetch).mockResolvedValue(result('admin', 'f'));
    expect(await findMember(db, identity)).toMatchObject({
      role: 'admin',
      active: false,
    });
  });

  it('allows a stored admin to read the administrator membership endpoint', async () => {
    const api = createApp({
      verifyIdentity: async () => identity,
      lookupMember: () => findMember(db, identity),
    });
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      const body = String(init?.body);
      if (body.includes('access_issuer')) return result('admin');
      return Response.json({
        fields: ['id', 'email', 'role', 'active'].map((name) => ({
          name,
          dataTypeID: name === 'active' ? 16 : 25,
        })),
        rows: [['member-id', identity.email, 'admin', 't']],
      });
    });
    const response = await api.request(
      '/api/admin/members',
      { headers: { 'Cf-Access-Jwt-Assertion': 'test-boundary' } },
      { DATABASE_URL: databaseUrl.href },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      members: [
        { id: 'member-id', email: identity.email, role: 'admin', active: true },
      ],
    });
  });

  it.each([
    undefined,
    '',
    'postgresql://localhost/atlas',
    'https://example.invalid',
  ])('fails closed for missing or invalid database configuration', (url) => {
    expect(() => createDatabase(url)).toThrow();
  });

  it('propagates database failures to the safe API error boundary', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('private connection details'));
    await expect(findMember(db, identity)).rejects.toThrow();
  });
});
