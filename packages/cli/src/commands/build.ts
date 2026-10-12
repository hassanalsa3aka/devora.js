import { loadProjectConfig } from "@devorajs/core/config-loader";
import { buildAppForAdapter } from "../build/buildForAdapter.js";
import { PreflightError } from "../build/preflight.js";
import { forceProductionNodeEnv } from "../build/productionEnv.js";
import { isDevoraError } from "../build/devoraError.js";
import { loadProjectEnv } from "../build/loadEnvFiles.js";

/** Values `--adapter` accepts. adapter-node needs no flag: plain `devora build`, then `devora start`. */
export const BUILD_ADAPTERS = ["vercel", "netlify"] as const;

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
  forceProductionNodeEnv("build");

  // Round 3: an unknown value (e.g. --adapter=node) used to be silently
  // ignored — the build "succeeded" without the output the caller asked for.
  if (opts.adapter !== undefined && !(BUILD_ADAPTERS as readonly string[]).includes(opts.adapter)) {
    console.error(
      `[devora] unknown --adapter "${opts.adapter}" — use ${BUILD_ADAPTERS.join(" or ")}. ` +
        `For a Node server (adapter-node), leave --adapter off: \`devora build\`, then \`devora start\`.`
    );
    process.exit(1);
  }

  const root = process.cwd();
  loadProjectEnv(root, "production");
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
      // Preflight already printed why; a framework-authored error (config
      // validation, a prebuild exit — all prefixed "[devora]") is printed as
      // its message alone; anything else (a Vite error) keeps its stack.
      console.error(err instanceof PreflightError || isDevoraError(err) ? (err as Error).message : err);
      process.exit(1);
    }
  }
}
