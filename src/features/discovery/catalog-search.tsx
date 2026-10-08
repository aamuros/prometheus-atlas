import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Catalog } from './catalog';
import { loadCatalog, searchImplementations } from './catalog';
import './catalog-search.css';

const sections = [
  {
    id: 'explore',
    name: 'Explore',
    path: 'M2 15l5.5-5.5 3.5 3.2L18 5M12.5 5H18v5.5',
  },
  {
    id: 'capabilities',
    name: 'Capabilities',
    path: 'M3 8h14v9H3zM5 5h10M7 2h6',
  },
  { id: 'projects', name: 'Projects', path: 'M3 3h14v14H3zM3 7h14M8 7v10' },
  { id: 'technology', name: 'Technology', path: 'm7 5-5 5 5 5m6-10 5 5-5 5' },
];

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

export function CatalogSearch() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const trigger = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function openWithKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
    }
    document.addEventListener('keydown', openWithKeyboard);
    return () => document.removeEventListener('keydown', openWithKeyboard);
  }, []);

  function closeSearch() {
    setIsOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="header-search"
        aria-label="Search implementations"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <SearchIcon />
        <span
          className={
            search.q ? 'header-search-query' : 'header-search-placeholder'
          }
        >
          {search.q || 'Search Atlas...'}
        </span>
        <kbd>⌘ K</kbd>
      </button>
      {isOpen &&
        createPortal(
          <SearchDialog
            initialQuery={search.q ?? ''}
            onClose={closeSearch}
            onSearch={(q, feature = search.feature ?? '') => {
              void navigate({ to: '/', search: { q: q.trim(), feature } });
              closeSearch();
            }}
          />,
          document.body,
        )}
    </>
  );
}

