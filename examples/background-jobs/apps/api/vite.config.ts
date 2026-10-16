import { defineConfig } from "vite";

// Backend-only app — nothing here ever ships to a browser, so no React
// plugin and no public assets. Vite still runs this app's dev server.
export default defineConfig({});
