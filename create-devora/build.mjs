import { chmod, cp, rm } from "node:fs/promises";
import * as esbuild from "esbuild";

/**
 * Same technique `packages/cli/build.mjs` already uses (see that file's own
 * doc comment for the full reasoning) — bundles `@devora/scaffold` (a
 * workspace-local package, unresolvable as raw `.ts` outside this monorepo)
 * inline via esbuild, no real npm runtime dependencies to keep external at
 * all (everything this package needs — readline/promises, fs/promises,
 * path, child_process — is a Node builtin).
 *
 * One extra step `packages/cli`'s build doesn't need: `@devora/scaffold`'s
 * `scaffoldProjectFiles` reads two small asset directories at runtime
 * (`templates/tsconfig.base.json`, `assets/icons/*.png`) via a path relative
 * to its own module location. Once bundled, that relative lookup resolves
 * against *this* package's `dist/index.js`, not the original `packages/
 * scaffold/src/` — so those two directories are physically copied to this
 * package's own root (one level up from `dist/`), making the published
 * package self-contained instead of reaching into a monorepo layout that
 * won't exist wherever this actually gets installed.
 */
await rm("templates", { recursive: true, force: true });
await rm("assets", { recursive: true, force: true });
await cp("../packages/scaffold/templates", "templates", { recursive: true });
await cp("../packages/scaffold/assets", "assets", { recursive: true });

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  external: [],
  logLevel: "info",
});

// esbuild doesn't set the executable bit, and a package's `bin` entry needs
// it set on the target for direct invocation (and pnpm's `.bin` symlink) to
// work — identical fix packages/cli/build.mjs already applies.
await chmod("dist/index.js", 0o755);

console.log("[build] templates/ and assets/ copied from packages/scaffold alongside dist/index.js.");
