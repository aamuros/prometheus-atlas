import type { Plugin } from 'vite';
import type { MeResponse } from '../shared/api.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { safeReturnTo } from '../shared/auth-navigation.ts';

const localCookie = 'atlas_local_profile';

export function handleLocalProfile(
  request: IncomingMessage,
  response: ServerResponse,
  next: () => void,
) {
  const url = new URL(request.url ?? '/', 'http://localhost');
  if (
    !['/api/me', '/api/auth/sign-in', '/cdn-cgi/access/logout'].includes(
      url.pathname,
    ) ||
    (request.method !== 'GET' && request.method !== 'HEAD')
  )
    return next();
  response.setHeader('Cache-Control', 'no-store');
  if (url.pathname === '/cdn-cgi/access/logout') {
    response.setHeader(
      'Set-Cookie',
      `${localCookie}=signed-out; Path=/; HttpOnly; SameSite=Lax`,
    );
    response.statusCode = 204;
    response.end();
    return;
  }
  if (url.pathname === '/api/auth/sign-in') {
    response.setHeader(
      'Set-Cookie',
      `${localCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    );
    response.setHeader(
      'Location',
      safeReturnTo(url.searchParams.get('returnTo')),
    );
    response.statusCode = 302;
    response.end();
    return;
  }
  const signedOut = request.headers.cookie
    ?.split(';')
    .some((cookie) => cookie.trim() === `${localCookie}=signed-out`);
  response.setHeader('Content-Type', 'application/json');
  response.statusCode = signedOut ? 401 : 200;
  response.end(
    request.method === 'HEAD'
      ? undefined
      : JSON.stringify(
          signedOut
            ? { error: 'Authentication required' }
            : ({
                user: {
                  id: 'local-fixture',
                  email: 'developer@example.invalid',
                  name: 'Local developer',
                  role: 'developer',
                },
              } satisfies MeResponse),
        ),
  );
}

// Vite middleware only: never imported by the Worker or browser bundles.
// The cookie switches only fictional UI fixtures. The Worker never reads it.
// No identity headers, database access, runtime flags, or local private data.
export function localProfile(): Plugin {
  return {
    name: 'atlas-local-profile',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(handleLocalProfile);
    },
  };
}
