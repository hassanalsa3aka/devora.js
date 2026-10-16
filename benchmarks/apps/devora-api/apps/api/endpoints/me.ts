import { apiRoute } from "@devorajs/core";
import { json } from "../shared";

// GET /api/me with Authorization: Bearer <token> -> 401 without a live session.
// Not requireAuth(): its thrown 401 body is the framework's own error shape; the
// contract needs {"error":"unauthorized"}, so check ctx.session and answer the same body.
export const methods = ["GET"];

export const handler = apiRoute((_req, ctx) => {
  const s = ctx.session as { username: string } | undefined;
  if (!s) return json(401, { error: "unauthorized" });
  return json(200, { user: s.username });
});
