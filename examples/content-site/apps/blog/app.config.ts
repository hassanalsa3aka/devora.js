import { defineApp } from "@devorajs/core/config";

export default defineApp({
  defaultRenderMode: "ssg",
  // Serves /sitemap.xml built from routes/. Off by default: turn it on
  // for a public-facing app, leave it off for an internal one.
  sitemap: true,
  // API routes live in endpoints/ (served under /api) — not api/, which
  // Vercel would turn into separate functions. See docs/guides/DEPLOYING.md.
  apiDir: "endpoints",
  // Tags for every page's <head> (a route adds its own via meta().head):
  head: { lang: "en" },
});
