import { randomBytes } from "node:crypto";
import { sessions } from "../../api.js";

export const prerender = false;

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const username = body?.username;
  if (typeof username !== "string" || !username) return Response.json({ error: "username required" }, { status: 400 });
  const token = randomBytes(24).toString("base64url");
  sessions.set(token, { username, created: Date.now() });
  return Response.json({ token }, { status: 201 });
}
