// @vitest-environment jsdom
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppRouter } from '../src/app/router';
import { RouteError } from '../src/components/route-error';
import * as catalogLoader from '../src/features/discovery/catalog';
import { ProjectsPage } from '../src/features/projects/projects-page';
import { FeaturesPage } from '../src/features/features/features-page';
import { app, createApp } from '../worker/app';

// jsdom does not implement native modal opening/closing or Escape handling.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    value() {
      this.setAttribute('open', '');
    },
  },
  close: {
    configurable: true,
    value() {
      this.removeAttribute('open');
    },
  },
});

async function openSearch() {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Search implementations' }),
  );
  return screen.getByRole('searchbox', { name: 'Search implementations' });
}

async function openProfile() {
  fireEvent.click(await screen.findByLabelText('Workspace profile'));
  return screen.findByText('developer@example.invalid');
}

function renderApp(path = '/') {
  const router = createAppRouter(
    createMemoryHistory({ initialEntries: [path] }),
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string) =>
      path === '/api/me'
        ? Promise.resolve(
            Response.json({
              user: {
                id: 'test-member',
                email: 'developer@example.invalid',
                role: 'developer',
              },
            }),
          )
        : app.request(path),
    ),
  );
});

describe('React application', () => {
  it('renders the home page using the real API contract', async () => {
    renderApp();
    expect(
      await screen.findByRole('heading', { name: 'Discover', level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('4 implementations');
    expect(screen.queryByText(/API connected/)).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/health');
    expect(
      screen.queryByText(/Fictional records for evaluation/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('Fictional · Unverified')).toHaveLength(4);
    expect(
      within(
        screen.getByRole('navigation', { name: 'Main navigation' }),
      ).getByRole('link', { name: 'Discover', current: 'page' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main-content');
  });

  it('submits search, persists it in the URL, and supports browser history', async () => {
    const { router } = renderApp();
    const query = await openSearch();
    fireEvent.change(query, { target: { value: '  ORGANIZATION  ' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('2 implementations'),
    );
    expect(router.state.location.search).toEqual({
      q: 'ORGANIZATION',
      feature: '',
    });
    expect(
      screen.queryByRole('link', { name: /Customer account directory/ }),
    ).not.toBeInTheDocument();
    await act(async () => {
      router.history.back();
    });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('4 implementations'),
    );
    expect(
      screen.getByRole('button', { name: 'Search implementations' }),
    ).toHaveTextContent('Search Atlas...');
  });

  it('opens the reference-style search dialog and restores focus when closed', async () => {
    renderApp();
    const query = await openSearch();
    const dialog = screen.getByRole('dialog', { name: 'Explore Atlas' });
    expect(query).toHaveFocus();
    expect(
      await within(dialog).findByRole('button', { name: 'Search Northstar' }),
    ).toBeVisible();
    expect(within(dialog).getByText(/Sample catalog/)).toBeVisible();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Narrow view' }),
    );
    expect(dialog).toHaveClass('search-narrow');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Wide view' }));
    expect(dialog).not.toHaveClass('search-narrow');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Close search' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Search implementations' }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    const reopenedDialog = screen.getByRole('dialog');
    fireEvent(reopenedDialog, new Event('cancel', { cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('previews matching implementations and opens their source context', async () => {
    const { router } = renderApp();
    const query = await openSearch();
    fireEvent.change(query, { target: { value: 'activity' } });
    const dialog = screen.getByRole('dialog');
    const result = await within(dialog).findByRole('link', {
      name: /Organization activity log/,
    });
    fireEvent.click(result);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Relay', level: 1 }),
    ).toBeVisible();
    expect(router.state.location.hash).toBe('relay-audit');
  });

  it('searches by a capability shortcut and clears a previous query', async () => {
    const { router } = renderApp('/?q=organization');
    await openSearch();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(
      await within(dialog).findByRole('button', {
        name: 'Audit history',
      }),
    );
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        q: '',
        feature: 'audit-history',
      }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 implementation');
  });

  it('shows an empty preview and keeps the current capability when submitting', async () => {
    const { router } = renderApp('/?feature=authentication');
    fireEvent.change(await openSearch(), { target: { value: 'missing term' } });
    const dialog = screen.getByRole('dialog');
    expect(
      await within(dialog).findByText(/No implementations found for/),
    ).toBeVisible();
    fireEvent.submit(within(dialog).getByRole('search'));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        q: 'missing term',
        feature: 'authentication',
      }),
    );
  });

  it('shows a safe catalog failure inside search', async () => {
    renderApp();
    await screen.findByRole('heading', { name: 'Discover', level: 1 });
    vi.spyOn(catalogLoader, 'loadCatalog').mockRejectedValueOnce(
      new Error('private catalog details'),
    );
    await openSearch();
    expect(
      await within(screen.getByRole('dialog')).findByRole('alert'),
    ).toHaveTextContent('Could not load the catalog');
    expect(
      screen.queryByText(/private catalog details/),
    ).not.toBeInTheDocument();
  });

  it('combines query and capability filters loaded from a shared URL', async () => {
    renderApp('/?q=organization&feature=authentication');
    expect(
      await screen.findByRole('link', {
        name: /Organization membership access/,
      }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('1 implementation');
    expect(screen.getByRole('combobox', { name: 'Capability' })).toHaveValue(
      'authentication',
    );
    expect(await openSearch()).toHaveValue('organization');
    expect(
      screen.queryByRole('link', { name: /Organization activity log/ }),
    ).not.toBeInTheDocument();
  });

  it('applies the selected capability from the gallery filter', async () => {
    renderApp();
    const capability = await screen.findByRole('combobox', {
      name: 'Capability',
    });
    fireEvent.change(capability, { target: { value: 'audit-history' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('1 implementation'),
    );
    expect(
      screen.getByRole('link', { name: /Organization activity log/ }),
    ).toBeVisible();
  });

  it('filters from search and quick filters while retaining the query', async () => {
    renderApp();
    fireEvent.change(await openSearch(), { target: { value: 'PostgreSQL' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('3 implementations'),
    );
    expect(
      screen.getByRole('button', { name: 'Search implementations' }),
    ).toHaveTextContent('PostgreSQL');
    fireEvent.click(screen.getByRole('button', { name: 'Audit history' }));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('1 implementation'),
    );
    expect(
      screen.getByRole('button', { name: 'Audit history', pressed: true }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Search implementations' }),
    ).toHaveTextContent('PostgreSQL');
    expect(
      screen.getByRole('link', { name: 'Organization activity log' }),
    ).toHaveAttribute('href', '/projects/relay#relay-audit');
    expect(screen.getByText('Fictional · Unverified')).toBeVisible();
  });

  it('keeps capability navigation available without a footer', async () => {
    const { router } = renderApp();
    await screen.findByRole('heading', { name: 'Discover', level: 1 });
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Customers' }));
    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        q: '',
        feature: 'customer-management',
      }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('1 implementation');
    expect(
      screen.getByRole('link', { name: 'Customer account directory' }),
    ).toBeVisible();
  });

  it('keeps profile and sign-out controls behind the workspace avatar', async () => {
    renderApp();
    await screen.findByRole('heading', { name: 'Discover', level: 1 });
    expect(screen.getByRole('button', { name: 'Sign out' })).not.toBeVisible();
    expect(await openProfile()).toBeVisible();
    expect(screen.getByText('Developer')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    fireEvent.click(screen.getByLabelText('Workspace profile'));
    expect(screen.getByRole('button', { name: 'Sign out' })).not.toBeVisible();
  });

  it('starts discovery from the shared header on a project page', async () => {
    renderApp('/projects/northstar');
    expect(
      await screen.findByRole('heading', { name: 'Northstar', level: 1 }),
    ).toBeVisible();
    fireEvent.change(await openSearch(), {
      target: { value: 'activity' },
    });
    fireEvent.submit(screen.getByRole('search'));
    expect(
      await screen.findByRole('link', { name: 'Organization activity log' }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('1 implementation');
  });

  it('shows an empty search state and allows clearing the filters', async () => {
    renderApp('/?q=nonexistent&feature=reporting');
    expect(
      await screen.findByRole('heading', { name: 'No implementations found' }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('0 implementations');
    fireEvent.click(
      screen.getByRole('link', { name: 'Clear search and filters' }),
    );
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('4 implementations'),
    );
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Search implementations' }),
    ).toHaveTextContent('Search Atlas...');
  });

  it('navigates from discovery to the relevant implementation context', async () => {
    const { router } = renderApp();
    fireEvent.click(
      await screen.findByRole('link', { name: /Team sign-in and sessions/ }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Northstar', level: 1 }),
    ).toBeVisible();
    expect(router.state.location.hash).toBe('northstar-access');
    const implementation = screen.getByRole('article', {
      name: 'Team sign-in and sessions',
    });
    expect(
      within(implementation).getByText('Business assumptions'),
    ).toBeVisible();
    expect(
      within(implementation).getByText('Each user belongs to one team.'),
    ).toBeVisible();
    expect(within(implementation).getByText('Session storage')).toBeVisible();
    expect(
      within(implementation).getByText('worker/features/auth/'),
    ).toBeVisible();
    expect(
      within(implementation).getByText(/Synthetic commit and paths/),
    ).toBeVisible();
    expect(
      within(implementation).getByText(/No verification evidence supplied/),
    ).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Organization membership access' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Projects', current: 'page' }),
    ).toBeVisible();
  });

  it('lists projects and opens a project with no implementations', async () => {
    renderApp('/projects');
    expect(
      await screen.findByRole('heading', { name: 'Project Directory' }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole('link', { name: /Fieldnotes/ }));
    expect(
      await screen.findByRole('heading', { name: 'Fieldnotes', level: 1 }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'No implementations cataloged' }),
    ).toBeVisible();
    expect(fetch).toHaveBeenCalledWith('/api/me', expect.any(Object));
  });

  it('shows a project-specific not-found state', async () => {
    renderApp('/projects/missing');
    expect(
      await screen.findByRole('heading', { name: 'Project not found' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Return to Project Directory' }),
    ).toHaveAttribute('href', '/projects');
  });

  it('opens capability results from the Feature Catalog, including an empty capability', async () => {
    renderApp('/features');
    expect(
      await screen.findByRole('heading', { name: 'Feature Catalog' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Authentication/ }),
    ).toHaveAttribute('href', '/?q=&feature=authentication');
    fireEvent.click(screen.getByRole('link', { name: /Reporting/ }));
    expect(
      await screen.findByRole('heading', { name: 'No implementations found' }),
    ).toBeVisible();
    expect(screen.getByRole('combobox')).toHaveValue('reporting');
  });

  it('shows catalog loading while the health request is pending', async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    const response = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        path === '/api/me'
          ? Promise.resolve(
              Response.json({
                user: {
                  id: 'test-member',
                  email: 'developer@example.invalid',
                  role: 'developer',
                },
              }),
            )
          : response,
      ),
    );
    renderApp();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Loading Atlas catalog…',
    );
    await act(async () => {
      resolveResponse(Response.json({ status: 'ok' }));
    });
    expect(
      await screen.findByRole('heading', { name: 'Discover', level: 1 }),
    ).toBeVisible();
  });

  it('shows a safe error if the catalog cannot load', async () => {
    vi.spyOn(catalogLoader, 'loadCatalog').mockRejectedValueOnce(
      new Error('private fixture failure'),
    );
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong',
    );
    expect(screen.queryByText(/private/)).not.toBeInTheDocument();
  });

  it.each([
    ['projects', ProjectsPage, 'No projects yet'],
    ['features', FeaturesPage, 'No features yet'],
  ])('handles an empty %s dataset', async (_name, Page, heading) => {
    const root = createRootRoute();
    const page = createRoute({
      getParentRoute: () => root,
      path: '/',
      component: () => (
        <Page catalog={{ projects: [], features: [], implementations: [] }} />
      ),
    });
    const router = createRouter({
      routeTree: root.addChildren([page]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('heading', { name: heading })).toBeVisible();
  });

  it('shows not-found handling for an unknown client route', async () => {
    renderApp('/missing');
    expect(
      await screen.findByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: 'Return home' })).toHaveAttribute(
      'href',
      '/?q=&feature=',
    );
    expect(fetch).toHaveBeenCalledWith('/api/me', expect.any(Object));
  });

  it.each([
    [
      'failed request',
      () => Promise.resolve(new Response('private details', { status: 500 })),
    ],
    [
      'invalid contract',
      () => Promise.resolve(Response.json({ status: 'unexpected' })),
    ],
    [
      'network failure',
      () => Promise.reject(new Error('private network details')),
    ],
  ])('shows a safe error boundary for a %s', async (_name, fetchResponse) => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string) =>
        path === '/api/me'
          ? Promise.resolve(
              Response.json({
                user: {
                  id: 'test-member',
                  email: 'developer@example.invalid',
                  role: 'developer',
                },
              }),
            )
          : fetchResponse(),
      ),
    );
    renderApp();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong',
    );
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeVisible();
    expect(screen.queryByText(/private/)).not.toBeInTheDocument();
  });

  it('catches component rendering errors', async () => {
    const root = createRootRoute({ errorComponent: RouteError });
    const broken = createRoute({
      getParentRoute: () => root,
      path: '/',
      component: () => {
        throw new Error('private rendering details');
      },
    });
    const router = createRouter({
      routeTree: root.addChildren([broken]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Something went wrong',
    );
    expect(screen.queryByText(/private/)).not.toBeInTheDocument();
  });

  it('shows the current developer and Access logout action', async () => {
    renderApp();
    expect(await openProfile()).toBeVisible();
    expect(screen.getByText('Developer')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });

  it('opens the authentication design directly without catalog content or signup inputs', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    renderApp('/sign-in');
    expect(
      await screen.findByRole('heading', { name: 'Sign in to Atlas' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Continue with GitHub' }),
    ).toHaveAttribute('href', '/api/auth/sign-in?returnTo=%2F');
    expect(
      screen.queryByRole('navigation', { name: 'Main navigation' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith('/api/health');
  });

  it.each(['developer', 'admin'] as const)(
    'uses the backend profile to continue as an authenticated %s',
    async (role) => {
      const identity = {
        issuer: 'https://atlas-test.cloudflareaccess.com',
        subject: 'verified-member',
        email: 'member@example.invalid',
      };
      const backend = createApp({
        // Controlled verification/storage boundaries; real middleware and /api/me handler.
        verifyIdentity: async () => identity,
        lookupMember: async () => ({
          id: 'member-id',
          accessIssuer: identity.issuer,
          accessSubject: identity.subject,
          email: identity.email,
          active: true,
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      });
      vi.mocked(fetch).mockImplementation(async (path) =>
        backend.request(
          String(path),
          { headers: { 'Cf-Access-Jwt-Assertion': 'unit-test-assertion' } },
          {},
        ),
      );
      renderApp('/sign-in');
      expect(
        await screen.findByRole('heading', { name: 'Welcome back to Atlas' }),
      ).toBeVisible();
      expect(
        screen.getByText(
          `member@example.invalid · ${role === 'admin' ? 'Admin' : 'Developer'}`,
        ),
      ).toBeVisible();
      expect(
        screen.getByRole('link', { name: 'Continue to Atlas' }),
      ).toHaveAttribute('href', '/');
      expect(fetch).toHaveBeenCalledWith(
        '/api/me',
        expect.objectContaining({
          credentials: 'same-origin',
          cache: 'no-store',
        }),
      );
      expect(
        screen.queryByRole('link', { name: 'Continue with GitHub' }),
      ).not.toBeInTheDocument();
    },
  );

  it('offers Access logout to switch accounts when membership is denied', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));
    renderApp('/sign-in');
    expect(
      await screen.findByRole('heading', { name: 'Atlas access denied' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Use a different account' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('link', { name: 'Continue with GitHub' }),
    ).not.toBeInTheDocument();
  });

  it.each([
    [401, 'Sign in to Atlas'],
    [403, 'Atlas access denied'],
    [500, 'Atlas is unavailable'],
  ])(
    'handles profile status %s without showing the catalog',
    async (status, title) => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('private details', { status }),
      );
      renderApp();
      expect(await screen.findByRole('heading', { name: title })).toBeVisible();
      expect(
        screen.queryByRole('heading', { name: 'Discover' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/private details/)).not.toBeInTheDocument();
    },
  );

  it('clears the shell when a focused page discovers an expired session', async () => {
    renderApp();
    expect(await openProfile()).toBeVisible();
    vi.mocked(fetch).mockImplementation(async (path) =>
      path === '/api/me'
        ? new Response(null, { status: 401 })
        : app.request('/api/health'),
    );
    fireEvent.focus(window);
    expect(
      await screen.findByRole('heading', { name: 'Sign in to Atlas' }),
    ).toBeVisible();
    expect(
      screen.queryByText('developer@example.invalid'),
    ).not.toBeInTheDocument();
  });

  it('signs out through Access and navigates to /sign-in without retaining the profile', async () => {
    const { router } = renderApp('/projects');
    expect(await openProfile()).toBeVisible();
    let signedOut = false;
    vi.mocked(fetch).mockImplementation(async (path) => {
      if (path === '/cdn-cgi/access/logout') {
        signedOut = true;
        return new Response(null, { status: 204 });
      }
      if (path === '/api/me')
        return signedOut
          ? new Response(null, { status: 401 })
          : Response.json({
              user: {
                id: 'member',
                email: 'developer@example.invalid',
                role: 'developer',
              },
            });
      return app.request(String(path));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(
      await screen.findByRole('heading', { name: 'Sign in to Atlas' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(
      screen.queryByText('developer@example.invalid'),
    ).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      '/cdn-cgi/access/logout',
      expect.objectContaining({
        credentials: 'same-origin',
        redirect: 'manual',
      }),
    );
  });

  it('retains the current page and shows a safe retry message if logout fails', async () => {
    const { router } = renderApp('/projects');
    expect(await openProfile()).toBeVisible();
    vi.mocked(fetch).mockImplementation(async (path) =>
      path === '/cdn-cgi/access/logout'
        ? new Response('private provider details', { status: 500 })
        : Response.json({
            user: {
              id: 'member',
              email: 'developer@example.invalid',
              role: 'developer',
            },
          }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not sign out. Please try again.',
    );
    expect(router.state.location.pathname).toBe('/projects');
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
    expect(
      screen.queryByText(/private provider details/),
    ).not.toBeInTheDocument();
  });

  it('redirects expired sessions to sign-in and preserves the requested page', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));
    const { router } = renderApp('/projects/northstar#northstar-access');
    expect(
      await screen.findByRole('heading', { name: 'Sign in to Atlas' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(
      screen.getByRole('link', { name: 'Continue with GitHub' }),
    ).toHaveAttribute(
      'href',
      '/api/auth/sign-in?returnTo=%2Fprojects%2Fnorthstar%23northstar-access',
    );
  });

  it('returns active members to the validated requested page', async () => {
    renderApp('/sign-in?returnTo=%2Fprojects%2Fnorthstar');
    expect(
      await screen.findByRole('heading', { name: 'Welcome back to Atlas' }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Continue to Atlas' }),
    ).toHaveAttribute('href', '/projects/northstar');
  });

  it('routes denied members to the sign-in page with account-switching available', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 403 }));
    const { router } = renderApp('/projects');
    expect(
      await screen.findByRole('heading', { name: 'Atlas access denied' }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(router.state.location.search).toMatchObject({
      returnTo: '/projects',
    });
    expect(
      screen.getByRole('button', { name: 'Use a different account' }),
    ).toBeEnabled();
  });
});
