// The documented production setup: `nuxt build`, then the Node server it writes (.output/server/index.mjs).
// /static is pre-rendered at build time; /items is rendered on every request.
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  telemetry: false,
  routeRules: { "/static": { prerender: true } },
});
