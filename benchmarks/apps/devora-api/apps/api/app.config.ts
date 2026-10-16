import { defineApp } from "@devorajs/core/config";

// Backend-only app: API routes under endpoints/, served under /api. Same contract as every other
// backend app in this benchmark (see ../../../../backend/CONTRACT.md). Defaults everywhere:
// security headers on, sessions in the "memory" store, Bearer tokens, no CSRF cookie for them.
export default defineApp({
  backendOnly: true,
  apiDir: "endpoints",
  csrf: false,
});
