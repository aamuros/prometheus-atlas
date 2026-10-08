# Authentication and database setup

Atlas remains one React/Vite + Hono application on a Worker with Static Assets.
Cloudflare Access authenticates GitHub users before serving **any** application
response, including HTML, JavaScript, CSS, previews, and `/api/health`. Hono also
verifies the `Cf-Access-Jwt-Assertion` signature, issuer, audience, RS256 algorithm,
expiration, not-before, issued-at, and required user claims with `jose`. It never
trusts identity or role headers. Static Assets' internal router does not forward
`ctx.access`; Atlas does not use it.

`GET /api/me` requires an active database member. It returns the Atlas member UUID,
verified email, optional signed display name, and stored role. Unknown/disabled
members receive 403; missing/invalid authentication or Access configuration
receives 401. Database failures return a safe 500. `GET /api/admin/members` is an
admin-only, read-only membership listing. All responses are uncached. Existing
health, security headers, JSON 404s, and redacted request logging remain intact.

`/api/health` deliberately returns only `{"status":"ok"}` without an application
membership or JWT check: it is a liveness endpoint, not an authentication or
database readiness probe. The deployed Access policy must protect it with the
rest of the Worker. Do not add a public hostname or Access bypass for monitoring.

## Cloudflare Access and GitHub (manual)

1. Enable Cloudflare Zero Trust in Atlas's account and note its team domain.
2. In GitHub **Settings → Developer settings → OAuth Apps → New OAuth app**,
   register an app owned by the appropriate company/operator account:
   - Homepage: `https://<team>.cloudflareaccess.com`
   - Callback: `https://<team>.cloudflareaccess.com/cdn-cgi/access/callback`
   - Generate the client secret and store it in the team's credential vault.
3. In **Zero Trust → Integrations → Identity providers**, add **GitHub**. Put the
   GitHub client ID in **App ID** and the client secret in **Client secret**. Finish
   authorization and use **Test**. The credentials belong in Access, never Atlas.
4. Choose an Atlas-specific Worker name before the first authorized deployment;
   the repository retains the template's `web-application` name. In **Workers &
   Pages → selected Worker → Access**, protect this Worker and choose **All
   traffic**, covering production **and** previews. The Access destination type
   is `worker` with that Worker's ID, rather than `preview_worker`. This protects
   all associated routes, Custom Domains, the `workers.dev` hostname, and previews.
   If the initial dashboard dialog offers only broad account/domain policies,
   replace those in Zero Trust with the restricted policy below before use.
5. Edit the resulting self-hosted Access application in **Zero Trust → Access
   controls → Applications**. Select only the GitHub login method. Attach an
   **Allow** policy with an explicit list of the approved developers' verified
   email addresses. Require the GitHub identity provider in the policy as well.
   Do not allow Everyone, all GitHub users, an entire email domain, or an entire
   organization. Remove broad initial policies and any Bypass/Service Auth rules.
   Review the session duration (for example, eight hours). Restrict who may change
   this policy and the OAuth app.
6. From the application's **Additional settings**, copy **Application Audience
   (AUD) Tag**. Atlas expects one exact 64-character lowercase hexadecimal tag.
   Its issuer is the exact HTTPS team origin, without a trailing slash. Atlas uses
   descriptive binding names corresponding to the official example's
   `TEAM_DOMAIN` and `POLICY_AUD`:

   ```jsonc
   "vars": {
     "CF_ACCESS_TEAM_DOMAIN": "https://<team>.cloudflareaccess.com",
     "CF_ACCESS_AUD": "<application-audience-tag>"
   }
   ```

   Put actual nonsecret values in Wrangler configuration for the correct
   environment; no account values are committed here. Reapply them for named
   environments: Wrangler variables and secrets are not inherited. Avoid
   overlapping hostname-specific Access apps: those take precedence and can emit
   a different audience. Separate development/production Access applications and
   database branches are preferable. Configure each separately.

7. Inventory and test every associated hostname, custom route, `workers.dev` URL,
   version preview URL, and any separately deployed preview Worker. Each distinct
   Worker needs its own All traffic protection. Include direct requests for `/`,
   `/projects`, built JS/CSS, `/api/me`, `/api/admin/members`, and `/api/health`.
   An incognito visitor and an unlisted GitHub user must be challenged/blocked
   **before assets are served**. Listed users without membership must receive
   application 403; active developers must receive admin-operation 403.

If Worker-level protection is unavailable, use whole-hostname self-hosted Access
applications for every entry point and preview hostname, without a `/api/*` path
restriction. Disable unprotected entry points until protection is verified. Never
assume the application's API checks protect static files.

## Neon and migrations (manual)

1. Create/select a Neon PostgreSQL project and database. Use distinct production
   and development branches (and a separate preview branch/Worker where needed).
   Development branches should contain synthetic memberships, not copied private
   production data. Obtain access through the Atlas administrator and the team
   vault; developers do not need production credentials.
