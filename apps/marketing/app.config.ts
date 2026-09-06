import { defineApp } from "@devora/core/config";

export default defineApp({
  // Marketing pages change rarely — pre-render at build time.
  defaultRenderMode: "ssg",
  // The one app meant to be publicly indexed — sitemap is opt-in by default
  // (ROADMAP.md #7) precisely so dashboard/admin don't need to remember to
  // turn it off.
  sitemap: true,
});
