import { ITEMS } from "../shared";

export const dynamic = "force-dynamic";

export async function GET() {
  await new Promise((r) => setTimeout(r, 2));
  return Response.json({ item: ITEMS[0] });
}
