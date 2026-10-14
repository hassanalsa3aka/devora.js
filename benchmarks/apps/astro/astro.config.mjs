import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import react from "@astrojs/react";

// Server output on the official Node adapter (standalone); the static page
// opts into prerendering. Otherwise defaults.
export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
});
