/**
 * Public API route on an `auth: "none"` app — proves generic API routes
 * work with zero DEVORA_SESSION_SECRET* configured (architecture-v2.md
 * §3.2), same as this app's pages already do. Calling any ctx session
 * method here would correctly fail the build (checkNoAuthUsage.ts now
 * scans api/ too) — this route deliberately doesn't need to.
 */
import { apiRoute } from "@devorajs/core";

export const handler = apiRoute(() => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "ok" }),
}));
