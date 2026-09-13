import { apiRoute } from "@devorajs/core";

export const handler = apiRoute(() => ({
  status: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ pong: true }),
}));
