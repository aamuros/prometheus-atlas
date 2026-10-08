import { createRoute } from '@tanstack/react-router';
import { loadHealth } from '../lib/api';
import { loadCatalog } from '../features/discovery/catalog';
import { DiscoverPage } from '../features/discovery/discover-page';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === 'string' ? search.q : '',
    feature: typeof search.feature === 'string' ? search.feature : '',
  }),
  loader: async () => {
    const [health, catalog] = await Promise.all([loadHealth(), loadCatalog()]);
    return { health, catalog };
  },
  component: HomePage,
});

export function HomePage() {
  const { catalog } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <DiscoverPage
      catalog={catalog}
      search={search}
      onSearch={(nextSearch) => {
        void navigate({ search: nextSearch });
      }}
    />
  );
}
