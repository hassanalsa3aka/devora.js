import { defineConfig } from "vite";

// Backend-only app (architecture-v2.md §3.4) — no react plugin, no
// publicDir, no build.target override for browser output: nothing here
// ever ships to a browser. This is the entire config.
export default defineConfig({});
