# Wiring in Drizzle

A guide, not a built-in integration — same bring-your-own boundary as `PRISMA.md`/`DATABASE.md`.
CLAUDE.md's own history records that a real Drizzle + `better-sqlite3` client was wired in here
once already, verified end-to-end (real writes, real upsert, `requireAuth()` still gating
correctly), then reverted specifically to keep `db/index.ts` a stub — see `ROADMAP.md` #6 for that
account. This guide reconstructs that pattern for a reader wiring it in for real, now updated with
the real `registerDisposable()` hook that didn't exist yet at the time.

## Setup

```bash
pnpm add drizzle-orm better-sqlite3 --filter @project/backend
pnpm add -D drizzle-kit @types/better-sqlite3 --filter @project/backend
```

Define your schema (e.g. `packages/backend/db/schema.ts`) with `drizzle-orm/sqlite-core`'s
`sqliteTable`, as usual.

## The reload hazard (the one this framework's own dev server actually causes)

This is the exact scenario `DATABASE.md` documents: `better-sqlite3`'s native binding crashes
(`Assertion failed: (env) != nullptr`) if an old connection is abandoned by a Vite SSR module
reload instead of being reused/closed. Apply the same `globalThis` + `registerDisposable()`
pattern:

```ts
// packages/backend/db/index.ts
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { registerDisposable } from "@devorajs/core";
import * as schema from "./schema.js";

declare global {
  var __sqlite: InstanceType<typeof Database> | undefined;
}

function getDb() {
  if (!globalThis.__sqlite) {
    globalThis.__sqlite = new Database("app.db");
    registerDisposable(import.meta.url, () => {
      globalThis.__sqlite?.close();
      globalThis.__sqlite = undefined;
    });
  }
  return drizzle(globalThis.__sqlite, { schema });
}

export const db = {
  settings: {
    async update(input: { key: string; value: string }) {
      return getDb()
        .insert(schema.settings)
        .values(input)
        .onConflictDoUpdate({ target: schema.settings.key, set: { value: input.value } });
    },
  },
};
```

## Wiring into a serverFn

Identical shape to `PRISMA.md`'s example — `serverFn`/`ctx.requireAuth()` don't know or care which
ORM is behind `db.settings.update()`.

## What this doesn't cover

- A Postgres/MySQL driver (`drizzle-orm/postgres-js`, `drizzle-orm/mysql2`, etc.) — those drivers
  are typically pooled connections rather than a single native handle, so the specific
  `better-sqlite3` crash this pattern targets may not apply the same way; the general
  `globalThis` + `registerDisposable()` shape is still the right starting point for avoiding
  "a new pool every reload," even if the failure mode without it is "connection exhaustion" rather
  than a native crash.
