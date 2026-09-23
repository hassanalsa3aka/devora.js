/**
 * Token login/logout for API and mobile clients — the framework-native
 * replacement for a hand-rolled Bearer scheme (devora-pre-v3-hotfixes.md #5,
 * #7 and the unified session auth addendum). Same session primitive the
 * browser login in routes/login.tsx uses; the only difference is the
 * transport: `setSession(..., { transport: "bearer" })` sets no cookie and
 * hands the opaque session ID back in the body, which the client then sends
 * as `Authorization: Bearer <id>`. `ctx.requireAuth()` anywhere in this
 * app (e.g. api/hello.ts) accepts it with no extra code, and
 * `DELETE /api/session` (or a browser logout, or an expiry) kills it.
 *
 * No `verifyCsrf()` on POST, deliberately: the request carries no ambient
 * credential for a cross-site page to ride on — the username arrives in the
 * body and the token goes back in the response body, which a cross-site
 * page can't read. The DELETE is Bearer-authenticated, which is exempt by
 * design (see session.ts).
 *
 * Demo only, like login.tsx: a real app checks a password/OTP against its
 * own DB before calling setSession().
 */
import { apiRoute, HttpError } from "@devorajs/core";

export const methods = ["POST", "DELETE"];

export const handler = apiRoute(async (req, ctx) => {
  if (req.method === "DELETE") {
    ctx.requireAuth();
    await ctx.revokeSession();
    return { status: 204 };
  }

  let username: unknown;
  try {
    username = (JSON.parse(req.body.toString("utf-8") || "{}") as { username?: unknown }).username;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof username !== "string" || !username) throw new HttpError(400, "username required");

  const token = await ctx.setSession({ username }, { transport: "bearer" });
  return {
    status: 201,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ token }),
  };
});
