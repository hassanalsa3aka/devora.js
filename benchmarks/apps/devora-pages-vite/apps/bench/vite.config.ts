import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // Shared brand assets (logo, favicon) — see packages/core/src/theme.ts.
  publicDir: path.resolve(__dirname, "../../assets"),
  // Explicit modern target — esbuild 0.25+ can no longer down-level
  // destructuring to Vite's old default multi-browser target list.
  build: {
    target: "es2022",
  },
});
