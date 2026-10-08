import { createRoute } from '@tanstack/react-router';
import { loadCatalog } from '../features/discovery/catalog';
import { ProjectsPage } from '../features/projects/projects-page';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  loader: loadCatalog,
  component: ProjectsRoute,
});

export function ProjectsRoute() {
  return <ProjectsPage catalog={Route.useLoaderData()} />;
}
