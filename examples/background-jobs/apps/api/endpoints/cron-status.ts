import { apiRoute } from "@devorajs/core";
import cron from "node-cron";
import { appendFileSync, existsSync, readFileSync } from "node:fs";

// node-cron inside the server process. The schedule is registered when this module is first
// imported, which for a built route is the first request to /api/cron-status (there is no start-up hook).
const LOG = "data/cron.log";
const startedAt = Date.now();
cron.schedule("* * * * * *", () => appendFileSync(LOG, `tick ${new Date().toISOString()}\n`));

export const methods = ["GET"];
export const handler = apiRoute(() => {
  const lines = existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").length : 0;
  return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registeredMsAgo: Date.now() - startedAt, ticksSoFar: lines, pid: process.pid }) };
});
