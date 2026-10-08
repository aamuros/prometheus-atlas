import { describe, expect, it } from 'vitest';
import { searchImplementations } from '../src/features/discovery/catalog';
import { sampleCatalog } from '../src/features/discovery/sample-catalog';

describe('implementation discovery', () => {
  it('returns all implementations for a blank query', () => {
    expect(searchImplementations(sampleCatalog, '  ')).toHaveLength(4);
  });

  it.each([
    ['AUTHENTICATION', ['northstar-access', 'relay-access']],
    [' northstar   customer ', ['northstar-customers']],
    ['worker/features/memberships/', ['relay-access']],
    ['session storage', ['northstar-access']],
    ['archival', ['northstar-customers']],
    ['relay postgresql', ['relay-access', 'relay-audit']],
  ])('finds implementations by context for %s', (query, ids) => {
    expect(
      searchImplementations(sampleCatalog, query).map((item) => item.id),
    ).toEqual(ids);
  });

  it('requires all terms and combines them with the capability filter', () => {
    expect(
      searchImplementations(
        sampleCatalog,
        'organization',
        'authentication',
      ).map((item) => item.id),
    ).toEqual(['relay-access']);
    expect(searchImplementations(sampleCatalog, 'customer sessions')).toEqual(
      [],
    );
  });

  it('does not return unrelated results for empty or unknown capabilities', () => {
    expect(searchImplementations(sampleCatalog, '', 'reporting')).toEqual([]);
    expect(searchImplementations(sampleCatalog, '', 'unknown')).toEqual([]);
    expect(
      searchImplementations(
        { projects: [], features: [], implementations: [] },
        '',
      ),
    ).toEqual([]);
  });

  it('keeps sample source references and relationships consistent', () => {
    const projectIds = new Set(
      sampleCatalog.projects.map((project) => project.id),
    );
    const featureIds = new Set(
      sampleCatalog.features.map((feature) => feature.id),
    );
    const implementationIds = sampleCatalog.implementations.map(
      (implementation) => implementation.id,
    );
    expect(new Set(implementationIds).size).toBe(implementationIds.length);
    for (const implementation of sampleCatalog.implementations) {
      expect(projectIds.has(implementation.projectId)).toBe(true);
      expect(featureIds.has(implementation.featureId)).toBe(true);
      expect(implementation.commit).toMatch(/^[a-f0-9]{40}$/);
      expect(implementation.paths.length).toBeGreaterThan(0);
      expect(implementation.evidence).toMatch(
        /^No verification evidence supplied\./,
      );
    }
  });
});
