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
