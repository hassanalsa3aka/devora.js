import { apiRoute } from "@devorajs/core";

// GET /api/me (Authorization: Bearer <token>) — 401 without a valid session.
export const methods = ["GET"];
export const handler = apiRoute((_req, ctx) => {
  ctx.requireAuth();
  return {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session: ctx.session }),
  };
});
