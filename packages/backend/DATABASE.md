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
There's no working HMR API *inside the reloaded module itself*, so that idea doesn't apply — the
`globalThis` singleton above is still the fix, and still the recommended default.

## v2 update: a real plugin-side dispose hook, evaluated and confirmed to work

architecture-v2.md §3.5 asked whether a real `onDispose`-style lifecycle hook, built into
`packages/core`, could make this safe by default rather than safe-only-if-the-guide-is-followed.
The module-side answer above is still "no" — but the *server* side of Vite (as opposed to the
reloaded module) does have a working hook: `handleHotUpdate`, a Vite plugin hook that fires with
the real file path Vite is about to invalidate, *before* the next `ssrLoadModule` call
re-executes it. `registerDisposable()`/`runAndClearDisposable()`
(`packages/core/src/disposeRegistry.ts`) plus a small Vite plugin
(`packages/cli/src/server/moduleDisposePlugin.ts`, wired into every dev server in `dev.ts`) expose
this as a real, generic primitive — not DB-specific, usable for any resource that needs cleanup
before a reload.

**Confirmed working against a real dev server, the same way the `globalThis` fix above was
confirmed** — not assumed from reading Vite's plugin API docs: booted a real `createServer()`
instance with this plugin, loaded a fake module via `ssrLoadModule` that calls
`registerDisposable(import.meta.url, () => console.log("disposed"))`, edited the file on disk to
force a real reload, and confirmed via log output that `handleHotUpdate` fired with the correct
file path and the registered callback ran — *before* the next `ssrLoadModule` call re-executed the
file and created a new "connection". (First attempt used `hmr: false` in the test server config
and saw nothing fire — a real reminder that this hook is part of Vite's HMR pipeline specifically,
not a general file-watch callback; the real `dev.ts` never disables HMR, so this isn't a caveat for
actual usage, just a note on how the test was debugged.)

**A real gap in the first version of this fix, closed since**: `moduleDisposePlugin.ts` originally
only disposed `ctx.file` — the literal file Vite reported as saved. The crash this exists to
prevent happens whenever the module *holding the connection* re-executes, which Vite triggers not
only when that exact file changes but whenever anything it imports does too (`ctx.modules` carries
the whole invalidated import chain; `ctx.file` is only the one file actually saved). Editing a
shared `env.ts` that `db/index.ts` imports re-executes `db/index.ts` the identical way editing
`db/index.ts` directly does, and the original version silently missed that case — reproducing the
exact crash this feature exists to prevent, one HMR hop removed from the file it was tested
against. Fixed by disposing every module in `ctx.modules`, not just `ctx.file`.

**Usage** — register a disposer for your connection right where you create it:

```ts
import { registerDisposable } from "@devorajs/core";

function getDb() {
  if (!globalThis.__db) {
    globalThis.__db = new Database("app.db");
    registerDisposable(import.meta.url, () => {
      globalThis.__db?.close();
      globalThis.__db = undefined;
    });
  }
  return globalThis.__db;
}
```

**Honest scope, not oversold**: this closes the mechanism gap — there's now a real place to run
cleanup exactly when a reload is about to happen — but it does not itself know how to safely close
every possible driver's connection; that's still your own code, same as the `globalThis` pattern
above. It's also dev-only by construction (production never reloads modules, so there's nothing to
dispose there) — it does not change anything about the "not tested against Vercel/Netlify
serverless functions" caveat below. Treat it as an additional tool alongside the `globalThis`
singleton pattern, not a replacement for it — the singleton is still what prevents *creating* a
redundant connection in the meantime; the dispose hook is what lets you *close* the old one
cleanly instead of leaving it to a native finalizer.

## What this doesn't cover

- Not tested against Vercel/Netlify's serverless functions specifically — a fresh function
  invocation is a fresh process, so the reload-crash this fixes (an in-process module reload)
  doesn't apply the same way there; a serverless-friendly driver's own connection-pooling advice
  still applies on top of this.
- Not a recommendation of `better-sqlite3` over any other driver — it's what this fix was
  verified against, since it's what originally surfaced the crash.
