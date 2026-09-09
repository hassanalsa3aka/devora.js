# Wiring in a real database

`db/index.ts` ships as a throw-on-use stub by design — no built-in ORM in v1 (see
architecture-v1.md §6/§11). This is the pattern to follow when you wire in a real one, and the
fix for the one real integration issue this framework's own SSR dev server causes.

## The problem

`devora dev` loads each route module fresh via Vite's `ssrLoadModule` (`ssrMiddleware.ts`) —
Vite invalidates and re-executes a module (and anything importing it) when the file, or its
dependency graph, changes. If your DB client is created directly at module scope:

```ts
// Don't do this — the pattern that crashes
const db = new Database("app.db");
export { db };
```

...then every reload creates a **new** native connection and abandons the old one with no
reference anywhere. For a driver with native bindings (`better-sqlite3`, and likely others in
the same category), the abandoned handle's finalizer can run later during garbage collection,
against a Node environment that may already be torn down from that module's perspective — a
real native assertion crash (`Assertion failed: (env) != nullptr`), confirmed during this
project's own development (see `ROADMAP.md` #6).

## The fix, verified against a real Vite SSR reload

Cache the connection on `globalThis` instead of module scope, and only create it once:

```ts
import Database from "better-sqlite3";

declare global {
  var __db: InstanceType<typeof Database> | undefined;
}

function getDb() {
  if (!globalThis.__db) {
    globalThis.__db = new Database("app.db");
  }
  return globalThis.__db;
}

export const db = {
  settings: {
    async update(input: { key: string; value: string }) {
      getDb()
        .prepare(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        )
        .run(input.key, input.value);
      return input;
    },
  },
};
```

`globalThis` isn't part of Vite's module graph, so it survives a module reload untouched — the
existing connection is reused instead of a new one being created and the old one abandoned. This
is the same pattern Prisma's own official guidance recommends for the identical class of
dev-server-reload problem in Next.js/Vite.

**Confirmed by actually reproducing this**, not assumed: wired this exact code into
`packages/backend/db/index.ts`, ran a real login → CSRF-protected `POST /settings` → confirmed
via direct sqlite inspection that the write landed; then edited the file (and its importing route
file) while the dev server was running to force a real Vite SSR module reload
(`[vite] page reload ...` in the dev log confirms the module body re-executed), and made another
request immediately after. No crash, server stayed up, and no second connection was opened — the
`globalThis` guard did exactly what it's meant to. Reverted afterward; this file documents the
pattern rather than shipping it as the default, to keep `db/index.ts` genuinely bring-your-own.

**One thing this correction fixes in this project's own earlier notes**: `ROADMAP.md` #6
previously floated `import.meta.hot.dispose()` as a possible fix to investigate. Tested directly
— `import.meta.hot` is `undefined` inside a module loaded via `vite.ssrLoadModule` in this
project's setup (confirmed by logging `typeof import.meta.hot` from inside the reloaded module).
There's no working HMR API on the server side here, so that idea doesn't apply — the `globalThis`
singleton above is the fix, not a supplement to an HMR hook.

## What this doesn't cover

- Not tested against Vercel/Netlify's serverless functions specifically — a fresh function
  invocation is a fresh process, so the reload-crash this fixes (an in-process module reload)
  doesn't apply the same way there; a serverless-friendly driver's own connection-pooling advice
  still applies on top of this.
- Not a recommendation of `better-sqlite3` over any other driver — it's what this fix was
  verified against, since it's what originally surfaced the crash.
