import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Shared brand assets (logo, favicon) live once at the repo root, not
  // duplicated per app — Vite serves/copies this directory's contents at
  // the site root in both dev and a real production build (see
  // packages/core/src/theme.ts, and prodRequestHandler.ts's static-file
  // fallback for how production serves it).
  publicDir: path.resolve(__dirname, "../../assets"),
  // esbuild 0.25+ (bumped for GHSA-67mh-4wv8-2f99, see architecture-v2.md Phase 0)
  // can no longer down-level destructuring to Vite's old default multi-browser
  // target list in combination; picking one explicit modern target avoids it.
  build: {
    target: "es2022",
  },
});
