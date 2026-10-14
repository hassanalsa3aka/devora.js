import adapter from "@sveltejs/adapter-node";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

// SvelteKit 3 takes its config through the Vite plugin: the official Node
// adapter, otherwise defaults. paths.origin is the app's public origin; on
// plain HTTP without it, adapter-node assumes https and rejects every form
// POST as cross-site. The harness sets ORIGIN for the build.
export default defineConfig({
  plugins: [sveltekit({ adapter: adapter(), paths: { origin: process.env.ORIGIN } })],
});