2. In Neon **Connect**, obtain TLS connection strings for the intended branch.
   `DATABASE_URL` is the pooled (`-pooler`) runtime connection; migrations use the
   direct connection as `DATABASE_URL_UNPOOLED`. Both must use `sslmode=require`.
   The Worker uses Drizzle + Neon **HTTP**, with no TCP/WebSocket pool or Node
   compatibility flag. Drizzle Kit uses its bundled WebSocket support for its
   operator-run migrations; this tooling is not in the Worker.
3. Keep runtime and migration privileges separate. The runtime role only needs
   `CONNECT`, schema `USAGE`, and `SELECT` on `atlas_members`; do not use the Neon
   owner credential in the Worker. After migrating, an owner can grant these to
   an operator-created runtime role (replace the role/database identifiers):

   ```sql
   GRANT CONNECT ON DATABASE atlas TO atlas_runtime;
   GRANT USAGE ON SCHEMA public TO atlas_runtime;
   GRANT SELECT ON public.atlas_members TO atlas_runtime;
   ```

   Review default/PUBLIC privileges and verify the runtime role cannot insert,
   update, delete, create tables, or read the migration journal. Create passwords
   securely in Neon, not in committed SQL. Limit migration credentials to Atlas
   administrators/operators.

4. Copy `.dev.vars.example` to ignored `.dev.vars` for local Worker bindings.
   Copy `.env.db.example` to ignored `.env.db.local` for operator migration access.
   Set restrictive file permissions and never prefix database secrets with
   `VITE_`. CI's normal checks require neither file nor external credentials.
5. Generate, review, and apply migrations explicitly:

   ```sh
   pnpm db:generate
   # Inspect the SQL and snapshot in drizzle/; generation needs no database.
   pnpm db:migrate
   ```

   `db:migrate` loads `.env.db.local`; environment-injected credentials take
   precedence. It refuses pooled/non-TLS URLs. Test migrations on a development
   branch first, review the target branch, and obtain explicit authorization
   before applying to production. Commit the SQL, snapshot, and journal together.
   No request handler runs migrations. Do not use schema push as a substitute.

6. With deployment authorization, set the runtime secret interactively:

   ```sh
   pnpm exec wrangler secret put DATABASE_URL
   ```

   Add `--env <name>` for a named environment. Never put a connection string on a
   command line, in Wrangler `vars`, or in GitHub logs. The generated Worker
   configuration must receive Access bindings as well; the existing Deploy
   workflow does not provision Access, migrate databases, or bootstrap members.

7. Provision members as below, then verify `/api/me` and the admin listing through
   Access. Test disabled membership and runtime database privilege restrictions.
   Establish a Neon recovery window, recovery objectives, restricted backup
   storage, and periodic direct-connection `pg_dump` exports where required.
   Test restoration to a separate branch, including memberships and migrations.

## Initial administrator and membership management

There is no public signup, first-login promotion, or membership write API. An
Atlas administrator with separately controlled operator access provisions and
changes memberships through Neon's SQL editor. This is the initial management
interface for a team of 3–5; developers receive no database write credentials.

1. Allowlist the selected administrator in Access and have them sign in with
   GitHub. An application 403 is expected before membership exists.
2. In Cloudflare Zero Trust's **My Team → Users**, find the authenticated user's
   verified email and user UUID. This UUID is the application token's `sub`.
   Confirm it against the Access user record, not browser input, an arbitrary
   header, or an unsigned decoded token. Use the exact configured team issuer.
3. In the intended Neon branch, run a reviewed, explicit insert in the SQL editor,
   replacing these placeholders with the trusted values:

   ```sql
   INSERT INTO atlas_members (access_issuer, access_subject, email, role, active)
   VALUES ('https://<team>.cloudflareaccess.com', '<verified-access-user-uuid>',
           '<verified-email>', 'admin', true)
   RETURNING id, email, role, active;
   ```

   There is deliberately no upsert: a duplicate issuer/subject fails instead of
   silently promoting or reactivating an existing account. Do not infer identity
   from a matching email. Repeat with explicit `'developer'` for approved members.

4. Confirm the selected administrator gets an admin profile and can read
   `/api/admin/members`. Test a developer separately. For an authorized change,
   review the member UUID and set values explicitly:

   ```sql
   UPDATE atlas_members
   SET role = 'developer', updated_at = now()
   WHERE id = '<reviewed-atlas-member-uuid>';

   UPDATE atlas_members
   SET active = false, updated_at = now()
   WHERE id = '<reviewed-atlas-member-uuid>';
   ```

   Keep at least one active administrator and record operator changes in a
   restricted change log. `updated_at` is maintained explicitly in this workflow.
   Each protected request reloads membership; disabling takes effect immediately.
   Remove departing users from the Access allowlist and revoke their Access
   sessions too. Access subjects change if users are removed/re-added to Zero
   Trust or move accounts; re-provision only after administrator verification.

## Local development, sessions, and verification

To test the authentication design locally:

```sh
pnpm dev
# Open http://127.0.0.1:5173/sign-in (or the port printed by Vite).
```

