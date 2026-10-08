# Atlas — Prometheus Engineering Platform

Discover what we've built. Reuse what works. Build faster with AI.

Atlas is Prometheus Co.'s internal engineering discovery and reuse application.
It helps developers find capabilities, compare concrete implementations, and
understand their assumptions, dependencies, and verification evidence before
adapting them. This independent repository was generated from
[aamuros/prometheus-web-template](https://github.com/aamuros/prometheus-web-template);
it has no runtime dependency on the original template.

## Milestone 1: read-only discovery

- **Discover (`/`)** searches implementation names, descriptions, capabilities,
  projects, repositories, technologies, dependencies, assumptions, and source paths.
  Search terms are case-insensitive; every term must match. Submit with Enter or
  the header search icon. Browse columns, quick capability filters, and the Filter
  selector update discovery results. The query and capability filter are stored in the URL for sharing and
  browser history.
- **Project Directory (`/projects`)** lists projects and implementation counts.
- **Project Details (`/projects/:projectId`)** shows implementations, business
  assumptions, dependencies, illustrative exact commits and source paths, and
  missing verification evidence. Search results link to the relevant implementation.
- **Feature Catalog (`/features`)** links capabilities to filtered discovery results.
- The shell includes keyboard navigation, a skip link, responsive layouts,
  reduced-motion support, and loading, empty, not-found, and safe error states.
- Discover still checks the real same-origin `GET /api/health` endpoint. A failed
  health request displays the safe route error view; other catalog pages only
  load the local sample dataset.

**All catalog records are fictional and unverified.** The three projects, four
features, and four implementations are examples, not evidence of company code.
Repository names, commits, and source paths are synthetic and do not link to real
repositories. No client information or secrets are included. Fieldnotes has no
implementations, and Reporting has no implementations, to demonstrate empty states.

Fixtures live in `src/features/discovery/sample-catalog.ts`; `loadCatalog` in
`src/features/discovery/catalog.ts` is their only application entry point. Replace
that loader with a validated API response and remove the fixture module when
persistence is introduced. The current asynchronous import exercises route loading
without fake network delays. There are no catalog write controls or endpoints.

The discovery layout follows `ui inspo/figma_exact_gallery (1).html`: a charcoal
workspace, centered search, four browse columns, and a responsive preview gallery.
Tile previews are local HTML/CSS illustrations labeled Sample UI, not captured
company interfaces. The app uses no temporary Figma asset URLs or external fonts.

## Stack and local setup

React 19, Vite, TanStack Router, strict TypeScript, Hono, Cloudflare Workers,
Tailwind CSS 4, shadcn/ui conventions, Vitest, Testing Library, ESLint, Prettier,
and GitHub Actions remain the foundation. Authentication adds `jose`, Neon HTTP,
Drizzle ORM, and Drizzle Kit; no separate authentication or session framework.

Use Node.js **24.19.0** from `.node-version` and **pnpm 12.10.1** from
`packageManager`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`. No credentials or
environment files are required for sample discovery. `/api/health` returns
`{"status":"ok"}`. Unknown API routes retain JSON 404 responses.
Vite provides a fixed fictional developer profile for `pnpm dev` only. Production
builds and `pnpm preview` require verified Access tokens and active Neon membership.
See [authentication setup](docs/authentication-setup.md) for environment integration,
migrations, administrator provisioning, and deployment verification.

| Command                         | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                      | React development server and local Workers runtime       |
| `pnpm typecheck`                | Check frontend, Worker, and tooling separately           |
| `pnpm lint`                     | ESLint, including frontend/Worker import boundaries      |
| `pnpm test`                     | Credential-free frontend, discovery, and API tests       |
| `pnpm format:check`             | Verify formatting                                        |
| `pnpm check`                    | Typecheck, lint, formatting, tests, and production build |
| `pnpm build`                    | Production client assets and Worker bundle               |
| `pnpm preview`                  | Build and preview locally in workerd                     |
| `pnpm audit --audit-level=high` | Review dependency vulnerabilities                        |
| `pnpm db:generate`              | Generate reviewed membership schema migrations           |
| `pnpm db:migrate`               | Apply migrations using ignored `.env.db.local`           |
| `pnpm deploy`                   | Run checks and deploy; requires explicit authorization   |

Direct dependencies are pinned. Commit lockfile changes with dependency updates
and retain the reviewed build-script allowlist. Follow the dependency update
process in [conventions](docs/conventions.md); do not remove overrides until their
upstream cause is resolved and audit/runtime checks pass.

## Organization and domain

```text
src/app/                         React entry point and router assembly
src/routes/                      Thin route composition and loaders
src/features/discovery/          Catalog contracts, fixtures, search, result UI
src/features/projects/           Directory and implementation evaluation
src/features/features/           Capability catalog
src/components/                  Safe shared error and not-found views
src/styles/                      Tailwind and semantic design tokens
shared/api.ts                    Runtime-independent API contracts
worker/                          Hono API and Cloudflare entry point
worker/features/auth/            Verified Access identity and membership/role checks
worker/db/                       Neon HTTP, Drizzle schema, membership queries
drizzle/                        Reviewed SQL migrations and Drizzle metadata
tools/local-profile.ts           Fictional Vite development profile; excluded from builds
public/_headers                  Static-asset security headers
tests/                           Discovery, frontend, and API regression tests
docs/                            Architecture, conventions, security, verification
.github/workflows/               CI and manually triggered deployment
```

A **Project** is an independent application. A **Feature** is a general capability.
An **Implementation** connects a feature to a project at an exact commit and
relevant paths. One project and one feature can each have many implementations.
A future **Reuse Record** will connect a source implementation to a destination
project, recording the adaptation outcome and lessons; it is not implemented yet.

The intended workflow is **Discover → Evaluate → Prepare → Adapt → Verify → Record**.
Milestone 1 covers discovery and initial evaluation only. Brief preparation,
adaptation execution, verification collection, and reuse recording are future work.

## Security and deployment safeguards

**Authentication and membership code are implemented; external services still
require configuration and verification.** Protect the entire Worker with Access,
configure its bindings and database secret, migrate an isolated Neon branch, and
provision an administrator using [authentication setup](docs/authentication-setup.md).
Before introducing real records, complete the [production security checklist](docs/security.md):
authentication, server-side authorization, untrusted-input validation, redacted
logging, backup/restore, and application-specific security validation.

- Browser code stays in `src/`; server code stays in `worker/`; `shared/` contains
  only runtime-independent contracts. Browser validation is not access control.
- `VITE_*` variables are public. Local Worker secrets belong in ignored `.dev.vars`;
  production secrets belong in Worker/GitHub environment secrets.
- API responses and static assets retain separate security headers. The production
  CSP restricts resources to the same origin and blocks inline scripts/styles.
  Do not weaken it for new components without reviewing the requirement.
- Logs retain only method, status, and duration; errors hide internal details.

The frontend and API build and deploy together as one Worker with Static Assets.
Deployment configuration retains the generated `web-application` Worker name;
choose an Atlas-specific name before an authorized deployment and follow
[verification](docs/verification.md) for runtime smoke checks. No remote settings,
GitHub configuration, or deployments are part of Milestone 1.

CI installs with `--frozen-lockfile` and checks the application. Production requires
this repository's own Cloudflare account, narrowly scoped credentials, GitHub
`production` environment and branch protection. Deployments are manually triggered;
do not push, merge, deploy, or change remote settings without explicit authorization.

## Limitations and next milestone

Search is local to the small sample dataset, with no ranking or pagination. There
is no catalog persistence, GitHub ingestion, evidence validation, Codex brief
export, adaptation automation, or reuse recording. Unit tests run in Node/jsdom;
they do not verify browser layout or the deployed Workers runtime.

Next: configure and verify the Access/Neon membership foundation, then replace
fixtures with a read-only Neon PostgreSQL/Drizzle
catalog API using runtime validation. Define provenance and evidence status before
loading actual company repository metadata. Add TanStack Query when server-state
requirements justify it; defer GitHub ingestion until access and provenance are
established. Do not install all planned integrations in advance.

See [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md),
[conventions](docs/conventions.md), and [security](docs/security.md).
