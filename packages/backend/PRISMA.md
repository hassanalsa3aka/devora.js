# Wiring in Prisma

A guide, not a built-in integration — `db/index.ts` stays a bring-your-own stub (architecture-v1.md
§6/§11, unchanged in v2). This shows the shape that fits this framework's existing patterns; it
hasn't been run against a real Prisma project inside this repo (no schema, no generated client
here) the way `DATABASE.md`'s `better-sqlite3` fix was actually reproduced — treat the code below
as illustrative, and verify it against your own schema before trusting it.

## Setup (outside this framework — standard Prisma)

```bash
pnpm add -D prisma --filter @project/backend
pnpm add @prisma/client --filter @project/backend
pnpm exec prisma init
```

Define your schema in `packages/backend/prisma/schema.prisma` as usual, then
`pnpm exec prisma generate`/`migrate dev`.

## The reload hazard applies here too

Prisma's own official guidance already recommends a `globalThis` singleton for exactly the
dev-server-reload problem `DATABASE.md` documents for `better-sqlite3` — same root cause (a module
re-executed by Vite's `ssrLoadModule` would otherwise create a new `PrismaClient`, and a real
database connection pool, on every reload). Use the identical pattern already established here,
plus the real, verified `registerDisposable()` hook (`DATABASE.md`'s "v2 update" section) to close
the old client cleanly instead of leaving it to garbage collection:

```ts
// packages/backend/db/index.ts
import { PrismaClient } from "@prisma/client";
import { registerDisposable } from "@devorajs/core";

declare global {
  var __prisma: PrismaClient | undefined;
}

function getPrisma(): PrismaClient {
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient();
    registerDisposable(import.meta.url, () => {
      void globalThis.__prisma?.$disconnect();
      globalThis.__prisma = undefined;
    });
  }
  return globalThis.__prisma;
}

export const db = {
  settings: {
    async update(input: { key: string; value: string }) {
      return getPrisma().setting.upsert({
        where: { key: input.key },
        create: input,
        update: { value: input.value },
      });
    },
  },
};
```

## Wiring into a serverFn (the shared backend pattern, unchanged)

```ts
// packages/backend/functions/settings.ts
import { serverFn } from "@devorajs/core";
import { db } from "../db/index.js";

export const updateSettings = serverFn(async (input: { key: string; value: string }, ctx) => {
  ctx.requireAuth(); // still bring-your-own — Prisma doesn't change who "authenticated" means
  return db.settings.update(input);
});
```

Nothing about the `serverFn`/`ctx.requireAuth()`/shared-backend shape changes when you add a real
ORM — that's the whole point of `db/index.ts` being a plain stub with the same call shape you'd use
for real.

## What this doesn't cover

- Connection pooling for serverless deployment (Vercel/Netlify) — Prisma's own docs on the
  "Data Proxy"/Accelerate or a pooler like PgBouncer apply here exactly as they would in any other
  Node app; nothing framework-specific changes that story.
- Migrations in CI — standard `prisma migrate deploy`, run wherever your deploy pipeline already
  runs `devora build`.
