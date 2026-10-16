import { Worker } from "bullmq";
const connection = { host: "127.0.0.1", port: Number(process.env.REDIS_PORT ?? 6390), maxRetriesPerRequest: null };
new Worker("square", async (job) => { await new Promise((r) => setTimeout(r, 300)); return { square: job.data.n ** 2, by: job.data.by, worker: process.pid }; }, { connection })
  .on("completed", (j, r) => console.log("completed", j.id, r));
console.log("bullmq worker up, pid", process.pid);
