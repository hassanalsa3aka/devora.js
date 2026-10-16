/**
 * No built-in ORM (bring your own — Prisma, Drizzle, etc.). This stub
 * exists so the rest of the skeleton has something to import against.
 */
export const db = {
  async example(): Promise<unknown> {
    throw new Error("[backend/db] no DB client configured yet — wire up Prisma/Drizzle/etc. here.");
  },
};
