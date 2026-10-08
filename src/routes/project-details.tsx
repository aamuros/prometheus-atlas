import { createRoute, notFound } from '@tanstack/react-router';
import { loadCatalog } from '../features/discovery/catalog';
import {
  ProjectNotFound,
  ProjectPage,
} from '../features/projects/project-page';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects/$projectId',
  loader: async ({ params }) => {
    const catalog = await loadCatalog();
    const project = catalog.projects.find(
      (item) => item.id === params.projectId,
    );
    if (!project) throw notFound();
    return { catalog, project };
  },
  component: ProjectDetailsRoute,
  notFoundComponent: ProjectNotFound,
});

export function ProjectDetailsRoute() {
  return <ProjectPage {...Route.useLoaderData()} />;
}
