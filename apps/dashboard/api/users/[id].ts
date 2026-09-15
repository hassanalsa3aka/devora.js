/**
 * Shared backend logic — re-exports the handler `packages/backend`'s
 * `usersModule` already defines (architecture-v2.md §3.2.1's ownership
 * rule: shared logic lives in packages/backend, an app's api/ file just
 * imports it, same as v1's serverFn already works for settings.ts).
 */
import { usersModule } from "@devorajs/backend/modules/users";
import type { ApiRouteHandler } from "@devorajs/core";

export const handler: ApiRouteHandler = usersModule.getRoutes()["/[id]"]!;
