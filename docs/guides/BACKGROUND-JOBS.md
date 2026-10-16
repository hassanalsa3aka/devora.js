# Background jobs in Devora.js

Devora.js has no job runner. A request handler answers and returns; work that should happen later,
or on a schedule, runs somewhere else. Three setups were tested on one Node server with 0.3.4. None
was deployed to Vercel or Netlify. The same page is on the docs site ("Background jobs").

If the work takes less than a second or two and the user can wait, do it in the request. Reach for a
job when the work is slow, must be retried, or must run on a schedule with no request to start it.

| Pattern | Needs | Worker |
|---|---|---|
| BullMQ with Redis | Redis, `bullmq` and `ioredis` (installed separately) | a separate process |
| A SQLite queue | A Node with `node:sqlite` (run on Node 24) | a separate process on the same machine |
| node-cron | `node-cron` | none: it runs inside the server process |

A worker is a separate process that must stay on, so it needs an always-on host. A Vercel or Netlify
function cannot run a worker, hold a timer, or share a file between invocations.

A runnable project with a check script is in the maintainer's lab; the snippets below are the files it uses.

## 1. BullMQ with Redis and a worker

The route enqueues the job and returns its id at once (202); a separate worker takes it from Redis.

```ts
// apps/api/endpoints/jobs-bullmq.ts
import { apiRoute, HttpError } from "@devorajs/core";
import { Queue } from "bullmq";

// POST /api/jobs-bullmq {n} enqueues a job on Redis; GET ?id=... reads its state and result.
// The worker is a separate process (lab-scripts/worker-bullmq.mjs).
const connection = { host: "127.0.0.1", port: Number(process.env.REDIS_PORT ?? 6390), maxRetriesPerRequest: null as null };
const queue = new Queue("square", { connection });

export const methods = ["GET", "POST"];
export const handler = apiRoute(async (req, ctx) => {
  ctx.requireAuth();
  if (req.method === "POST") {
    const { n } = JSON.parse(req.body.toString("utf-8") || "{}");
    if (typeof n !== "number") throw new HttpError(400, "n must be a number");
    const job = await queue.add("square", { n, by: (ctx.session as { username: string }).username });
    return json(202, { id: job.id });
  }
  const id = new URL(req.url, "http://x").searchParams.get("id") ?? "";
  const job = await queue.getJob(id);
  if (!job) throw new HttpError(404, "no such job");
  return json(200, { id, state: await job.getState(), result: job.returnvalue ?? null });
});

function json(status: number, body: unknown) {
  return { status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
```

```js
// workers/worker-bullmq.mjs
import { Worker } from "bullmq";
const connection = { host: "127.0.0.1", port: Number(process.env.REDIS_PORT ?? 6390), maxRetriesPerRequest: null };
new Worker("square", async (job) => { await new Promise((r) => setTimeout(r, 300)); return { square: job.data.n ** 2, by: job.data.by, worker: process.pid }; }, { connection })
  .on("completed", (j, r) => console.log("completed", j.id, r));
console.log("bullmq worker up, pid", process.pid);
```

```bash
npm install bullmq ioredis        # bullmq needs ioredis installed next to it
redis-server --port 6390
npx devora build --app=api
PORT=4501 REDIS_PORT=6390 npx devora start --app=api
REDIS_PORT=6390 node workers/worker-bullmq.mjs            # a second terminal
```

## 2. A SQLite queue and a worker (no Redis)

```ts
// apps/api/endpoints/jobs-sqlite.ts
import { apiRoute, HttpError } from "@devorajs/core";
import { DatabaseSync } from "node:sqlite";

// A queue with no Redis: a SQLite file (node:sqlite, built into Node). POST enqueues a row;
// a separate worker (lab-scripts/worker-sqlite.mjs) claims rows and writes the result back.
const db = new DatabaseSync(process.env.JOBS_DB ?? "lab-data/jobs.db");
db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'waiting', result TEXT, created INTEGER NOT NULL)");

export const methods = ["GET", "POST"];
export const handler = apiRoute(async (req, ctx) => {
  ctx.requireAuth();
  if (req.method === "POST") {
    const { n } = JSON.parse(req.body.toString("utf-8") || "{}");
    if (typeof n !== "number") throw new HttpError(400, "n must be a number");
    const r = db.prepare("INSERT INTO jobs (payload, created) VALUES (?, ?)").run(JSON.stringify({ n }), Date.now());
    return json(202, { id: Number(r.lastInsertRowid) });
  }
  const id = Number(new URL(req.url, "http://x").searchParams.get("id"));
  const row = db.prepare("SELECT id, state, result FROM jobs WHERE id = ?").get(id) as { id: number; state: string; result: string | null } | undefined;
  if (!row) throw new HttpError(404, "no such job");
  return json(200, { id: row.id, state: row.state, result: row.result ? JSON.parse(row.result) : null });
});

function json(status: number, body: unknown) {
  return { status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
```

```js
// workers/worker-sqlite.mjs
import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(process.env.JOBS_DB ?? "lab-data/jobs.db");
db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'waiting', result TEXT, created INTEGER NOT NULL)");
console.log("sqlite worker up, pid", process.pid);
setInterval(() => {
  // Claim one waiting job atomically, run it, store the result.
  const job = db.prepare("UPDATE jobs SET state='active' WHERE id = (SELECT id FROM jobs WHERE state='waiting' ORDER BY id LIMIT 1) RETURNING id, payload").get();
  if (!job) return;
  const { n } = JSON.parse(job.payload);
  db.prepare("UPDATE jobs SET state='completed', result=? WHERE id=?").run(JSON.stringify({ square: n ** 2, worker: process.pid }), job.id);
  console.log("completed", job.id);
}, 200);
```

Both processes must run in the same folder (the same `jobs.db`). WAL mode and a busy timeout let them
share the file.

## 3. node-cron inside the server

`devora start` has no start-up hook, so the schedule is registered when the module that contains it is
first imported: for a built route, at the first request to it. A schedule runs once per server process,
so two instances run it twice.

```ts
// apps/api/endpoints/cron-status.ts
import { apiRoute } from "@devorajs/core";
import cron from "node-cron";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

// node-cron inside the server process. The schedule is registered when this module is first
// imported, which for a built route is the first request to /api/cron-status (there is no start-up hook).
const LOG = "lab-data/cron.log";
const startedAt = Date.now();
cron.schedule("* * * * * *", () => appendFileSync(LOG, `tick ${new Date().toISOString()}\n`));

export const methods = ["GET"];
export const handler = apiRoute(() => {
  const lines = existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").length : 0;
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registeredMsAgo: Date.now() - startedAt, ticksSoFar: lines, pid: process.pid }) };
});
```

## What was verified, and what was not

Checked on 0.3.4 on one local Node server: enqueueing without a login answers 401, with a Bearer token
202 and an id; BullMQ returned `completed` with the result in about 330 ms (a local `redis-server`);
SQLite in about 100 to 220 ms; node-cron wrote no log before the first request and four ticks in the
next 3.5 seconds.

Not verified: Vercel and Netlify (nothing was deployed); retries, failure handling, several workers and
many jobs; a production Redis; a worker's memory over time.
