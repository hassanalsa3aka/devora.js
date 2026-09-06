/**
 * No built-in ORM in v1 (§6, §11) — plug in Prisma, Drizzle, or anything
 * else here. This stub exists so the rest of the skeleton has something
 * to import against; replace it with your real client.
 *
 * A real Drizzle+better-sqlite3 client was wired in here and verified
 * end-to-end against the real SSR pipeline (ROADMAP.md #6), then reverted —
 * see that section for what worked and a real integration issue it
 * surfaced (a native-addon crash on Vite's SSR module reload) before
 * picking a driver for real.
 */
export const db = {
  settings: {
    async update(input: unknown): Promise<unknown> {
      throw new Error(
        "[backend/db] no DB client configured yet — wire up Prisma/Drizzle/etc. here."
      );
    },
  },
};
