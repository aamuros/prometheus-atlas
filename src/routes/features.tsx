import { createRoute } from '@tanstack/react-router';
import { loadCatalog } from '../features/discovery/catalog';
import { FeaturesPage } from '../features/features/features-page';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/features',
  loader: loadCatalog,
  component: FeaturesRoute,
});

export function FeaturesRoute() {
  return <FeaturesPage catalog={Route.useLoaderData()} />;
}
