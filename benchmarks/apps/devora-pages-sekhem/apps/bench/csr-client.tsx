import { hydrateCsrRoutes } from "@devorajs/core/client";

// Only requested when a page's renderMode is "csr" — see
// packages/core/src/csrRoute.ts. Real logic lives once in
// @devorajs/core, shared by every app.
hydrateCsrRoutes();
