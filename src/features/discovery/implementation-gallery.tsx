import { Link } from '@tanstack/react-router';
import type { Catalog, Implementation } from './catalog';

export function ImplementationGallery({
  catalog,
  implementations,
}: {
  catalog: Catalog;
  implementations: Implementation[];
}) {
  return (
    <ul className="implementation-gallery">
      {implementations.map((implementation) => {
        const project = catalog.projects.find(
          (item) => item.id === implementation.projectId,
        );
        const feature = catalog.features.find(
          (item) => item.id === implementation.featureId,
        );
        const headingId = `${implementation.id}-gallery-heading`;
        return (
          <li key={implementation.id}>
            <article aria-labelledby={headingId}>
              <Link
                to="/projects/$projectId"
                params={{ projectId: implementation.projectId }}
                hash={implementation.id}
                className="gallery-link"
                aria-labelledby={headingId}
              >
                <div className="app-tile">
                  <span className="tile-badge">Fictional · Unverified</span>
                </div>
                <div className="app-meta">
                  <span className="app-logo" aria-hidden="true">
                    {project?.name.slice(0, 1) ?? 'A'}
                  </span>
                  <div className="app-copy">
                    <h3 id={headingId}>{implementation.name}</h3>
                    <p title={implementation.summary}>
                      {project?.name} · {feature?.name}
                    </p>
                  </div>
                </div>
              </Link>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
