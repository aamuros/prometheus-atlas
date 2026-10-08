export type Project = {
  id: string;
  name: string;
  description: string;
  repository: string;
  stack: string[];
};

export type Feature = {
  id: string;
  name: string;
  description: string;
};

export type Implementation = {
  id: string;
  projectId: string;
  featureId: string;
  name: string;
  summary: string;
  commit: string;
  paths: string[];
  assumptions: string[];
  dependencies: string[];
  evidence: string;
};

export type Catalog = {
  projects: Project[];
  features: Feature[];
  implementations: Implementation[];
};

// The only fixture entry point. Replace this loader when the catalog API exists.
export async function loadCatalog(): Promise<Catalog> {
  const { sampleCatalog } = await import('./sample-catalog');
  return sampleCatalog;
}

export function searchImplementations(
  catalog: Catalog,
  query: string,
  featureId = '',
): Implementation[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return catalog.implementations.filter((implementation) => {
    if (featureId && implementation.featureId !== featureId) return false;
    const project = catalog.projects.find(
      (item) => item.id === implementation.projectId,
    );
    const feature = catalog.features.find(
      (item) => item.id === implementation.featureId,
    );
    const text = [
      implementation.name,
      implementation.summary,
      ...implementation.paths,
      ...implementation.dependencies,
      ...implementation.assumptions,
      project?.name,
      project?.repository,
      ...(project?.stack ?? []),
      feature?.name,
    ]
      .join(' ')
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
