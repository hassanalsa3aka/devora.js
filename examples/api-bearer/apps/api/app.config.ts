import { defineApp } from "@devorajs/core/config";

// Backend-only app: API routes under endpoints/, no pages and no client build.
export default defineApp({
  backendOnly: true,
  // API routes live in endpoints/ (served under /api) — not api/, which
  // Vercel would turn into separate functions. See docs/guides/DEPLOYING.md.
  apiDir: "endpoints",
  // Clients log in with POST /api/session and send Authorization: Bearer.
  // They keep no cookies, so never issue the CSRF cookie.
  csrf: false,
  // A browser app on another origin (here a local Vite dev server) may call
  // this API. Bearer tokens aren't cookies, so credentials stay off.
  cors: { origins: ["http://localhost:5173"], allowHeaders: ["content-type", "authorization"] },
});
