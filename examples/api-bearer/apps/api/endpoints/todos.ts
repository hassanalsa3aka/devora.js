import { apiRoute, HttpError } from "@devorajs/core";

// GET  /api/todos                    -> the caller's todos
// POST /api/todos  { "title": "..." } -> adds one
// Both need Authorization: Bearer <token> from POST /api/session.
//
// Kept in memory, per user, for the example. A real API stores them in a
// database (the shared backend, packages/backend, is the place for that).
const todos = new Map<string, { id: number; title: string; done: boolean }[]>();
let nextId = 1;

export const methods = ["GET", "POST"];

export const handler = apiRoute(async (req, ctx) => {
  ctx.requireAuth();
  const user = (ctx.session as { username: string }).username;
  const mine = todos.get(user) ?? [];

  if (req.method === "GET") return json(200, { todos: mine });

  let title: unknown;
  try {
    title = JSON.parse(req.body.toString("utf-8") || "{}").title;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof title !== "string" || !title.trim()) throw new HttpError(400, "title required");
  const todo = { id: nextId++, title: title.trim(), done: false };
  todos.set(user, [...mine, todo]);
  return json(201, { todo });
});

function json(status: number, body: unknown) {
  return { status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
