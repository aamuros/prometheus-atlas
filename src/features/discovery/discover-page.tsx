import { Link } from '@tanstack/react-router';
import type { Catalog } from './catalog';
import { searchImplementations } from './catalog';
import { EmptyState } from './catalog-ui';
import { ImplementationGallery } from './implementation-gallery';

export type DiscoverySearch = { q: string; feature: string };

export function DiscoverPage({
  catalog,
  search,
  onSearch,
}: {
  catalog: Catalog;
  search: DiscoverySearch;
  onSearch: (search: DiscoverySearch) => void;
}) {
  const results = searchImplementations(catalog, search.q, search.feature);
  return (
    <div className="discover-workspace">
      <h1 className="sr-only">Discover</h1>
      <section className="gallery-content" aria-labelledby="results-heading">
        <div className="gallery-toolbar">
          <div className="sort-left">
            <div className="browse-scope" aria-label="Browse scope">
              <span>Implementations</span>
              <Link to="/projects">Projects</Link>
            </div>
            <span className="toolbar-divider" aria-hidden="true" />
            <div
              className="capability-tabs"
              aria-label="Quick capability filters"
            >
              <button
                type="button"
                className={!search.feature ? 'active' : undefined}
                aria-pressed={!search.feature}
                onClick={() => onSearch({ ...search, feature: '' })}
              >
                All
              </button>
              {catalog.features
                .filter((feature) => feature.id !== 'reporting')
                .map((feature) => (
                  <button
                    key={feature.id}
                    type="button"
                    className={
                      search.feature === feature.id ? 'active' : undefined
                    }
                    aria-pressed={search.feature === feature.id}
                    onClick={() => onSearch({ ...search, feature: feature.id })}
                  >
                    {feature.name === 'Customer management'
                      ? 'Customers'
                      : feature.name}
                  </button>
                ))}
            </div>
          </div>
          <label className="capability-filter">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M4 7h16M4 17h16" />
              <circle cx="9" cy="7" r="2" fill="var(--background)" />
              <circle cx="15" cy="17" r="2" fill="var(--background)" />
            </svg>
            <select
              aria-label="Capability"
              value={search.feature}
              onChange={(event) =>
                onSearch({ ...search, feature: event.target.value })
              }
            >
              <option value="">Filter</option>
              {search.feature &&
                !catalog.features.some(
                  (feature) => feature.id === search.feature,
                ) && <option value={search.feature}>Unknown capability</option>}
              {catalog.features.map((feature) => (
                <option key={feature.id} value={feature.id}>
                  {feature.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="gallery-results-heading">
          <h2 id="results-heading">
            {search.q || search.feature
              ? 'Search results'
              : 'All implementations'}
          </h2>
          <p role="status" aria-live="polite">
            {results.length}{' '}
            {results.length === 1 ? 'implementation' : 'implementations'}
          </p>
        </div>
        {search.q && <p className="search-context">Results for “{search.q}”</p>}
        {results.length ? (
          <ImplementationGallery catalog={catalog} implementations={results} />
        ) : (
          <EmptyState title="No implementations found">
            <p>Try a broader term or another capability.</p>
            <Link to="/" search={{ q: '', feature: '' }} className="text-link">
              Clear search and filters
            </Link>
          </EmptyState>
        )}
      </section>
    </div>
  );
}
