import { apiRoute, HttpError } from "@devorajs/core";
import { addNote, listNotes } from "@devorajs/backend/notes";

// GET  /api/notes                       -> every note
// POST /api/notes  { "text": "..." }    -> adds one (Authorization: Bearer <token>)
export const methods = ["GET", "POST"];

export const handler = apiRoute(async (req, ctx) => {
  if (req.method === "GET") {
    return json(200, { notes: await listNotes(undefined, ctx) });
  }
  let text: unknown;
  try {
    text = JSON.parse(req.body.toString("utf-8") || "{}").text;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof text !== "string" || !text.trim()) throw new HttpError(400, "text required");
  return json(201, { note: await addNote({ text: text.trim() }, ctx) });
});

function json(status: number, body: unknown) {
  return { status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}
