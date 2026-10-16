import { apiRoute } from "@devorajs/core";
import { ITEMS, json, validate } from "../shared";

// GET  /api/items -> the list
// POST /api/items { name, price } -> 201, or 422 with the failing fields
let nextId = 1000;
export const methods = ["GET", "POST"];

export const handler = apiRoute((req) => {
  if (req.method === "GET") return json(200, { items: ITEMS });
  let body: any = null;
  try {
    body = JSON.parse(req.body.toString("utf-8") || "null");
  } catch {}
  const fields = validate(body);
  if (fields.length) return json(422, { error: "validation", fields });
  return json(201, { id: nextId++, name: body.name, price: body.price });
});
