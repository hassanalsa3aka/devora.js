import { json } from "@sveltejs/kit";
import { ITEMS } from "../../../lib/api.js";

export async function GET() {
  await new Promise((r) => setTimeout(r, 2));
  return json({ item: ITEMS[0] });
}
