import { DatabaseSync } from "node:sqlite";
// Opening the file for the first time switches it to WAL, and two processes doing that at once (the API
// route and the worker both start on the first request) can get "database is locked" even with a
// busy_timeout. Retry the open for up to 5 s instead of failing.
function openQueue(file) {
  for (let attempt = 0; ; attempt++) {
    try {
      const db = new DatabaseSync(file);
      db.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'waiting', result TEXT, created INTEGER NOT NULL)");
      return db;
    } catch (e) {
      if (e.errstr !== "database is locked" || attempt >= 50) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
const db = openQueue(process.env.JOBS_DB ?? "data/jobs.db");
console.log("sqlite worker up, pid", process.pid);
setInterval(() => {
  // Claim one waiting job atomically, run it, store the result.
  const job = db.prepare("UPDATE jobs SET state='active' WHERE id = (SELECT id FROM jobs WHERE state='waiting' ORDER BY id LIMIT 1) RETURNING id, payload").get();
  if (!job) return;
  const { n } = JSON.parse(job.payload);
  db.prepare("UPDATE jobs SET state='completed', result=? WHERE id=?").run(JSON.stringify({ square: n ** 2, worker: process.pid }), job.id);
  console.log("completed", job.id);
}, 200);
