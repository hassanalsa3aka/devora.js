import path from "node:path";
import { existsSync } from "node:fs";
import { writeFile, readFile } from "node:fs/promises";
import { resolveAuthChoice, scaffoldAppFiles } from "@devorajs/scaffold";

/**
 * Scaffolds a new app and registers it in devora.config.ts — the shared
 * implementation behind both `devora new <name>` (original name) and
 * `devora add <name>` (friendlier alias, same action, added alongside it
 * rather than replacing it so existing docs/scripts using `new` keep
 * working).
 *
 * The per-app file template itself (`entry-server.tsx`, `vercel.json`,
 * `routes/`, etc.) now lives once in `@devorajs/scaffold`'s `scaffoldAppFiles`
 * — shared with `create-devora` (the standalone `npx create-devora`
 * installer, which scaffolds a brand-new project from an empty directory,
 * before any `devora.config.ts` exists to register an app *into*). Only
 * imports `resolveAuthChoice`/`scaffoldAppFiles` from that package, not its
 * `scaffoldProjectFiles` (create-devora-only, root-level project
 * scaffolding) — deliberately, so esbuild tree-shakes that module (and its
 * `__dirname`-relative asset-copying, meaningless once bundled into this
 * CLI's own `dist/index.js`) out of this bundle entirely. Regression-tested
 * against the pre-refactor output: scaffolded a real app with the old,
 * inline version of this file, saved its output, then re-scaffolded the
 * same app after this refactor and diffed byte-for-byte — identical.
 */
export async function scaffoldApp(appName: string, opts: { domain?: string; auth?: string }): Promise<void> {
  const root = process.cwd();
  const appDir = path.join(root, "apps", appName);

  if (existsSync(appDir)) {
    console.error(`[devora] apps/${appName} already exists`);
    process.exit(1);
  }

  const authMode = await resolveAuthChoice(opts.auth, appName);

  // "*" — inside this monorepo, @devorajs/core is a sibling workspace
  // package, not an ordinary published npm dependency. See
  // ScaffoldAppOptions's doc comment in @devorajs/scaffold for the contrast
  // with create-devora, which passes a real pinned version here instead.
  await scaffoldAppFiles(appDir, appName, { authMode, coreVersion: "*" });

  const configPath = path.join(root, "devora.config.ts");
  if (existsSync(configPath)) {
    const original = await readFile(configPath, "utf-8");
    const domain = opts.domain ?? `${appName}.example.com`;
    // Written explicitly regardless of value (even "shared", the project's
    // usual default) — the whole point of asking per-app is that it must be
    // unambiguous which apps have sessions enabled just by reading this
    // file, not implied by omission matching whatever the project default
    // happens to be today.
    const insertion = `    { name: "${appName}", dir: "apps/${appName}", domain: "${domain}", auth: "${authMode}" },\n  ],`;
    const updated = original.replace(/\n\s*\],/, `\n${insertion}`);
    if (updated !== original) {
      await writeFile(configPath, updated);
      console.log(`[devora] registered "${appName}" in devora.config.ts (domain: ${domain})`);
    } else {
      console.log(
        `[devora] scaffolded apps/${appName} — could not auto-edit devora.config.ts, add it manually`
      );
    }
  }

  console.log(`[devora] created apps/${appName}`);
  console.log(`[devora] run "pnpm install" (or npm/yarn) to link its dependencies, then "devora dev --app=${appName}"`);
}

/** Original command name — kept working, unchanged, alongside `add`. */
export const newApp = scaffoldApp;
