# Devora.js Architecture — v1

*Named Devora.js. This doc defines what v1 actually is and, just as importantly, what it is not.*

## 1. Vision (one sentence)

A lightweight, Vite-based, security-first web framework whose headline feature is **native multi-app support** — one project, multiple sites/panels (marketing site, main app, admin panel), sharing a core, deployable independently.

## 2. Core principles

1. **Security is a default, not a plugin.** No dynamic `eval`/`require` paths reachable from user input. CSP headers on by default. Server functions sandboxed by default.
2. **Explicit over implicit.** Caching, data flow, and server/client boundaries are visible in code, not hidden framework magic (this is the #1 thing we're fixing vs. Next.js).
3. **Multi-app is first-class.** A project can declare more than one app (site) sharing a core, not bolted on via a separate monorepo tool.
4. **Bring your own backend primitives.** We provide server functions, not a full ORM/auth system, in v1.
5. **Don't fight the ecosystem.** Client-only libraries (three.js, fabric.js, etc.) must "just work" without SSR-related crashes.

## 3. Project structure

```
my-project/
├── devora.config.ts           # declares all apps in this project
├── packages/
│   ├── core/                  # shared logic: types, utils, data client
│   └── backend/                # THE backend — one shared backend for all apps
│       ├── functions/          # server functions callable from any app
│       └── db/                 # DB client, schema (dev brings their own ORM)
├── apps/
│   ├── marketing/              # public site
│   │   ├── routes/
│   │   └── app.config.ts
│   ├── dashboard/               # main product app
│   │   ├── routes/
│   │   └── app.config.ts
│   └── admin/                  # admin panel
│       ├── routes/
│       └── app.config.ts
```

`devora.config.ts` example:

```ts
export default defineProject({
  apps: [
    // none: no login anywhere on this site — sessions disabled entirely, no
    // DEVORA_SESSION_SECRET* required for this app at all
    { name: "marketing", dir: "apps/marketing", domain: "example.com", auth: "none" },
    { name: "dashboard", dir: "apps/dashboard", domain: "app.example.com" },
    // isolated: this app opts out of shared auth, gets its own session context
    { name: "admin", dir: "apps/admin", domain: "admin.example.com", auth: "isolated" },
  ],
  shared: {
    core: "packages/core",
    auth: "shared", // project-level default — apps share one auth/session context
                     // unless a given app overrides it with auth: "isolated"
  },
});
```

Default is **one shared backend** (`packages/backend`) — all apps call into the same server functions and DB layer, which matches "single source of truth" for business logic. Any app can override this per-route by defining its own function inside `apps/<name>/routes/` instead of importing from `packages/backend` — useful for something genuinely app-specific (e.g. an admin-only bulk-import function nobody else needs). This is opt-in per function, not a project-wide switch — most projects will use shared backend for almost everything and only reach for app-local functions occasionally.

Default is **shared auth** across all apps in the project (the common case — one login, one user session, usable across marketing/dashboard/admin). Any individual app can opt out with `auth: "isolated"` if it needs its own separate session context (e.g. admin panel with a different identity provider). This is a per-app override, not a project-wide either/or choice.

Sessions themselves are **opt-in per app**, not a project-wide always-on cost — `auth: "none"` disables the session/cookie/CSRF carrier entirely for one app (e.g. a marketing site with no login route anywhere). This exists because "shared"/"isolated" both require a signed-cookie secret (`DEVORA_SESSION_SECRET`/`DEVORA_SESSION_SECRET_<APP>`, throwing in production if missing — see `.env.example` and `ROADMAP.md`), and an app with no login shouldn't have to configure a secret it will never use. `auth?: "shared" | "isolated" | "none"` is left `undefined` only to mean "inherit the project's `shared.auth` default" — an app that genuinely wants no sessions sets `auth: "none"` explicitly, so it's unambiguous from `devora.config.ts` alone which apps have sessions enabled. A `"none"` app's `ctx.setSession()`/`clearSession()`/`requireAuth()`/`verifyCsrf()` don't silently no-op if called — they throw a clear error naming the app and pointing at this config, and the CLI's build step scans that app's routes for such calls upfront so a build fails immediately rather than waiting for the request that would have thrown.

Each app can be built/deployed independently (`devora build --app=admin`) or all together (`devora build`).

## 4. Routing model

- File-based routing per app (`apps/*/routes/`).
- Route files export `loader` (server-side data), `component` (UI), and optional `action` (mutations) — explicit, not inferred from file naming conventions beyond the path itself.
- No nested layout caching magic — layouts are explicit React components that wrap children; no hidden revalidation windows.

## 5. Rendering pipeline

We stay on **React** (not Solid/Qwik) — this keeps the door open to React Native for mobile in v3, and most of the "React feels heavy" complaints are actually Next.js implementation choices (implicit caching, App Router complexity), which we already fix via explicit routing/data-loading (see §4, §6). Rather than switching UI libraries to fix hydration cost, we support multiple rendering strategies per route, explicitly declared:

```ts
export const renderMode = "ssr";        // default: server-rendered per request
// or "ssg"                              // pre-rendered at build time
// or "csr"                              // client-only
// or "streaming"                        // chunked SSR, doesn't block on slow data
// or "isr"                              // static + scheduled/on-demand revalidation
```

- **Islands / partial hydration**: components can opt into island rendering — `island(() => import("./ThreeScene"))` — so only that component hydrates on the client; the rest of the page stays static HTML. This is the actual fix for React's hydration-cost problem, achieved without leaving the React ecosystem.
- No custom RSC-style server/client serialization protocol in v1 (large, security-sensitive undertaking — see §11).
- Revalidation triggers for ISR are explicit (`revalidate: { seconds: 3600 }` or a manual `revalidatePath()` call) — no hidden multi-layer cache behavior.

## 6. Server functions (the "backend" piece of v1)

**Default: shared backend, called from any app.**

```ts
// packages/backend/functions/settings.ts
export const updateSettings = serverFn(async (input: SettingsInput, ctx) => {
  ctx.requireAuth(); // throws if not authenticated
  // dev brings their own DB client here
  return db.settings.update(input);
});
```

```ts
// apps/dashboard/routes/settings.ts
import { updateSettings } from "@devora/backend/settings";
// call it directly — same function, same DB, same logic every app uses
```

**Per-app override (only when something is genuinely app-specific):**

```ts
// apps/admin/routes/bulk-import.ts
export const bulkImportUsers = serverFn(async (input, ctx) => {
  ctx.requireAuth();
  // this one lives only in admin — no other app needs it
});
```

- Typed, callable directly from client code (no manual `fetch` + API route boilerplate).
- Sandboxed: no dynamic code execution paths from `input`.
- No built-in ORM or auth provider in v1 — devs plug in what they want (Prisma, Drizzle, Lucia, Clerk, etc.). This is deliberate scope control, not a limitation we forgot.

## 7. Security defaults (v1 scope)

- CSP, HSTS, X-Frame-Options set by default, overridable per app.
- No arbitrary `eval`/`Function()` constructor usage anywhere in framework internals.
- No telemetry without explicit opt-in, clearly disclosed.
- Dependency count kept minimal; every new dependency added to `packages/core` requires a one-line justification in `DEPENDENCIES.md`.
- **Not in v1**: formal third-party security audit, signed release provenance (planned for v2, once the API surface stabilizes — auditing a moving target wastes the audit).

## 8. SEO primitives

- Per-route `meta()` export for title/description/OG tags.
- Auto-generated `sitemap.xml` from the route tree.
- SSR by default means content is crawlable without special-casing.

## 9. Client-only / animation library support

- `clientOnly(() => import("./ThreeScene"))` wrapper — guarantees no server-side execution, no `window is not defined` crashes.
- No special integration needed for three.js/fabric.js/etc. — they're just npm packages once properly wrapped.

## 10. CLI (v1 commands)

```
devora dev                  # runs all apps in dev mode
devora dev --app=admin      # runs one app
devora build                # builds all apps
devora build --app=admin    # builds one app
devora new <app-name>       # scaffolds a new app inside the project (asks whether it needs auth/sessions per app; --auth shared|isolated|none)
devora add <app-name>       # same as `new` — friendlier alias, same action
devora remove <app-name>    # deletes apps/<name> and its devora.config.ts entry (alias: rm)
devora list                 # lists every app registered in devora.config.ts (alias: ls)
devora generate:proxy --target=nginx   # auto-generates reverse proxy config from devora.config.ts domains
devora generate:proxy --target=caddy   # same, for Caddy
devora start --app=admin    # serves a production build (adapter-node)
devora deploy --adapter=vercel --app=admin   # build + deploy to a linked Vercel project (`vercel link` first)
devora deploy --adapter=netlify --prod       # build + deploy every linked app to Netlify, production
```

## 11. Explicit v1 boundaries — what we are NOT building yet

This section exists to stop scope creep. If it's listed here, it does not go into v1 no matter how small it seems mid-build.

- ❌ Real-time/live-query sync engine (the "modern Meteor" piece) — v2, only if v1 users ask for it.
- ❌ Built-in ORM, auth provider, or file storage — bring your own in v1.
- ❌ Mobile (React Native) or desktop (Tauri) targets — v3+, only if v1/v2 prove out.
- ❌ Formal third-party security audit / signed provenance — v2, once API is stable.
- ❌ "Best in market" security or SEO claims — these are earned over time, not asserted at launch.
- ❌ Custom RSC-style server/client serialization protocol — too large and too security-sensitive for v1.

## 12. Tech stack

- **Bundler/dev server**: Vite
- **Language**: TypeScript, strict mode
- **Runtime**: Node.js (LTS)
- **Monorepo tooling**: pnpm workspaces + Turborepo
- **Rendering**: React (SSR + streaming + standard hydration)

## 13. Deployment & platform adapters (v1 scope)

Without this section, the framework only runs as a raw Node server — which means every DevOps team has to hand-build reverse proxy config, subdomain routing (for multi-app), and CI from scratch. That's a real gap, not a nice-to-have, so it's in v1.

**Strategy: target open build specs, don't invent our own.** Vercel and Netlify each publish a documented, file-system-based spec that any framework can output to and get first-class platform support (Functions, Routing, Caching, ISR, etc.) — this is exactly how Astro, SvelteKit, and others integrate. Next.js is the cautionary counter-example: it uses its own private, undocumented build format instead of these open specs, which is a large part of why other platforms have historically struggled to support it well. We deliberately avoid repeating that mistake.

**v1 adapters (build these, don't skip):**
- `@devora/adapter-vercel` — outputs to Vercel's Build Output API (`.vercel/output` spec). Gets us Functions, Edge routing, and caching for free once implemented correctly.
- `@devora/adapter-netlify` — outputs to Netlify's Frameworks API / build plugin format.
- `@devora/adapter-node` — self-hosted fallback: a plain Node server output, paired with `devora generate:proxy` (see §10) to auto-generate a working reverse-proxy config from the domains already declared in `devora.config.ts` — no hand-editing required. This is what teams self-hosting or on AWS/DigitalOcean/etc. use.

**Multi-app specific concern:** each adapter needs to understand that a project can emit *multiple* deployable units (one per app in `devora.config.ts`), not just one. This means the adapter output must map each app to its own Vercel project / Netlify site / Node process — this is genuinely new work beyond what existing adapters do, since none of them were built with "one repo, many independently-deployed apps" in mind. Budget real time here; it's the least precedented part of the whole framework.

**Explicitly out of v1:** AWS/Cloudflare/Docker-specific adapters (community can contribute these once the adapter interface is stable), custom hosting infrastructure of our own (we are not becoming a Vercel competitor — see earlier scoping discussion).

## 14. Success criteria for v1

v1 is "done" when: a solo/small team can build a real project with a marketing site + app + admin panel sharing auth and a core, deploy each independently, get good SEO out of the box, and not hit a single `window is not defined` crash from a client library — all without needing to read framework internals to understand why something cached or didn't.
