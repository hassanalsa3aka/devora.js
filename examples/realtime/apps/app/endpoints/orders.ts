import { apiRoute, CSRF_HEADER_NAME, HttpError } from "@devorajs/core";
import { addOrder, listOrders } from "@devorajs/backend/orders";

// GET  /api/orders  -> { orders }   (the polling fallback reads this)
// POST /api/orders  { "item": "..." } -> 201 { order }, then publishes it to the user's room
export const methods = ["GET", "POST"];

export const handler = apiRoute(async (req, ctx) => {
  ctx.requireAuth();
  if (req.method === "GET") {
    return {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ orders: await listOrders(undefined, ctx) }),
    };
  }
  const csrf = req.headers[CSRF_HEADER_NAME];
  ctx.verifyCsrf(typeof csrf === "string" ? csrf : "");
  let item: unknown;
  try {
    item = JSON.parse(req.body.toString("utf-8") || "{}").item;
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  if (typeof item !== "string" || !item.trim()) throw new HttpError(400, "item required");
  const order = await addOrder({ item: item.trim().slice(0, 80) }, ctx);
  return {
    status: 201,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ order }),
  };
});
