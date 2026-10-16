import { json } from "@sveltejs/kit";
import { ITEMS, validate } from "../../../lib/api.js";

let nextId = 1000;

export function GET() {
  return json({ items: ITEMS });
}

export async function POST({ request }) {
  const body = await request.json().catch(() => null);
  const fields = validate(body);
  if (fields.length) return json({ error: "validation", fields }, { status: 422 });
  return json({ id: nextId++, name: body.name, price: body.price }, { status: 201 });
}
