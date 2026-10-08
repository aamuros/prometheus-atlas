import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { secureHeaders } from 'hono/secure-headers';
import type { ApiError, HealthResponse, MeResponse } from '../shared/api';
import { createDatabase } from './db/client';
import { listMembers } from './db/members';
import type { AtlasEnv } from './env';
import {
  authDependencies,
  requireIdentity,
  requireMember,
  requireRole,
} from './features/auth/middleware';
import type { AuthDependencies } from './features/auth/middleware';
import { safeReturnTo } from '../shared/auth-navigation';

export function createApp(dependencies: AuthDependencies = authDependencies) {
  const app = new Hono<AtlasEnv>();

  app.use('*', async (c, next) => {
    const start = performance.now();
    c.header('Cache-Control', 'no-store');
    await next();
    // Do not log URLs, headers, bodies, or exception messages by default.
    console.info(
      JSON.stringify({
        method: c.req.method,
        status: c.res.status,
        durationMs: Math.round(performance.now() - start),
      }),
    );
  });

  app.use(
    '*',
    secureHeaders({
      strictTransportSecurity: false,
      xFrameOptions: 'DENY',
      referrerPolicy: 'no-referrer',
      permissionsPolicy: { camera: [], microphone: [], geolocation: [] },
      contentSecurityPolicy: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    }),
  );

  app.get('/api/health', (c) => {
    return c.json({ status: 'ok' } satisfies HealthResponse);
  });

  app.all('/api/health', (c) => {
    c.header('Allow', 'GET, HEAD');
    return c.json({ error: 'Method not allowed' } satisfies ApiError, 405);
  });

  // Access owns the OAuth challenge before this endpoint reaches the Worker.
  // This route only returns the browser to a validated same-origin page.
  app.get('/api/auth/sign-in', (c) =>
    c.redirect(safeReturnTo(c.req.query('returnTo')), 302),
  );
  app.all('/api/auth/sign-in', (c) => {
    c.header('Allow', 'GET, HEAD');
    return c.json({ error: 'Method not allowed' } satisfies ApiError, 405);
  });

  app.use(
    '/api/me',
    requireIdentity(dependencies.verifyIdentity),
    requireMember(dependencies.lookupMember),
  );
  app.get('/api/me', (c) => {
    const identity = c.get('identity');
    const member = c.get('member');
    return c.json({
      user: {
        id: member.id,
        email: identity.email,
        role: member.role,
        ...(identity.name ? { name: identity.name } : {}),
      },
    } satisfies MeResponse);
  });
  app.all('/api/me', (c) => {
    c.header('Allow', 'GET, HEAD');
    return c.json({ error: 'Method not allowed' } satisfies ApiError, 405);
  });

  app.use(
    '/api/admin/*',
    requireIdentity(dependencies.verifyIdentity),
    requireMember(dependencies.lookupMember),
    requireRole('admin'),
  );
  app.get('/api/admin/members', async (c) => {
    return c.json({
      members: await listMembers(createDatabase(c.env.DATABASE_URL)),
    });
  });

  app.notFound((c) => c.json({ error: 'Not found' } satisfies ApiError, 404));

  app.onError((error, c) => {
    const status = error instanceof HTTPException ? error.status : 500;
    return c.json(
      {
        error: status >= 500 ? 'Internal server error' : 'Request rejected',
      } satisfies ApiError,
      status,
    );
  });
  return app;
}

export const app = createApp();
