# packages/core dependency justifications

Every dependency added to `packages/core` must be listed here with a one-line reason (see architecture doc §7).

- **jiti** — lets the CLI load `devora.config.ts` and `app.config.ts` (TypeScript) at runtime in Node without a separate build step; no dynamic `eval`/`Function()` usage, it transpiles-then-requires from disk only.
- **react** — `islandComponent.tsx` (ROADMAP.md #3) must be a real component usable directly in route JSX, not just types, so a runtime dependency is unavoidable here specifically. Every app already depends on the same `^18.3.0` range, and pnpm dedupes matching semver ranges to one install, so this doesn't introduce a second React instance in practice.
