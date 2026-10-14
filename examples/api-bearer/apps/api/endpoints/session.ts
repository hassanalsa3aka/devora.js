import { apiRoute, HttpError } from "@devorajs/core";

// POST /api/session   { "username": "..." } -> { "token": "..." }
// DELETE /api/session (Authorization: Bearer <token>) -> revokes it
//
// Demo only: accepts any username with no password check. A real app
// verifies credentials against its own database before setSession().
export const methods = ["POST", "DELETE"];

export const handler = apiRoute(async (req, ctx) => {
  if (req.method === "DELETE") {
    ctx.requireAuth();
    await ctx.revokeSession();
    return { status: 204 };
  }

  let username: unknown;
  try {
    username = JSON.parse(req.body.toString("utf-8") || "{}").username;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof username !== "string" || !username) throw new HttpError(400, "username required");

  const token = await ctx.setSession({ username }, { transport: "bearer" });
  return {
    status: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  };
});
