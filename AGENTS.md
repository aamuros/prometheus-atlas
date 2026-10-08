# Atlas coding agent instructions

Atlas is Prometheus Co.'s independent engineering discovery and reuse platform,
generated from `aamuros/prometheus-web-template`. Change this repository only;
do not modify the original template.

## Product scope

- Keep the experience search-first: Discover → Evaluate → Prepare → Adapt →
  Verify → Record. Prioritize finding implementations over administrative dashboards.
- Projects are applications; features are general capabilities; implementations
  tie a feature to a project, exact commit, and source paths. Future reuse records
  connect a source implementation to a destination project and its adaptation result.
- Milestone 1 is read-only discovery. Fictional fixtures live only in
  `src/features/discovery/sample-catalog.ts`, behind `loadCatalog`. Keep them easy
  to remove, clearly labeled, and separate from claims of verified company code.
- The authentication foundation adds Cloudflare Access verification and Neon
  PostgreSQL/Drizzle membership only. Keep catalog persistence, real client
  information, autonomous agents, and GitHub integration out of this phase.
  Do not add password authentication or public signup. Follow
  [authentication setup](docs/authentication-setup.md) for operator provisioning.

Read [architecture](docs/architecture.md) and [conventions](docs/conventions.md)
before changing application behavior. Read only task-relevant files and make
small, focused changes; avoid unrelated refactoring.

## Architecture and organization

- Keep React 19, Vite, TanStack Router, Hono, strict TypeScript, and Cloudflare
  Workers. The frontend and API deploy together as one independent application.
- `src/` is browser code, `worker/` is server code, and `shared/` contains only
  runtime-independent contracts. Never import Worker code into the browser.
- Organize business features in `src/features/<feature>/` and
  `worker/features/<feature>/`. Routes compose features; extract shared code
  only when reuse or testable behavior warrants it.
- Use conventional functions and React components, type-only imports, semantic
  HTML, accessible controls, and existing UI tokens. Keep strict checks enabled.
- Do not add a monorepo, plugin/installer system, scaffolding CLI, microservices,
  or speculative layers. Atlas remains one independent application.

## Dependencies and security

- Use the Node and pnpm versions in `.node-version` and `packageManager`. Pin
  new packages, commit the lockfile, and inspect required dependency build
  scripts before allowing them. Add dependencies only for a current need.
- Follow the update process in `docs/conventions.md`; retain overrides until
  their upstream cause is fixed and the audit and runtime checks pass.
- Validate untrusted input and enforce authorization on the server. Browser
  validation and TypeScript types do not provide access control.
- `VITE_*` values are public. Keep secrets in ignored `.dev.vars` locally and
  Worker/GitHub environment secrets in production. Never expose secrets,
  private request data, or internal exception details in responses or logs.
- Before handling private business information, implement the application
  safeguards in [the production checklist](docs/security.md).

## Verification and workflow

- Add meaningful tests for changed behavior, failures, permissions, and
  regressions. Keep base tests independent of credentials and external services.
- Start with the smallest relevant check: `pnpm typecheck`, `pnpm lint`, or
  `pnpm test -- <test-file>`. Before merging, run `pnpm check` and
  `pnpm audit --audit-level=high`; CI uses `pnpm install --frozen-lockfile`.
- Use the runtime/browser smoke procedure in `docs/verification.md` when
  deployment configuration or Workers integrations change. Do not add E2E
  tooling, start servers, or use browser tools for unrelated changes.
- Do not weaken checks to pass them. Report failures and unverified external
  actions accurately. Do not push, merge, deploy, or change remote settings
  without explicit authorization.
