import { Link } from '@tanstack/react-router';
import type { Catalog } from '../discovery/catalog';
import { EmptyState } from '../discovery/catalog-ui';

export function FeaturesPage({ catalog }: { catalog: Catalog }) {
  return (
    <section
      className="gallery-content"
      aria-labelledby="features-page-heading"
    >
      <h1 id="features-page-heading" className="sr-only">
        Feature Catalog
      </h1>
      <div className="gallery-toolbar">
        <div className="browse-scope" aria-label="Browse scope">
          <span>Capabilities</span>
          <Link to="/" search={{ q: '', feature: '' }}>
            Implementations
          </Link>
        </div>
        <p className="toolbar-description">Reusable capabilities</p>
      </div>
      <div className="gallery-results-heading">
        <h2>All capabilities</h2>
        <p>
          {catalog.features.length}{' '}
          {catalog.features.length === 1 ? 'capability' : 'capabilities'}
        </p>
      </div>
      {catalog.features.length ? (
        <ul className="implementation-gallery">
          {catalog.features.map((feature) => {
            const count = catalog.implementations.filter(
              (implementation) => implementation.featureId === feature.id,
            ).length;
            const headingId = `${feature.id}-feature-heading`;
            return (
              <li key={feature.id}>
                <article aria-labelledby={headingId}>
                  <Link
                    className="gallery-link"
                    to="/"
                    search={{ q: '', feature: feature.id }}
                    aria-labelledby={headingId}
                  >
                    <div className="app-tile">
                      <span className="tile-badge">
                        {count
                          ? 'Fictional · Unverified'
                          : 'No implementations yet'}
                      </span>
                    </div>
                    <div className="app-meta">
                      <span className="app-logo" aria-hidden="true">
                        {feature.name.slice(0, 1)}
                      </span>
                      <div className="app-copy">
                        <h3 id={headingId}>{feature.name}</h3>
                        <p>
                          {count}{' '}
                          {count === 1 ? 'implementation' : 'implementations'}
                        </p>
                      </div>
                    </div>
                    <p className="catalog-description">{feature.description}</p>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="No features yet">
          <p>Capabilities will appear here when they are cataloged.</p>
        </EmptyState>
      )}
    </section>
  );
}
