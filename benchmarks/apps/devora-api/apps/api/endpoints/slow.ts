import { apiRoute } from "@devorajs/core";
import { ITEMS, json } from "../shared";

// GET /api/slow: one async step (a 2 ms timer, standing in for a database round trip).
export const methods = ["GET"];

export const handler = apiRoute(async () => {
  await new Promise((r) => setTimeout(r, 2));
  return json(200, { item: ITEMS[0] });
});
