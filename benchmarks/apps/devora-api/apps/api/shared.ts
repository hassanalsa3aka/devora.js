export const ITEMS = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, price: ((i * 37) % 1000) / 10 }));

export function json(status: number, body: unknown) {
  return { status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

export function validate(b: any): string[] {
  const fields: string[] = [];
  if (!b || typeof b.name !== "string" || b.name.length < 1 || b.name.length > 50) fields.push("name");
  if (!b || typeof b.price !== "number" || !(b.price >= 0)) fields.push("price");
  return fields;
}
