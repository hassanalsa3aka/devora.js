import { ITEMS, validate } from "../shared";

export const dynamic = "force-dynamic";
let nextId = 1000;

export function GET() {
  return Response.json({ items: ITEMS });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const fields = validate(body);
  if (fields.length) return Response.json({ error: "validation", fields }, { status: 422 });
  return Response.json({ id: nextId++, name: body.name, price: body.price }, { status: 201 });
}
