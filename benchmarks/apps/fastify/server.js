// Fastify 5 with its documented defaults (no logger, built-in JSON body parsing).
import Fastify from "fastify";
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

const app = Fastify();
app.get("/static", async (_req, reply) => reply.type("text/html").send("<!doctype html><title>static</title><p>static</p>"));
app.get("/api/items", async () => ({ items: ITEMS }));
app.post("/api/items", async (req, reply) => {
  const fields = validate(req.body);
  if (fields.length) return reply.code(422).send({ error: "validation", fields });
  return reply.code(201).send({ id: nextId++, name: req.body.name, price: req.body.price });
});
app.post("/api/session", async (req, reply) => {
  const username = req.body?.username;
  if (typeof username !== "string" || !username) return reply.code(400).send({ error: "username required" });
  const token = randomBytes(24).toString("base64url");
  sessions.set(token, { username, created: Date.now() });
  return reply.code(201).send({ token });
});
app.get("/api/me", async (req, reply) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  const s = m && sessions.get(m[1]);
  if (!s) return reply.code(401).send({ error: "unauthorized" });
  return { user: s.username };
});
app.get("/api/slow", async () => {
  await new Promise((r) => setTimeout(r, 2));
  return { item: ITEMS[0] };
});

await app.listen({ port: Number(process.env.PORT) || 3000, host: "0.0.0.0" });
