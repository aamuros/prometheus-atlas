import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../worker/app';
import type { AtlasMember } from '../worker/db/schema';
import { verifyAccessIdentity } from '../worker/features/auth/identity';
import {
  requireIdentity,
  requireMember,
  requireRole,
} from '../worker/features/auth/middleware';
import { Hono } from 'hono';
import type { AtlasEnv } from '../worker/env';

const issuer = 'https://atlas-test.cloudflareaccess.com';
const audience = 'a'.repeat(64);
const env = { CF_ACCESS_TEAM_DOMAIN: issuer, CF_ACCESS_AUD: audience };
let privateKey: CryptoKey;
let otherKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;
let publicKeys: { keys: Awaited<ReturnType<typeof exportJWK>>[] };
const member: AtlasMember = {
  id: 'member-id',
  accessIssuer: issuer,
  accessSubject: 'verified-user',
  email: 'developer@example.invalid',
  role: 'developer',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};
const lookupMember = vi.fn(async () => member as AtlasMember | undefined);

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair('RS256')).privateKey;
  publicKeys = {
    keys: [
      { ...(await exportJWK(pair.publicKey)), kid: 'test-key', alg: 'RS256' },
    ],
  };
  keys = createLocalJWKSet(publicKeys);
});

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  lookupMember.mockReset().mockResolvedValue({ ...member });
});

async function token(
  claims: Record<string, unknown> = {},
  signingKey = privateKey,
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    iss: issuer,
    aud: [audience],
    sub: member.accessSubject,
    email: member.email,
    type: 'app',
    iat: now,
    nbf: now - 1,
    exp: now + 300,
    ...claims,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .sign(signingKey);
}

function application() {
  return createApp({
    verifyIdentity: (jwt, bindings) =>
      verifyAccessIdentity(jwt, bindings, keys),
    lookupMember,
  });
}

async function request(jwt?: string, path = '/api/me', bindings = env) {
  return application().request(
    path,
    { headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} },
    bindings,
  );
}