function SearchDialog({
  initialQuery,
  onClose,
  onSearch,
}: {
  initialQuery: string;
  onClose: () => void;
  onSearch: (query: string, feature?: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const resultsPane = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activeSection, setActiveSection] = useState('explore');
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const modal = dialog.current;
    modal?.showModal();
    input.current?.focus();
    input.current?.select();
    let cancelled = false;
    void loadCatalog().then(
      (loadedCatalog) => {
        if (!cancelled) setCatalog(loadedCatalog);
      },
      () => {
        if (!cancelled) setLoadFailed(true);
      },
    );
    return () => {
      cancelled = true;
      modal?.close();
    };
  }, []);

  function closeDialog() {
    dialog.current?.close();
    onClose();
  }

  function chooseSearch(nextQuery: string, feature?: string) {
    dialog.current?.close();
    onSearch(nextQuery, feature);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    chooseSearch(query);
  }

  function browseSection(id: string) {
    setActiveSection(id);
    setQuery('');
    // Wait for the browse sections to replace the live results.
    requestAnimationFrame(() => {
      resultsPane.current
        ?.querySelector(`#search-${id}`)
        ?.scrollIntoView({ block: 'start' });
    });
  }

  const implementations = catalog ? searchImplementations(catalog, query) : [];
  const technologies = [
    ...new Set(catalog?.projects.flatMap((project) => project.stack) ?? []),
  ];

  return (
    <dialog
      ref={dialog}
      className={`catalog-search-dialog${narrow ? ' search-narrow' : ''}`}
      aria-label="Explore Atlas"
      aria-describedby="search-sample-notice"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          closeDialog();
      }}
    >
      <form
        role="search"
        className="search-dialog-header"
        onSubmit={submitSearch}
      >
        <input
          ref={input}
          type="search"
          aria-label="Search implementations"
          placeholder="Projects, capabilities or technology..."
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="search-dialog-actions">
          <button
            type="button"
            aria-label="Narrow view"
            aria-pressed={narrow}
            onClick={() => setNarrow(true)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="5" y="2" width="10" height="16" rx="1" />
              <path d="M8 15h4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Wide view"
            aria-pressed={!narrow}
            onClick={() => setNarrow(false)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="2" y="3" width="16" height="11" rx="1" />
              <path d="M7 17h6M10 14v3" />
            </svg>
          </button>
          <button type="button" aria-label="Close search" onClick={closeDialog}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </div>
      </form>
      <div className="search-suggestions" aria-label="Suggested searches">
        {catalog?.features.slice(0, 3).map((feature) => (
          <button
            type="button"
            key={feature.id}
            onClick={() => chooseSearch('', feature.id)}
          >
            <SearchIcon />
            {feature.name}
          </button>
        ))}
        {catalog?.projects.map((project) => (
          <button
            type="button"
            key={project.id}
            onClick={() => chooseSearch(project.name, '')}
          >
            <span className="search-project-initial" aria-hidden="true">
              {project.name.slice(0, 1)}
            </span>
            {project.name}
          </button>
        ))}
      </div>
      <div className="search-dialog-body">
        <nav className="search-dialog-sidebar" aria-label="Search categories">
          {sections.map((section) => (
            <button
              type="button"
              key={section.id}
              aria-current={activeSection === section.id ? 'true' : undefined}
              onClick={() => browseSection(section.id)}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d={section.path} />
              </svg>
              {section.name}
            </button>
          ))}
        </nav>
        <div
          ref={resultsPane}
          className="search-dialog-results"
          aria-label="Search results"
          tabIndex={0}
        >
          {loadFailed ? (
            <p role="alert" className="search-dialog-message">
              Could not load the catalog. Close search and try again.
            </p>
          ) : !catalog ? (
            <p role="status" className="search-dialog-message">
              Loading catalog…
            </p>
          ) : query.trim() ? (
            <section>
              <h2>
                Implementations{' '}
                <span aria-live="polite">· {implementations.length}</span>
              </h2>
              {implementations.length ? (
                implementations.map((implementation) => (
                  <Link
                    key={implementation.id}
                    className="search-implementation"
                    to="/projects/$projectId"
                    params={{ projectId: implementation.projectId }}
                    hash={implementation.id}
                    onClick={closeDialog}
                  >
                    <strong>{implementation.name}</strong>
                    <span>
                      {
                        catalog.projects.find(
                          (project) => project.id === implementation.projectId,
                        )?.name
                      }{' '}
                      · Fictional · Unverified
                    </span>
                  </Link>
                ))
              ) : (
                <p className="search-dialog-message">
                  No implementations found for “{query.trim()}”. Try another
                  term.
                </p>
              )}
              <button
                type="button"
                className="search-tag"
                onClick={() => chooseSearch(query)}
              >
                View all results ↗
              </button>
            </section>
          ) : (
            <>
              <section
                id="search-explore"
                className="search-project-grid"
                aria-label="Sample projects"
              >
                {catalog.projects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    aria-label={`Search ${project.name}`}
                    title={project.name}
                    onClick={() => chooseSearch(project.name, '')}
                  >
                    {project.name.slice(0, 1)}
                  </button>
                ))}
              </section>
              <section id="search-capabilities">
                <h2>Capabilities</h2>
                <div className="search-capability-grid">
                  {catalog.features.map((feature) => {
                    const count = catalog.implementations.filter(
                      (item) => item.featureId === feature.id,
                    ).length;
                    return (
                      <button
                        type="button"
                        key={feature.id}
                        onClick={() => chooseSearch('', feature.id)}
                      >
                        <strong>{feature.name}</strong>
                        <span>
                          {count}{' '}
                          {count === 1 ? 'implementation' : 'implementations'}
                        </span>
                        <svg
                          viewBox="0 0 120 48"
                          fill="none"
                          aria-hidden="true"
                        >
                          <rect x="1" y="1" width="118" height="46" rx="4" />
                          <path d="M1 12h118M28 12v35M38 23h64M38 32h48M38 41h56" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              </section>
              <section id="search-projects">
                <h2>Projects</h2>
                <div className="search-tag-list">
                  {catalog.projects.map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      className="search-tag"
                      onClick={() => chooseSearch(project.name, '')}
                    >
                      {project.name}
                    </button>
                  ))}
                </div>
              </section>
              <section id="search-technology">
                <h2>Technology</h2>
                <div className="search-tag-list">
                  {technologies.map((technology) => (
                    <button
                      type="button"
                      key={technology}
                      className="search-tag"
                      onClick={() => chooseSearch(technology, '')}
                    >
                      {technology}
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
      <p id="search-sample-notice" className="search-dialog-footer">
        Sample catalog · Fictional, unverified implementations
      </p>
    </dialog>
  );
}
