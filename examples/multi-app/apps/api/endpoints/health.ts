import { apiRoute } from "@devorajs/core";

// GET /api/health
export const methods = ["GET"];
export const handler = apiRoute(() => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ok: true }),
}));
