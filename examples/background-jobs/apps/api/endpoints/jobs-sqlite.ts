import { apiRoute, HttpError } from "@devorajs/core";
import { DatabaseSync } from "node:sqlite";

// A queue with no Redis: a SQLite file (node:sqlite, built into Node). POST enqueues a row;
// a separate worker (lab-scripts/worker-sqlite.mjs) claims rows and writes the result back.
// Opening the file for the first time switches it to WAL, and two processes doing that at once (the API
// route and the worker both start on the first request) can get "database is locked" even with a
// busy_timeout. Retry the open for up to 5 s instead of failing.
function openQueue(file: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      const db = new DatabaseSync(file);
      db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'waiting', result TEXT, created INTEGER NOT NULL)");
      return db;
    } catch (e) {
      if ((e as { errstr?: string }).errstr !== "database is locked" || attempt >= 50) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
const db = openQueue(process.env.JOBS_DB ?? "data/jobs.db");

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
