// Express 5 with its documented production setup: NODE_ENV=production, express.json(),
// default settings. Same contract as every other backend app (see ../../backend/CONTRACT.md).
import express from "express";
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

const app = express();
app.use(express.json());

app.get("/static", (_req, res) => res.type("html").send("<!doctype html><title>static</title><p>static</p>"));
app.get("/api/items", (_req, res) => res.json({ items: ITEMS }));
app.post("/api/items", (req, res) => {
  const fields = validate(req.body);
  if (fields.length) return res.status(422).json({ error: "validation", fields });
  res.status(201).json({ id: nextId++, name: req.body.name, price: req.body.price });
});
app.post("/api/session", (req, res) => {
  const username = req.body?.username;
  if (typeof username !== "string" || !username) return res.status(400).json({ error: "username required" });
  const token = randomBytes(24).toString("base64url");
  sessions.set(token, { username, created: Date.now() });
  res.status(201).json({ token });
});
app.get("/api/me", (req, res) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
  const s = m && sessions.get(m[1]);
  if (!s) return res.status(401).json({ error: "unauthorized" });
  res.json({ user: s.username });
});
app.get("/api/slow", async (_req, res) => {
  await new Promise((r) => setTimeout(r, 2));
  res.json({ item: ITEMS[0] });
});

app.listen(Number(process.env.PORT) || 3000, "0.0.0.0");
