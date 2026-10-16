// Hono on @hono/node-server, defaults.
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { randomBytes } from "node:crypto";

const ITEMS = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, price: ((i * 37) % 1000) / 10 }));
const sessions = new Map();
let nextId = 1000;

function validate(b) {
  const fields = [];
  if (!b || typeof b.name !== "string" || b.name.length < 1 || b.name.length > 50) fields.push("name");
  if (!b || typeof b.price !== "number" || !(b.price >= 0)) fields.push("price");
  return fields;
}

const app = new Hono();
app.get("/static", (c) => c.html("<!doctype html><title>static</title><p>static</p>"));
app.get("/api/items", (c) => c.json({ items: ITEMS }));
app.post("/api/items", async (c) => {
  const body = await c.req.json().catch(() => null);
  const fields = validate(body);
  if (fields.length) return c.json({ error: "validation", fields }, 422);
  return c.json({ id: nextId++, name: body.name, price: body.price }, 201);
});
app.post("/api/session", async (c) => {
  const body = await c.req.json().catch(() => null);
  const username = body?.username;
  if (typeof username !== "string" || !username) return c.json({ error: "username required" }, 400);
  const token = randomBytes(24).toString("base64url");
  sessions.set(token, { username, created: Date.now() });
  return c.json({ token }, 201);
});
app.get("/api/me", (c) => {
  const m = /^Bearer (.+)$/.exec(c.req.header("authorization") ?? "");
  const s = m && sessions.get(m[1]);
  if (!s) return c.json({ error: "unauthorized" }, 401);
  return c.json({ user: s.username });
});
app.get("/api/slow", async (c) => {
  await new Promise((r) => setTimeout(r, 2));
  return c.json({ item: ITEMS[0] });
});

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000, hostname: "0.0.0.0" });
