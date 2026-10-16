import { json } from "@sveltejs/kit";
import { sessions } from "../../../lib/api.js";

export function GET({ request }) {
  const m = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "");
  const s = m && sessions.get(m[1]);
  if (!s) return json({ error: "unauthorized" }, { status: 401 });
  return json({ user: s.username });
}
