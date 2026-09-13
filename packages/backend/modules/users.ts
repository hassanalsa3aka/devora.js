/**
 * Real example of an explicit domain module (architecture-v2.md §3.1) —
 * shared backend logic, same "one shared backend by default" rule §6/§14
 * already established for serverFn (see functions/settings.ts). Bundles a
 * function AND an API route together under one scope; an app that needs
 * either imports directly from here, same as `updateSettings` already is.
 */
import { serverFn, apiRoute, defineModule } from "@devorajs/core";
import { db } from "../db/index.js";

export interface UserProfile {
  id: string;
  name: string;
}

export const getUserProfile = serverFn(async (input: { id: string }, ctx) => {
  ctx.requireAuth();
  return db.users.find(input.id) as Promise<UserProfile>;
});

export const usersModule = defineModule({
  name: "users",
  functions: { getUserProfile },
  routes: {
    // Registered at "/users/:id" once mounted into a parent module — see
    // this module's own file-based counterpart, apps/dashboard/api/hello.ts,
    // for how an app actually exposes a handler like this over HTTP today
    // (a plain re-export; there's no automatic module→URL mounting yet,
    // deliberately — this codebase has no catch-all route segments,
    // router.ts's own documented scope limit).
    "/[id]": apiRoute(async (req, ctx) => {
      ctx.requireAuth();
      const profile = await getUserProfile({ id: req.params.id! }, ctx);
      return { status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) };
    }),
  },
});
