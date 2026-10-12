/**
 * Matches `island(() => import("specifier"))`, tolerating a TypeScript
 * generic type argument (`island<Props>(() => import("specifier"))`) —
 * needed because build-time discovery reads raw, untransformed source
 * (types haven't been stripped yet).
 *
 * No longer used by the framework itself since round 3 — the dev and build
 * plugins find island() calls with the parser instead (packages/cli's
 * islandCalls.ts), in every module rather than route files only. Kept
 * exported for code that used it. History: it was shared by the dev plugin,
 * the build plugin and build-time discovery specifically so they can't drift apart — they
 * used to each define their own copy, and that's exactly how a real bug
 * happened: discovery's copy didn't handle the generic-argument case, so
 * it silently found zero islands for a route using `island<Props>(...)`
 * even though the dev plugin (whose copy happened to work, because Vite's
 * react plugin strips TS types before its transform runs) rendered fine.
 * One shared source of truth now instead of three that can disagree.
 */
export const ISLAND_CALL_RE =
  /\bisland(?:<[^>]*>)?\(\s*\(\)\s*=>\s*import\(\s*(['"])((?:(?!\1).)+)\1\s*\)\s*\)/g;
