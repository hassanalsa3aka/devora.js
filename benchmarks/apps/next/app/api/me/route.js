import { sessions } from "../shared";

export const dynamic = "force-dynamic";

export function GET(request) {
  const m = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  const s = m && sessions.get(m[1]);
  if (!s) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ user: s.username });
}
