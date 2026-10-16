import { apiRoute } from "@devorajs/core";
import { json } from "../shared";

// POST /api/session { username } -> { token } (Bearer). Demo: no password check.
export const methods = ["POST"];

export const handler = apiRoute(async (req, ctx) => {
  let username: unknown;
  try {
    username = JSON.parse(req.body.toString("utf-8") || "{}").username;
  } catch {}
  if (typeof username !== "string" || !username) return json(400, { error: "username required" });
  const token = await ctx.setSession({ username }, { transport: "bearer" });
  return json(201, { token });
});
