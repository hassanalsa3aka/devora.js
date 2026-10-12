import { loadProjectConfig } from "@devorajs/core/config-loader";
import { buildAppForAdapter } from "../build/buildForAdapter.js";
import { PreflightError } from "../build/preflight.js";

export async function build(opts: { app?: string; adapter?: string; out?: string }) {
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

  // --out names ONE app's Build Output directory (the Vercel project's
  // `.vercel/output` when its Root Directory isn't the app) — N apps can't
  // share one, and only the Vercel adapter has a relocatable output.
  if (opts.out !== undefined) {
    if (opts.adapter !== "vercel") {
      console.error(`[devora] --out only applies to --adapter=vercel (Netlify reads the output path from the app's netlify.toml)`);
      process.exit(1);
    }
    if (apps.length !== 1) {
      console.error(`[devora] --out needs exactly one app — add --app=<name> (each app is its own Vercel project)`);
      process.exit(1);
    }
  }

  for (const app of apps) {
    try {
      await buildAppForAdapter(root, project, app, opts.adapter, { out: opts.out });
    } catch (err) {
      // Preflight already printed why; anything else (a prebuild exit, a
      // Vite error) gets its message printed once, without a stack trace
      // for the expected cases.
      console.error(err instanceof PreflightError ? err.message : err);
      process.exit(1);
    }
  }
}
