/**
 * Matches `island(() => import("specifier"))`, tolerating a TypeScript
 * generic type argument (`island<Props>(() => import("specifier"))`) —
 * needed because build-time discovery reads raw, untransformed source
 * (types haven't been stripped yet).
 *
 * Shared by packages/cli's dev plugin (islandsPlugin.ts), its production
 * counterpart (islandsBuildPlugin.ts), and build-time discovery
 * (discoverIslandFiles.ts) specifically so they can't drift apart — they
 * used to each define their own copy, and that's exactly how a real bug
 * happened: discovery's copy didn't handle the generic-argument case, so
 * it silently found zero islands for a route using `island<Props>(...)`
 * even though the dev plugin (whose copy happened to work, because Vite's
 * react plugin strips TS types before its transform runs) rendered fine.
 * One shared source of truth now instead of three that can disagree.
 */
export const ISLAND_CALL_RE =
  /\bisland(?:<[^>]*>)?\(\s*\(\)\s*=>\s*import\(\s*(['"])((?:(?!\1).)+)\1\s*\)\s*\)/g;
