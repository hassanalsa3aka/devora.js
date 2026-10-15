import { apiRoute } from "@devorajs/core";
import { issueRealtimeToken } from "@devorajs/backend/realtimeToken";

// GET /api/realtime-token -> { token, expiresIn, url }
// 401 without a login. The token lives 60 seconds and carries the user id;
// the realtime server checks it once, when the browser connects.
export const methods = ["GET"];

export const handler = apiRoute((_req, ctx) => {
  ctx.requireAuth();
  const user = (ctx.session as { username: string }).username;
  const { token, expiresIn } = issueRealtimeToken(user);
  return {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ token, expiresIn, url: process.env.REALTIME_URL ?? "http://localhost:4400" }),
  };
});
