import { Link } from '@tanstack/react-router';
import type { Catalog } from '../discovery/catalog';
import { EmptyState } from '../discovery/catalog-ui';

export function ProjectsPage({ catalog }: { catalog: Catalog }) {
  return (
    <section
      className="gallery-content"
      aria-labelledby="projects-page-heading"
    >
      <h1 id="projects-page-heading" className="sr-only">
        Project Directory
      </h1>
      <div className="gallery-toolbar">
        <div className="browse-scope" aria-label="Browse scope">
          <Link to="/" search={{ q: '', feature: '' }}>
            Implementations
          </Link>
          <span>Projects</span>
        </div>
        <p className="toolbar-description">Source applications</p>
      </div>
      <div className="gallery-results-heading">
        <h2>All projects</h2>
        <p>
          {catalog.projects.length}{' '}
          {catalog.projects.length === 1 ? 'project' : 'projects'}
        </p>
      </div>
      {catalog.projects.length ? (
        <ul className="implementation-gallery">
          {catalog.projects.map((project) => {
            const count = catalog.implementations.filter(
              (implementation) => implementation.projectId === project.id,
            ).length;
            const headingId = `${project.id}-project-heading`;
            return (
              <li key={project.id}>
                <article aria-labelledby={headingId}>
                  <Link
                    className="gallery-link"
                    to="/projects/$projectId"
                    params={{ projectId: project.id }}
                    aria-labelledby={headingId}
                  >
                    <div className="app-tile">
                      <span className="tile-badge">Fictional project</span>
                    </div>
                    <div className="app-meta">
                      <span className="app-logo" aria-hidden="true">
                        {project.name.slice(0, 1)}
                      </span>
                      <div className="app-copy">
                        <h3 id={headingId}>{project.name}</h3>
                        <p>
                          {count}{' '}
                          {count === 1 ? 'implementation' : 'implementations'} ·{' '}
                          {project.stack.join(' / ')}
                        </p>
                      </div>
                    </div>
                    <p className="catalog-description">{project.description}</p>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No projects yet">
          <p>Projects will appear here when they are cataloged.</p>
        </EmptyState>
      )}
    </section>
  );
}