`/sign-in` displays the Atlas authentication layout without the catalog shell.
The supplied signup reference retains its 50/50 desktop columns, 426px content
width, 48px spacing, and diagonal gallery geometry. CSS placeholders replace its
image assets and the gallery hides below 780px. Authentication controls use
GitHub/Access instead of signup inputs. `/sign-in` loads the real `/api/me`
contract: an active member sees their email, role, and **Continue to Atlas**;
a missing/expired session sees **Continue with GitHub**; failed requests show
the actual denied or unavailable state. These links perform full-page navigation
to Atlas, where Access owns authentication. Locally, the development-only profile
produces a fictional member and continuation opens the sample workspace; it does
not test GitHub authentication.

Click **Sign out** in the workspace to exercise the complete local routing flow:
the app calls `/cdn-cgi/access/logout`, clears the fictional profile, and uses
client navigation to show `/sign-in`. **Continue with GitHub** then navigates to
`/api/auth/sign-in`, which restores the local fixture and returns to the workspace.
In deployment, Access handles that full-page login request before the Worker; the
Worker only redirects to a validated same-origin destination after the challenge.
Missing/expired sessions and denied membership redirect to `/sign-in`, preserving
the requested page and anchor for return. External/API/auth destinations are
rejected to prevent open redirects and loops. Failed logout shows a retry message
and does not claim success.

Run the credential-free authentication/UI checks with:

```sh
pnpm exec vitest run tests/auth.test.ts tests/database.test.ts tests/profile.test.ts tests/frontend.test.tsx tests/auth-navigation.test.ts tests/local-profile.test.ts
pnpm typecheck
```

For real authentication, first complete the Cloudflare/Neon setup above on a
separate development Worker/database, then open its HTTPS URL in an incognito
window. Verify an allowlisted active developer succeeds, an unlisted GitHub user
is blocked by Access, and an unknown/disabled member receives application 403.
Confirm developers cannot open `/api/admin/members`, and admins can. Sign out and
wait for Access revocation; test an expired session and the GitHub continuation
again. Test direct static asset URLs on every production/preview hostname too.

The initial login challenge is Cloudflare Access's hosted page, which appears
before React loads. Atlas's `/sign-in` design styles application/session states;
it does not change the hosted Access page. Configure Access's login-page branding
separately if that first challenge should match Atlas.

`pnpm dev` serves a fixed fictional developer profile from **Vite server
middleware only**, allowing the existing sample catalog to run without OAuth or
Neon. A local HttpOnly cookie switches between signed-in/signed-out fixtures;
the production Worker never reads or accepts it. This mechanism accepts no
identity headers and queries no database. It is
excluded from build and production preview, is not imported by the Worker, and
cannot be enabled by any deployed binding. Local development is for synthetic
data only. Worker requests still require signed JWTs and active membership.
`pnpm preview` therefore needs real development Access assertions/bindings to
test authenticated Worker API calls; it does not simulate Access's edge policy.

Credential-free tests generate local RSA keys and controlled JWKS/Neon HTTP
responses, exercising the real verifier, Drizzle query generation/decoding,
denials, roles, profile errors, and existing discovery behavior. Hono's factory
accepts test dependencies; the deployed entry point always uses real dependencies.
No production bypass flag or arbitrary identity header exists.

```sh
pnpm check
pnpm audit --audit-level=high
```

The profile client sends `X-Requested-With: XMLHttpRequest` so Access can return
401 for expired AJAX sessions. It handles redirects without fetching the login
HTML as a profile. Navigation, window focus, and a 60-second refresh recheck the
profile. A full-page sign-in link lets Access own reauthentication. UI controls
are informational; Hono enforces roles on every protected operation.

Sign-out sends a same-origin request to `/cdn-cgi/access/logout`, then navigates
within the loaded SPA to `/sign-in` and refreshes the profile. Provider redirects
are not followed, and no unsupported logout redirect parameter is used. A full
reload of `/sign-in` after logout still encounters the mandatory edge Access
challenge before React can load; the application does not bypass edge protection.
Cloudflare currently revokes Access sessions across applications and clears that
hostname's cookie; token revocation can take 20–30 seconds. It does **not** log out
of GitHub, which may sign the same person back in. Offline JWT signature checking
alone cannot detect revocation before expiration; the edge policy is required.

Run the existing runtime/browser smoke procedure in `verification.md` after
environment integration, including a real GitHub login, expiration, sign-out,
all hostname/asset denial tests, database least-privilege checks, and disabled
membership. Database integration/migration tests require an isolated development
branch and are intentionally separate from credential-free CI. No live database
or account configuration is claimed by unit tests or the production build.
Future mutation endpoints must validate bodies and enforce origin/CSRF checks
in addition to identity, membership, and roles. The current API is read-only.

## Official references reviewed

- [Workers Access and Static Assets limitations](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Application token identity and subject lifetime](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [GitHub identity provider](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/github/)
- [Access sessions, logout, and AJAX](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/)
- [Drizzle Neon integration](https://orm.drizzle.team/docs/connect-neon)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)

The installed stable releases are pinned; the Drizzle site also illustrates
release-candidate APIs, which Atlas does not adopt. Current Node 24, Web Crypto,
Neon HTTP, strict TypeScript, and the existing Vite/Worker boundary are preserved.
