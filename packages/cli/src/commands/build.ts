import { loadProjectConfig } from "@devorajs/core/config-loader";
import { buildAppForAdapter } from "../build/buildForAdapter.js";

export async function build(opts: { app?: string; adapter?: string }) {
  // `devora build` always means "build for production" — never rely on the
  // invoking shell/CI environment to remember this (explicit over implicit,
  // §2.2). Without it, Vite's SSR build silently resolves `isProduction:
  // false` and `@vitejs/plugin-react` emits the *dev* JSX runtime (`jsxDEV`,
  // from `react/jsx-dev-runtime`) instead of `jsx`/`jsxs` — which crashes at
  // request time with "jsxDEV is not a function", since react's own
  // production build deliberately leaves that export `undefined` (dev JSX is
  // not meant to run in production). Confirmed via a real Vercel deploy:
  // Vercel sets NODE_ENV=production for the function *runtime* but not
  // reliably for a custom `buildCommand`'s build step, so this had been
  // silently depending on a shell env var that was never actually
  // guaranteed to be there.
  process.env.NODE_ENV = "production";

  const root = process.cwd();
  const project = await loadProjectConfig(root);

  const apps = opts.app ? project.apps.filter((a) => a.name === opts.app) : project.apps;

  if (opts.app && apps.length === 0) {
    console.error(`[devora] no app named "${opts.app}" in devora.config.ts`);
    process.exit(1);
  }

  for (const app of apps) {
    await buildAppForAdapter(root, project, app, opts.adapter);
  }
}
