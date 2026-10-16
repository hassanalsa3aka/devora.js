import { json } from "@sveltejs/kit";
import { randomBytes } from "node:crypto";
import { sessions } from "../../../lib/api.js";

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const username = body?.username;
  if (typeof username !== "string" || !username) return json({ error: "username required" }, { status: 400 });
  const token = randomBytes(24).toString("base64url");
  sessions.set(token, { username, created: Date.now() });
  return json({ token }, { status: 201 });
}
