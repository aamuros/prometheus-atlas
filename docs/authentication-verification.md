# Authentication foundation implementation report

## Status and scope

Code is complete for environment integration. Credential-free tests and the
production build pass. No GitHub OAuth app, Cloudflare policy, Worker deployment,
Neon project, migration application, or production membership was created or
modified. Live authentication, database integration, Workers runtime/browser
smoke, backups, and production authorization remain unverified. Existing
uncommitted discovery work was preserved; catalog fixtures remain fictional.

## Files introduced

- `worker/env.ts`: typed bindings and verified request context.
- `worker/db/client.ts`, `schema.ts`, `members.ts`: Neon HTTP, membership schema,
  parameterized issuer/subject lookup, and administrator listing.
- `worker/features/auth/identity.ts`, `middleware.ts`: JWT verification, active
  membership, and reusable role enforcement.
- `drizzle.config.ts`, `drizzle/0000_aberrant_war_machine.sql`,
  `drizzle/meta/0000_snapshot.json`, `drizzle/meta/_journal.json`: schema and
  reproducible migration artifacts.
- `src/features/auth/profile.ts`, `access-message.tsx`: profile state and safe
  sign-in, denied, and unavailable views.
- `tools/local-profile.ts`: Vite-only fixed fictional developer profile.
- `.env.db.example`: separate operator migration configuration.
- `tests/auth.test.ts`, `database.test.ts`, `profile.test.ts`: JWT, roles,
  membership persistence boundary, and profile regression tests.
- `docs/authentication-setup.md` and this report: setup and actual verification.

## Existing files modified for this task

- `worker/app.ts`, `worker/index.ts`: typed application factory, `/api/me`, and
  admin-only membership listing, preserving existing defaults.
- `shared/api.ts`, `src/lib/api.ts`, `src/routes/root.tsx`: public profile contract,
  validated same-origin fetch, authenticated shell, refresh, and Access logout.
- `tests/frontend.test.tsx`: profile fixtures, user display, denial, expiration,
  and preserved discovery regressions.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`: pinned dependencies,
  migration commands, and scoped security override.
- `vite.config.ts`, `tsconfig.tools.json`: development-only middleware and tooling
  typecheck/native-compatible TypeScript imports.
- `.dev.vars.example`, `.gitignore`: server bindings and ignored migration secrets.
- `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/conventions.md`,
  `docs/security.md`: current milestone, integration guidance, and remaining
  production safeguards.

## Dependencies and schema

Added runtime packages: `jose@6.2.12`, `@neondatabase/serverless@1.2.0`, and
`drizzle-orm@0.45.3`. Added development tooling: `drizzle-kit@0.31.11`. The existing
build-script allowlist is unchanged. A scoped
`@esbuild-kit/core-utils>esbuild: 0.25.12` override resolves the moderate
GHSA-67mh-4wv8-2f99 advisory introduced by Drizzle Kit's deprecated TS loader.
Migration generation verifies loader compatibility; retain the existing sharp
override as well.

The migration creates `atlas_role` (`admin`, `developer`) and `atlas_members`:
UUID primary key, issuer, subject, email, role, active status, and created/updated
timestamps. Issuer + subject is unique. Defaults are developer and inactive.
`updated_at` is set explicitly by the documented operator update statements.
There are no catalog tables, passwords, session tables, or automatic provisioning.

## Authentication and authorization

Worker-level Access authenticates GitHub users and protects static assets on all
associated hostnames and previews. Hono validates the signed application JWT
against Cloudflare JWKS and configured issuer/audience. It checks expiration,
not-before, issuance, and minimal user claims, then resolves active membership by
verified issuer/subject. Roles come only from Neon. `/api/me` exposes the member
UUID, verified email, optional signed name, and role. Admins can read
`/api/admin/members`; developers cannot. No API exposes tokens or raw provider
errors. Health remains a minimal liveness endpoint behind Access in deployment.

## Commands and actual results

- Package metadata/official Cloudflare, Drizzle, and Neon documentation were
  reviewed before installing the four pinned packages.
- `pnpm install --frozen-lockfile --reporter=append-only`: passed after an approved
  retry; 305 packages reused, no downloads, lockfile unchanged. The first
  sandboxed attempt hit DNS restrictions and was not a successful install.
- `pnpm db:generate`: generated the committed initial migration. Subsequent
  generation reported no schema changes. No migration was applied to a database.
- `pnpm typecheck`: passed strict browser, Worker, and tooling checks.
- `pnpm exec vitest run tests/auth.test.ts tests/database.test.ts tests/profile.test.ts tests/frontend.test.tsx --reporter=dot`:
  passed 82 tests in four files.
- `WRANGLER_SEND_METRICS=false WRANGLER_LOG_PATH=.wrangler/logs pnpm check`:
  passed typecheck, zero-warning ESLint, formatting, all **100 tests in six files**,
  and production Worker/client builds. Earlier build logging outside the sandbox
  and native-config import warnings were resolved without suppressing checks.
- `pnpm audit --audit-level=high`: passed, no known vulnerabilities after the
  reviewed override. The first audit detected the moderate loader advisory.
- Build boundary inspection: database/JWKS code and server binding identifiers
  absent from browser JavaScript; fictional local profile absent from both
  production bundles; `/api` and `/api/*` still run the Worker first.
- `git diff --check`: passed.

Initial unit failures came from test fixture types/HTTP serialization and were
corrected; checks and compiler settings were not weakened. Neon tests mock HTTP
responses while executing the real driver and Drizzle queries. They do not prove
PostgreSQL constraints, migration execution, or live connectivity.

## Remaining operator actions and security verification

Follow [authentication setup](authentication-setup.md) for exact steps:

1. Register GitHub OAuth with the team-domain Access callback and configure only
   the GitHub IdP. Use an explicit approved-developer Allow policy.
2. Protect the Atlas Worker with **All traffic**, including production/previews
   and every associated hostname. Set `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`,
   and the runtime `DATABASE_URL` secret separately in each environment.
3. Establish separate Neon development/production data and least-privilege
   read-only runtime credentials. Review and apply migrations using separate
   direct operator credentials after authorization.
4. Have the selected initial administrator authenticate through Access. Verify
   their user UUID/email in the trusted Zero Trust user record, then explicitly
   insert that issuer/subject as an active admin in the correct Neon branch.
   Administrator-controlled SQL is the provisioning/role-management interface;
   there is no membership write API or first-login promotion.
5. Verify GitHub login, every asset/hostname denial, expiration, Access logout,
   unknown/disabled membership, developer/admin permissions, database privileges,
   runtime security headers, and backup restoration. Access logout revokes Access
   sessions across apps, not GitHub itself; offline JWT checks cannot immediately
   detect revoked tokens. Edge protection remains mandatory.

No new private company data should be loaded until these checks and the
[production security checklist](security.md) have operational evidence. Future
mutation APIs also need server input validation and origin/CSRF controls.
