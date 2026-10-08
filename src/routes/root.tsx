import {
  createRootRoute,
  Link,
  Outlet,
  useRouterState,
  useRouter,
  redirect,
} from '@tanstack/react-router';
import { useEffect } from 'react';
import { NotFound } from '../components/not-found';
import { RouteError } from '../components/route-error';
import { CatalogLoading } from '../components/catalog-loading';
import { CatalogSearch } from '../features/discovery/catalog-search';
import { SampleNotice } from '../features/discovery/sample-notice';
import { loadProfile } from '../features/auth/profile';
import { AccessMessage } from '../features/auth/access-message';
import { SignOutButton } from '../features/auth/sign-out-button';
import { safeReturnTo } from '../../shared/auth-navigation';

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const auth = await loadProfile();
    if (
      (auth.status === 'authentication' || auth.status === 'denied') &&
      location.pathname !== '/sign-in'
    ) {
      throw redirect({
        to: '/sign-in',
        search: { returnTo: safeReturnTo(location.href) },
        replace: true,
      });
    }
    return { auth };
  },
  component: AppLayout,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
  pendingComponent: CatalogLoading,
});

export function AppLayout() {
  const { auth } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      void router.invalidate();
    };
    window.addEventListener('focus', refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.clearInterval(interval);
    };
  }, [router]);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  if (pathname === '/sign-in') return <Outlet />;
  if (auth.status !== 'authenticated') return <AccessMessage auth={auth} />;
  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="app-header">
        <div className="header-left">
          <Link
            to="/"
            search={{ q: '', feature: '' }}
            className="brand"
            aria-label="Atlas home"
          >
            <img
              src="/atlas-logo.png"
              alt=""
              className="brand-logo"
              width={40}
              height={40}
            />
          </Link>
          <nav aria-label="Main navigation">
            <Link
              to="/"
              search={{ q: '', feature: '' }}
              activeOptions={{ exact: true, includeSearch: false }}
              activeProps={{ className: 'active-nav', 'aria-current': 'page' }}
            >
              Discover
            </Link>
            <Link
              to="/projects"
              activeProps={{ className: 'active-nav', 'aria-current': 'page' }}
            >
              Projects
            </Link>
            <Link
              to="/features"
              activeProps={{ className: 'active-nav', 'aria-current': 'page' }}
            >
              Features
            </Link>
          </nav>
        </div>
        <div className="header-center">
          <CatalogSearch />
        </div>
        <div className="header-right">
          <details className="workspace-profile">
            <summary
              className="workspace-avatar"
              aria-label="Workspace profile"
              title="Workspace profile"
            >
              {(auth.user.name ?? auth.user.email).slice(0, 1).toUpperCase()}
            </summary>
            <div className="workspace-profile-panel">
              <p>{auth.user.name ?? auth.user.email}</p>
              <span>{auth.user.role === 'admin' ? 'Admin' : 'Developer'}</span>
              <SignOutButton>Sign out</SignOutButton>
            </div>
          </details>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="app-main">
        <Outlet />
        {pathname !== '/' && <SampleNotice compact />}
      </main>
    </div>
  );
}
