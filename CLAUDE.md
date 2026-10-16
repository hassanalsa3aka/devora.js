# Project brief for Claude Code

Read `docs/design/architecture-v1.md` first (full spec — vision, security defaults, rendering model, CLI,
deployment adapters, explicit v1 boundaries). This file is the fast-start summary + current state.

## What this is

**Devora.js** — a Vite-based, security-first web framework whose headline feature is **native
multi-app support**: one project can declare multiple apps (marketing site, product app, admin
panel) that share a core and a backend, but build/deploy independently. Not another Next.js — the
explicit design reaction to Next.js's implicit caching and undocumented build format (see doc §2,
§5, §13).

## Locked decisions (do not re-litigate without asking)

- **One shared backend by default.** `packages/backend` is the single source of truth all apps call
  into. Per-function override exists (see `apps/admin/routes/bulk-import.tsx`) but is the exception.
- **Shared auth by default**, per-app `auth: "isolated"` override (admin panel uses this). Auth
  itself is opt-in per app: `auth: "none"` (marketing site uses this) disables sessions entirely
  for that app — no session secret required, `ctx.setSession()`/etc. throw a clear error if called.
- **React**, not Solid/Qwik — keeps the door open to native mobile later (a planned goal, not started).
- **No built-in ORM/auth/file storage in v1** — bring your own. Don't add one.
- **No RSC-style server/client serialization protocol in v1** — too large, too security-sensitive.
- **Security is a default, not opt-in**: no `eval`/dynamic `Function()` anywhere in framework
  internals, ever — including in tooling you might be tempted to add (e.g. a plugin loader).
- Any new dependency added to `packages/core` needs a one-line entry in
  `packages/core/DEPENDENCIES.md` justifying it.

## Current state

**ROADMAP.md is the single source for what is done, partial, open and planned**, with the version
timeline, the 14 build items, live deployment history and the findings table. Read it instead of
this file for status. In one paragraph: the framework is real and verified end to end in dev and
production (SSR, SSG, CSR, ISR, streaming, islands, sessions, CSRF, security headers, SEO, catch-all
routes, three adapters, the CLI under npm/Yarn/pnpm); the release is 0.3.5; Vercel and Netlify were
deployed live with releases before 0.3.2, and 0.3.5 is not yet verified on a live deployment by
this project.

Where things are:
- `ROADMAP.md` is status; `CHANGELOG.md` is what changed per release; `docs/history/BUILD-LOG.md`
  is the dated account of how each piece was built; `docs/history/VERIFICATION.md` is what is
  tested and what is not; `docs/README.md` indexes everything.
- The full text of the old "Current repo state / Not yet real / Suggested next task" sections is
  kept in `docs/history/CLAUDE-repo-state-archive.md`.
- Keep documents current by the rule in `CONTRIBUTING.md` ("Tracking changes"): CHANGELOG line,
  ROADMAP status, findings table, in the same commit.

Do not start work that is not on ROADMAP.md "Now" or "Next" without confirming first.

## Working style

- Keep the "explicit over implicit" principle (§2.2) — no hidden caching, no convention-over-
  configuration magic beyond file-based routing itself.
- Ask before deviating from a locked decision above; otherwise proceed and just flag tradeoffs.
