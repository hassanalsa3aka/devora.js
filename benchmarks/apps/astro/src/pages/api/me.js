import { sessions } from "../../api.js";

export const prerender = false;

export function GET({ request }) {
  const m = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  const s = m && sessions.get(m[1]);
  if (!s) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user: s.username });
}
