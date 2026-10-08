import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { Catalog, Implementation } from './catalog';

export function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}

export function ImplementationList({
  catalog,
  implementations,
  detailed = false,
}: {
  catalog: Catalog;
  implementations: Implementation[];
  detailed?: boolean;
}) {
  return (
    <ul className="implementation-list">
      {implementations.map((implementation) => {
        const project = catalog.projects.find(
          (item) => item.id === implementation.projectId,
        );
        const feature = catalog.features.find(
          (item) => item.id === implementation.featureId,
        );
        return (
          <li key={implementation.id} id={implementation.id}>
            <article aria-labelledby={`${implementation.id}-heading`}>
              <div className="result-meta">
                <span>{feature?.name}</span>
                <span className="sample-label">Fictional · Unverified</span>
              </div>
              <div className="result-heading">
                <h3 id={`${implementation.id}-heading`}>
                  {detailed ? (
                    implementation.name
                  ) : (
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: implementation.projectId }}
                      hash={implementation.id}
                    >
                      {implementation.name}
                      <span aria-hidden="true"> ↗</span>
                    </Link>
                  )}
                </h3>
                {!detailed && (
                  <Link
                    className="subtle-link"
                    to="/projects/$projectId"
                    params={{ projectId: implementation.projectId }}
                  >
                    {project?.name}
                  </Link>
                )}
              </div>
              <p className="result-summary">{implementation.summary}</p>
              {detailed ? (
                <div className="implementation-detail">
                  <div>
                    <h4>Business assumptions</h4>
                    <ul className="detail-list">
                      {implementation.assumptions.map((assumption) => (
                        <li key={assumption}>{assumption}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Dependencies</h4>
                    <ul className="detail-list">
                      {implementation.dependencies.map((dependency) => (
                        <li key={dependency}>{dependency}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="source-reference">
                    <h4>Illustrative source reference</h4>
                    <p className="text-muted-foreground">
                      Synthetic commit and paths; these do not link to real
                      code.
                    </p>
                    <p>
                      <span className="reference-label">Commit</span>
                      <code>{implementation.commit}</code>
                    </p>
                    <ul>
                      {implementation.paths.map((path) => (
                        <li key={path}>
                          <code>{path}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Verification evidence</h4>
                    <p className="text-muted-foreground">
                      {implementation.evidence}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="result-stack">
                  {project?.stack.join(' / ')}
                  <span aria-hidden="true"> · </span>
                  {implementation.dependencies.join(' / ')}
                </p>
              )}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
