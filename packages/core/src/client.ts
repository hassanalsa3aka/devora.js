/**
 * Browser-safe subpath (`@devorajs/core/client`), deliberately separate from
 * the main `@devorajs/core` entry — same reasoning `./config-loader` already
 * exists for (see configLoader.ts's doc comment), a different concrete
 * failure mode. The main barrel's `export *` chain reaches modules using
 * real Node builtins (`session.ts`/`csrf.ts` use `node:crypto`,
 * `prodRequestHandler.ts`/`router.ts` use `node:fs`/`node:http`, etc.) —
 * completely fine for every *SSR* route file (Node context, only ever built
 * by buildAppServer.ts), but a `renderMode: "csr"` route is ALSO built for
 * the browser (buildAppClient.ts) — real, hit-in-practice failure, not
 * theoretical: `apps/dashboard/routes/csr-demo.tsx` importing `PageShell`
 * from the main barrel broke the client build outright
 * (`"randomBytes" is not exported by "__vite-browser-external"`, from
 * `csrf.ts`'s `node:crypto` import, reached transitively through the
 * barrel's `export *` even though the csr route never calls it) — found by
 * actually running `devora build`, not anticipated in advance. A `csr`
 * route (or any island component) that needs branding/theme should import
 * from here instead of the main entry.
 */
export * from "./theme.js";
export * from "./branding.js";
