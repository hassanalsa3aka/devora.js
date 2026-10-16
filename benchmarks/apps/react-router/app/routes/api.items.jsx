import { ITEMS, validate } from "../api.js";

let nextId = 1000;

export function loader() {
  return Response.json({ items: ITEMS });
}

export async function action({ request }) {
  const body = await request.json().catch(() => null);
  const fields = validate(body);
  if (fields.length) return Response.json({ error: "validation", fields }, { status: 422 });
  return Response.json({ id: nextId++, name: body.name, price: body.price }, { status: 201 });
}
