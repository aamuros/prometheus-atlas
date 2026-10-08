import {
  createBrowserHistory,
  createRouter,
  type RouterHistory,
} from '@tanstack/react-router';
import { Route as rootRoute } from '../routes/root';
import { Route as homeRoute } from '../routes/index';
import { Route as projectsRoute } from '../routes/projects';
import { Route as projectDetailsRoute } from '../routes/project-details';
import { Route as featuresRoute } from '../routes/features';
import { Route as signInRoute } from '../routes/sign-in';
import { CatalogLoading } from '../components/catalog-loading';

const routeTree = rootRoute.addChildren([
  homeRoute,
  projectsRoute,
  projectDetailsRoute,
  featuresRoute,
  signInRoute,
]);

export function createAppRouter(
  history: RouterHistory = createBrowserHistory(),
) {
  return createRouter({
    routeTree,
    history,
    defaultPendingMs: 150,
    defaultPendingMinMs: 200,
    defaultPendingComponent: CatalogLoading,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
