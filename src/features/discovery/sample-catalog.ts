import type { Catalog } from './catalog';

// Entirely fictional. Commits and paths illustrate the shape of future records;
// they do not resolve to company repositories or provide verification evidence.
export const sampleCatalog: Catalog = {
  projects: [
    {
      id: 'northstar',
      name: 'Northstar',
      description:
        'A fictional operations workspace for managing customer accounts and team access.',
      repository: 'sample/northstar',
      stack: ['React', 'TypeScript', 'Hono'],
    },
    {
      id: 'relay',
      name: 'Relay',
      description:
        'A fictional service portal with organization access and an activity history.',
      repository: 'sample/relay',
      stack: ['React', 'TypeScript', 'PostgreSQL'],
    },
    {
      id: 'fieldnotes',
      name: 'Fieldnotes',
      description:
        'A fictional reporting workspace. No implementations have been cataloged yet.',
      repository: 'sample/fieldnotes',
      stack: ['React', 'TypeScript'],
    },
  ],
  features: [
    {
      id: 'authentication',
      name: 'Authentication',
      description: 'Sign-in, sessions, and access to organization workspaces.',
    },
    {
      id: 'customer-management',
      name: 'Customer management',
      description:
        'Customer records, account ownership, and lifecycle tracking.',
    },
    {
      id: 'audit-history',
      name: 'Audit history',
      description: 'A traceable history of changes and who made them.',
    },
    {
      id: 'reporting',
      name: 'Reporting',
      description: 'Summaries and exports for operational decisions.',
    },
  ],
  implementations: [
    {
      id: 'northstar-access',
      projectId: 'northstar',
      featureId: 'authentication',
      name: 'Team sign-in and sessions',
      summary:
        'Email sign-in with server-managed sessions for a single internal team.',
      commit: 'a17c904e2b5d6f8091a3c7e4b2d5f6089a1c3e7b',
      paths: ['worker/features/auth/', 'src/features/sign-in/'],
      assumptions: [
        'Each user belongs to one team.',
        'Access is granted by an administrator; public registration is excluded.',
      ],
      dependencies: ['Session storage', 'Email delivery'],
      evidence:
        'No verification evidence supplied. Session expiry and access checks would need review.',
    },
    {
      id: 'relay-access',
      projectId: 'relay',
      featureId: 'authentication',
      name: 'Organization membership access',
      summary:
        'Organization-scoped access with member and administrator roles.',
      commit: 'b28d015f3c6e7a9012b4d8f5c3e6a7091b2d4f8c',
      paths: ['worker/features/memberships/', 'src/features/organizations/'],
      assumptions: [
        'Users may belong to multiple organizations.',
        'Every request must be authorized against the selected organization.',
      ],
      dependencies: ['PostgreSQL', 'Identity provider'],
      evidence:
        'No verification evidence supplied. Cross-organization isolation would need testing.',
    },
    {
      id: 'northstar-customers',
      projectId: 'northstar',
      featureId: 'customer-management',
      name: 'Customer account directory',
      summary:
        'Searchable customer records with an account owner and lifecycle status.',
      commit: 'c39e126a4d7f8b0123c5e9a6d4f7b8012c3e5a9d',
      paths: ['src/features/customers/', 'worker/features/customers/'],
      assumptions: [
        'One account owner per customer.',
        'Deletion is replaced by archival to preserve history.',
      ],
      dependencies: ['PostgreSQL', 'Team membership'],
      evidence:
        'No verification evidence supplied. Search behavior and archival permissions would need testing.',
    },
    {
      id: 'relay-audit',
      projectId: 'relay',
      featureId: 'audit-history',
      name: 'Organization activity log',
      summary: 'A read-only timeline of account and membership changes.',
      commit: 'd40f237b5e8a9c1234d6f0b7e5a8c9123d4f6b0e',
      paths: ['worker/features/activity/', 'src/features/activity/'],
      assumptions: [
        'Events are scoped to an organization.',
        'Retention policy must be defined before storing real events.',
      ],
      dependencies: ['PostgreSQL', 'Organization membership'],
      evidence:
        'No verification evidence supplied. Event completeness and sensitive-data redaction would need review.',
    },
  ],
};
