import { serverFn } from "@devorajs/core";

export interface Order {
  id: number;
  user: string;
  item: string;
  at: string;
}

// In memory, per process: fine for one `devora start`, wrong for anything
// else. Replace with your database.
const orders: Order[] = [];
let nextId = 1;

function realtimeUrl(): string {
  return process.env.REALTIME_URL ?? "http://localhost:4400";
}

/** Tells the realtime server to push `event` to every browser connected as `userId`. */
async function publish(userId: string, event: string, data: unknown): Promise<void> {
  const secret = process.env.REALTIME_PUBLISH_SECRET ?? "dev-only-realtime-publish-secret";
  try {
    await fetch(`${realtimeUrl()}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({ userId, event, data }),
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    // The order is saved either way; a client that missed the push catches up by polling.
    console.warn("[orders] realtime publish failed:", (err as Error).message);
  }
}

export const listOrders = serverFn(async (_input: void, ctx) => {
  ctx.requireAuth();
  const user = (ctx.session as { username: string }).username;
  return orders.filter((o) => o.user === user).slice(-20);
});

export const addOrder = serverFn(async (input: { item: string }, ctx) => {
  ctx.requireAuth();
  const user = (ctx.session as { username: string }).username;
  const order: Order = { id: nextId++, user, item: input.item, at: new Date().toISOString() };
  orders.push(order);
  await publish(user, "order", order);
  return order;
});
