export const ITEMS = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}`, price: ((i * 37) % 1000) / 10 }));
export const sessions = (globalThis.__benchSessions ??= new Map());
export function validate(b) {
  const fields = [];
  if (!b || typeof b.name !== "string" || b.name.length < 1 || b.name.length > 50) fields.push("name");
  if (!b || typeof b.price !== "number" || !(b.price >= 0)) fields.push("price");
  return fields;
}
