import { createMiddleware } from 'hono/factory';
import type { MemberRole } from '../../../shared/api';
import { createDatabase } from '../../db/client';
import { findMember } from '../../db/members';
import type { AtlasMember } from '../../db/schema';
import type { AtlasEnv, WorkerBindings } from '../../env';
import { verifyAccessIdentity } from './identity';
import type { VerifiedIdentity } from './identity';

export type AuthDependencies = {
  verifyIdentity: (
    token: string,
    env: WorkerBindings,
  ) => Promise<VerifiedIdentity>;
  lookupMember: (
    env: WorkerBindings,
    identity: VerifiedIdentity,
  ) => Promise<AtlasMember | undefined>;
};

export const authDependencies: AuthDependencies = {
  verifyIdentity: verifyAccessIdentity,
  lookupMember: (env, identity) =>
    findMember(createDatabase(env.DATABASE_URL), identity),
};

export function requireIdentity(
  verifyIdentity = authDependencies.verifyIdentity,
) {
  return createMiddleware<AtlasEnv>(async (c, next) => {
    const token = c.req.header('Cf-Access-Jwt-Assertion');
    if (!token) return c.json({ error: 'Authentication required' }, 401);
    try {
      c.set('identity', await verifyIdentity(token, c.env));
    } catch {
      return c.json({ error: 'Authentication required' }, 401);
    }
    await next();
  });
}

export function requireMember(lookupMember = authDependencies.lookupMember) {
  return createMiddleware<AtlasEnv>(async (c, next) => {
    const identity = c.get('identity');
    if (!identity) return c.json({ error: 'Authentication required' }, 401);
    const member = await lookupMember(c.env, identity);
    if (
      member?.active !== true ||
      !['admin', 'developer'].includes(member.role)
    ) {
      return c.json({ error: 'Access denied' }, 403);
    }
    c.set('member', member);
    await next();
  });
}

export function requireRole(...roles: MemberRole[]) {
  return createMiddleware<AtlasEnv>(async (c, next) => {
    if (!c.get('identity'))
      return c.json({ error: 'Authentication required' }, 401);
    const member = c.get('member');
    if (member?.active !== true || !roles.includes(member.role))
      return c.json({ error: 'Access denied' }, 403);
    await next();
  });
}
