import { ITEMS } from "../api.js";

export async function loader() {
  await new Promise((r) => setTimeout(r, 2));
  return Response.json({ item: ITEMS[0] });
}