describe('Cloudflare Access identity', () => {
  it('uses the configured Cloudflare JWKS URL and caches only public signing keys', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(publicKeys)),
    );
    const jwt = await token();
    expect(await verifyAccessIdentity(jwt, env)).toMatchObject({
      subject: member.accessSubject,
    });
    expect(await verifyAccessIdentity(jwt, env)).toMatchObject({
      subject: member.accessSubject,
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
      `${issuer}/cdn-cgi/access/certs`,
    );
  });

  it('rejects symmetric algorithms even with otherwise valid claims', async () => {
    const jwt = await new SignJWT({
      iss: issuer,
      aud: audience,
      sub: member.accessSubject,
      email: member.email,
      type: 'app',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setNotBefore(0)
      .setExpirationTime('5m')
      .sign(crypto.getRandomValues(new Uint8Array(32)));
    expect((await request(jwt)).status).toBe(401);
    expect(lookupMember).not.toHaveBeenCalled();
  });
  it('accepts signed application tokens and exposes only the member profile', async () => {
    const response = await request(
      await token({ name: 'Verified developer', secret: 'private-claim' }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: {
        id: member.id,
        email: member.email,
        name: 'Verified developer',
        role: 'developer',
      },
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(lookupMember).toHaveBeenCalledWith(env, {
      issuer,
      subject: member.accessSubject,
      email: member.email,
      name: 'Verified developer',
    });
  });

  it.each([
    ['expired', { exp: 1 }],
    ['audience', { aud: 'wrong' }],
    ['issuer', { iss: 'https://other.cloudflareaccess.com' }],
    ['not yet valid', { nbf: 9999999999 }],
    ['future issuance', { iat: 9999999999 }],
    ['service identity', { sub: '' }],
    ['missing subject', { sub: undefined }],
    ['missing email', { email: undefined }],
    ['missing expiration', { exp: undefined }],
    ['missing issuance', { iat: undefined }],
    ['missing not-before', { nbf: undefined }],
    ['organization token', { type: 'org' }],
  ])('rejects %s tokens before database access', async (_label, claims) => {
    const response = await request(await token(claims));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Authentication required' });
    expect(lookupMember).not.toHaveBeenCalled();
  });

  it('rejects invalid signatures', async () => {
    expect((await request(await token({}, otherKey))).status).toBe(401);
    expect(lookupMember).not.toHaveBeenCalled();
  });

  it.each([undefined, 'malformed.token', ''])(
    'rejects missing or malformed JWTs',
    async (jwt) => {
      expect((await request(jwt)).status).toBe(401);
      expect(lookupMember).not.toHaveBeenCalled();
    },
  );

  it.each([
    {},
    { CF_ACCESS_TEAM_DOMAIN: issuer },
    { CF_ACCESS_AUD: audience },
    { ...env, CF_ACCESS_TEAM_DOMAIN: 'https://attacker.invalid' },
    { ...env, CF_ACCESS_TEAM_DOMAIN: `${issuer}/` },
    { ...env, CF_ACCESS_AUD: ' ' },
  ])('fails closed for missing or invalid bindings: %j', async (bindings) => {
    const response = await application().request(
      '/api/me',
      { headers: { 'Cf-Access-Jwt-Assertion': await token() } },
      bindings,
    );
    expect(response.status).toBe(401);
    expect(lookupMember).not.toHaveBeenCalled();
  });

  it('ignores client identity headers', async () => {
    const response = await application().request(
      '/api/me',
      {
        headers: {
          'Cf-Access-Authenticated-User-Email': member.email,
          'X-User-Id': member.id,
        },
      },
      env,
    );
    expect(response.status).toBe(401);
    expect(lookupMember).not.toHaveBeenCalled();
  });
});

describe('Atlas authorization', () => {
  it.each([undefined, { ...member, active: false }])(
    'denies unknown and disabled members',
    async (result) => {
      lookupMember.mockResolvedValue(result);
      expect((await request(await token())).status).toBe(403);
    },
  );

  it('ignores roles supplied in verified claims, headers, and query strings', async () => {
    const response = await application().request(
      '/api/admin/members?role=admin',
      {
        headers: {
          'Cf-Access-Jwt-Assertion': await token({ role: 'admin' }),
          'X-Atlas-Role': 'admin',
        },
      },
      env,
    );
    expect(response.status).toBe(403);
  });

  it('requires authentication for administrator operations', async () => {
    expect((await request(undefined, '/api/admin/members')).status).toBe(401);
  });

  it('allows admins and rejects developers on reusable role-protected operations', async () => {
    const api = new Hono<AtlasEnv>();
    api.get(
      '/admin',
      requireIdentity((jwt, bindings) =>
        verifyAccessIdentity(jwt, bindings, keys),
      ),
      requireMember(lookupMember),
      requireRole('admin'),
      (c) => c.json({ allowed: true }),
    );
    const jwt = await token();
    lookupMember.mockResolvedValue({ ...member, role: 'admin' });
    expect(
      (
        await api.request(
          '/admin',
          { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
          env,
        )
      ).status,
    ).toBe(200);
    lookupMember.mockResolvedValue(member);
    expect(
      (
        await api.request(
          '/admin',
          { headers: { 'Cf-Access-Jwt-Assertion': jwt } },
          env,
        )
      ).status,
    ).toBe(403);
  });

  it('denies role middleware used without identity middleware', async () => {
    const api = new Hono<AtlasEnv>();
    api.get('/admin', requireRole('admin'), (c) => c.text('allowed'));
    expect((await api.request('/admin')).status).toBe(401);
  });

  it('rechecks membership so a disabled account loses access immediately', async () => {
    const api = application();
    const init = { headers: { 'Cf-Access-Jwt-Assertion': await token() } };
    expect((await api.request('/api/me', init, env)).status).toBe(200);
    lookupMember.mockResolvedValue({ ...member, active: false });
    expect((await api.request('/api/me', init, env)).status).toBe(403);
  });

  it('fails safely if the database is unavailable', async () => {
    lookupMember.mockRejectedValue(new Error('private database credentials'));
    const response = await request(await token());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
