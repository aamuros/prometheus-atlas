import { Link } from '@tanstack/react-router';
import type { Catalog, Project } from '../discovery/catalog';
import {
  EmptyState,
  ImplementationList,
  PageHeading,
} from '../discovery/catalog-ui';

export function ProjectPage({
  catalog,
  project,
}: {
  catalog: Catalog;
  project: Project;
}) {
  const implementations = catalog.implementations.filter(
    (implementation) => implementation.projectId === project.id,
  );
  return (
    <>
      <Link to="/projects" className="text-link back-link">
        ← Project Directory
      </Link>
      <PageHeading
        eyebrow="Fictional sample project"
        title={project.name}
        description={project.description}
      />
      <dl className="project-context">
        <div>
          <dt>Illustrative repository</dt>
          <dd>
            <code>{project.repository}</code>
          </dd>
        </div>
        <div>
          <dt>Technology</dt>
          <dd>{project.stack.join(' / ')}</dd>
        </div>
      </dl>
      <section aria-labelledby="project-implementations-heading">
        <div className="section-heading">
          <h2 id="project-implementations-heading">Implementations</h2>
          <p>{implementations.length} cataloged</p>
        </div>
        {implementations.length ? (
          <ImplementationList
            catalog={catalog}
            implementations={implementations}
            detailed
          />
        ) : (
          <EmptyState title="No implementations cataloged">
            <p>This sample project has no implementations to evaluate yet.</p>
            <Link to="/" search={{ q: '', feature: '' }} className="text-link">
              Explore other implementations
            </Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}

export function ProjectNotFound() {
  return (
    <EmptyState title="Project not found">
      <p>This project is not in the catalog.</p>
      <Link to="/projects" className="text-link">
        Return to Project Directory
      </Link>
    </EmptyState>
  );
}
