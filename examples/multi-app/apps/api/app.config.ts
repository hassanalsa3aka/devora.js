import { defineApp } from "@devorajs/core/config";

// Backend-only app: API routes under endpoints/, no pages and no client build.
export default defineApp({
  backendOnly: true,
  // API routes live in endpoints/ (served under /api) — not api/, which
  // Vercel would turn into separate functions. See docs/guides/DEPLOYING.md.
  apiDir: "endpoints",
});
