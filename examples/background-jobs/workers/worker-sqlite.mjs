import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync(process.env.JOBS_DB ?? "data/jobs.db");
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
