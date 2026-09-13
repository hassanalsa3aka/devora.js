/**
 * Governance rule (architecture-v2.md §3.3.1): every use of
 * `fromExpressMiddleware()`/`fromFastifyPlugin()` — any point where a
 * third-party npm package starts running inside the request pipeline —
 * gets registered here, in one place, regardless of which app or
 * contributor introduced it. This keeps "a new external dependency is now
 * in the request pipeline" a single, visible, reviewable diff.
 *
 * A route opts in explicitly by importing one of these and passing it to
 * `withMiddleware()` — nothing here runs automatically/implicitly for every
 * route, consistent with "explicit over implicit" (this codebase has no
 * global middleware-registration list that silently applies to everything).
 */
import cors from "cors";
import { fromExpressMiddleware, type Middleware } from "@devorajs/core";

/** Real example: allows cross-origin reads of this project's public API
 * routes from the marketing site's own domain. */
export const allowMarketingOrigin: Middleware = fromExpressMiddleware(
  cors({ origin: "https://example.com" })
);
