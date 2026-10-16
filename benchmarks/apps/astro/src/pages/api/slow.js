import { ITEMS } from "../../api.js";

export const prerender = false;

export async function GET() {
  await new Promise((r) => setTimeout(r, 2));
  return Response.json({ item: ITEMS[0] });
}
