import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import type { WorkerBindings } from '../../env';

export type VerifiedIdentity = {
  issuer: string;
  subject: string;
  email: string;
  name?: string;
};

export function accessConfiguration(env: WorkerBindings) {
  const issuer = env.CF_ACCESS_TEAM_DOMAIN;
  const audience = env.CF_ACCESS_AUD;
  // Exact HTTPS origin only: no paths, credentials, ports, or alternate JWKS hosts.
  if (
    !issuer ||
    !/^https:\/\/[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/.test(
      issuer,
    ) ||
    !audience ||
    !/^[a-f0-9]{64}$/.test(audience)
  ) {
    throw new Error('Access configuration unavailable');
  }
  return { issuer, audience };
}

// Only public signing keys are cached. Never cache identities or memberships.
let cachedKeys: { issuer: string; keys: JWTVerifyGetKey } | undefined;

function remoteKeys(issuer: string) {
  if (cachedKeys?.issuer !== issuer) {
    cachedKeys = {
      issuer,
      keys: createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`), {
        timeoutDuration: 5000,
      }),
    };
  }
  return cachedKeys.keys;
}

export async function verifyAccessIdentity(
  token: string,
  env: WorkerBindings,
  getKey?: JWTVerifyGetKey,
): Promise<VerifiedIdentity> {
  const { issuer, audience } = accessConfiguration(env);
  const { payload } = await jwtVerify(token, getKey ?? remoteKeys(issuer), {
    issuer,
    audience,
    algorithms: ['RS256'],
    requiredClaims: ['iss', 'aud', 'sub', 'email', 'exp', 'iat', 'nbf', 'type'],
  });
  if (
    payload.type !== 'app' ||
    typeof payload.sub !== 'string' ||
    !payload.sub.trim() ||
    typeof payload.email !== 'string' ||
    !/^[^\s@]+@[^\s@]+$/.test(payload.email) ||
    typeof payload.iat !== 'number' ||
    payload.iat > Math.floor(Date.now() / 1000)
  ) {
    throw new Error('Invalid user identity');
  }
  return {
    issuer,
    subject: payload.sub,
    email: payload.email,
    ...(typeof payload.name === 'string' && payload.name.trim()
      ? { name: payload.name }
      : {}),
  };
}
