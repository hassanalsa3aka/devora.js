import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * Node majors Vercel Functions currently accept, newest first (checked
 * against https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
 * on 2026-10-12: 24.x default, 22.x available; 20.x discontinued — the
 * hardcoded `nodejs20.x` this adapter used to write is exactly what started
 * failing real deploys with "depends on nodejs20.x, which is discontinued").
 * Update this list when Vercel adds or drops a major; until then an explicit
 * `vercel.runtime` in app.config.ts is the escape hatch for a newer one.
 */
export const VERCEL_SUPPORTED_NODE_MAJORS = [24, 22] as const;
export const VERCEL_DEFAULT_NODE_MAJOR = 24;

export interface ResolvedVercelRuntime {
  /** e.g. "nodejs22.x" — what goes into `.vc-config.json`. */
  runtime: string;
  /** Human-readable reason, printed by the build so the choice is never silent. */
  source: string;
  /** Non-fatal problems worth printing (an override Vercel may not know). */
  warnings: string[];
  /** Fatal: no supported runtime can satisfy the project's constraints. */
  error?: string;
}

/**
 * Picks the `.vc-config.json` runtime, in this order:
 * 1. an explicit override (`vercel: { runtime }` in app.config.ts) — used as
 *    given, with a warning if it isn't a major this adapter knows about;
 * 2. the Node major running the build, if Vercel supports it and it satisfies
 *    `engines.node` — on Vercel's own build image this *is* the version the
 *    project selected, so build and runtime Node match;
 * 3. the newest supported major that satisfies `engines.node` — the same
 *    mapping Vercel documents (`>=22.0.0` → latest 24.x);
 * 4. no `engines.node` at all: the newest supported major (Vercel's default).
 * An `engines.node` range no supported major satisfies (e.g. `20.x`) is a
 * build error, not a silent pick — the deploy would fail anyway.
 */
export function resolveVercelRuntime(input: {
  override?: string | number;
  enginesNode?: string;
  /** e.g. process.versions.node */
  runningNodeVersion: string;
}): ResolvedVercelRuntime {
  const supportedList = VERCEL_SUPPORTED_NODE_MAJORS.map((m) => `nodejs${m}.x`).join(", ");

  if (input.override !== undefined) {
    const runtime = typeof input.override === "number" ? `nodejs${input.override}.x` : input.override.trim();
    const match = /^nodejs(\d+)\.x$/.exec(runtime);
    if (!match) {
      return {
        runtime,
        source: "app.config.ts vercel.runtime",
        warnings: [],
        error: `vercel.runtime "${runtime}" is not a Vercel Node runtime name (expected e.g. "nodejs22.x").`,
      };
    }
    const major = Number(match[1]);
    const warnings = (VERCEL_SUPPORTED_NODE_MAJORS as readonly number[]).includes(major)
      ? []
      : [
          `vercel.runtime "${runtime}" isn't one this adapter knows Vercel supports (${supportedList}) — ` +
            `using it as given; Vercel will reject the deploy if it doesn't accept it.`,
        ];
    return { runtime, source: "app.config.ts vercel.runtime", warnings };
  }

  const range = input.enginesNode?.trim() ? parseRange(input.enginesNode) : undefined;
  if (input.enginesNode?.trim() && !range) {
    // Unparseable — don't guess what it meant; fall back as if absent, loudly.
    const fallback = pickWithoutEngines(input.runningNodeVersion);
    return {
      ...fallback,
      warnings: [`couldn't parse engines.node "${input.enginesNode}" — ignoring it.`],
    };
  }
  if (!range) return { ...pickWithoutEngines(input.runningNodeVersion), warnings: [] };

  const runningMajor = Number(input.runningNodeVersion.split(".")[0]);
  if ((VERCEL_SUPPORTED_NODE_MAJORS as readonly number[]).includes(runningMajor) && rangeAllowsMajor(range, runningMajor)) {
    return {
      runtime: `nodejs${runningMajor}.x`,
      source: `the running Node ${runningMajor} (satisfies engines.node "${input.enginesNode}")`,
      warnings: [],
    };
  }
  for (const major of VERCEL_SUPPORTED_NODE_MAJORS) {
    if (rangeAllowsMajor(range, major)) {
      return { runtime: `nodejs${major}.x`, source: `engines.node "${input.enginesNode}"`, warnings: [] };
    }
  }
  return {
    runtime: "",
    source: `engines.node "${input.enginesNode}"`,
    warnings: [],
    error:
      `engines.node "${input.enginesNode}" allows no Node version Vercel supports (${supportedList}). ` +
      `Widen engines.node, or set vercel: { runtime: "nodejs${VERCEL_DEFAULT_NODE_MAJOR}.x" } in app.config.ts.`,
  };
}

function pickWithoutEngines(runningNodeVersion: string): Omit<ResolvedVercelRuntime, "warnings"> {
  const runningMajor = Number(runningNodeVersion.split(".")[0]);
  if ((VERCEL_SUPPORTED_NODE_MAJORS as readonly number[]).includes(runningMajor)) {
    return { runtime: `nodejs${runningMajor}.x`, source: `the running Node ${runningMajor}` };
  }
  return {
    runtime: `nodejs${VERCEL_DEFAULT_NODE_MAJOR}.x`,
    source: `Vercel's default (the running Node ${runningMajor} isn't a Vercel runtime)`,
  };
}

/**
 * `engines.node` from the app's own package.json first (what Vercel reads
 * when the project's Root Directory is the app), then the project root's.
 */
export function readEnginesNode(appRoot: string, projectRoot: string): string | undefined {
  for (const dir of [appRoot, projectRoot]) {
    const pkgPath = path.join(dir, "package.json");
    if (!existsSync(pkgPath)) continue;
    try {
      const engines = (JSON.parse(readFileSync(pkgPath, "utf-8")) as { engines?: { node?: unknown } }).engines;
      if (typeof engines?.node === "string") return engines.node;
    } catch {
      // A broken package.json fails the install long before this matters.
    }
  }
  return undefined;
}

// --- A deliberately small semver-range reader (no dependency for this) ---
// Only answers "does this range admit *some* version with major M", which
// is all runtime selection needs. Supports the forms people actually write
// in engines.node: `>=22`, `^22.11.0`, `~22.1`, `22.x`, `22`, `22.*`, `*`,
// `>=20 <25`, `20 - 24`, and `||` alternatives.

type Version = [number, number, number];
interface Interval {
  lo: Version;
  loInclusive: boolean;
  hi?: Version; // undefined = unbounded
  hiInclusive: boolean;
}
type Range = Interval[][]; // OR of ANDs

const ZERO: Version = [0, 0, 0];

function cmp(a: Version, b: Version): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/** Parses "22", "22.1", "22.x", "v22.1.3" into [version, number of given parts]. */
function parsePartial(raw: string): { v: Version; parts: number } | undefined {
  const s = raw.replace(/^v/, "");
  if (s === "*" || s === "x" || s === "X") return { v: ZERO, parts: 0 };
  const pieces = s.split(".");
  if (pieces.length > 3) return undefined;
  const nums: number[] = [];
  for (const p of pieces) {
    if (p === "x" || p === "X" || p === "*") break;
    if (!/^\d+$/.test(p)) return undefined;
    nums.push(Number(p));
  }
  return { v: [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0], parts: nums.length };
}

/** The exclusive upper bound of a partial version ("22" → 23.0.0, "22.1" → 22.2.0). */
function bumpPartial(v: Version, parts: number): Version | undefined {
  if (parts === 0) return undefined;
  if (parts === 1) return [v[0] + 1, 0, 0];
  if (parts === 2) return [v[0], v[1] + 1, 0];
  return v;
}

function parseComparator(token: string): Interval | undefined {
  const m = /^(>=|<=|>|<|=|\^|~)?(.+)$/.exec(token);
  if (!m) return undefined;
  const op = m[1] ?? "";
  const partial = parsePartial(m[2]!);
  if (!partial) return undefined;
  const { v, parts } = partial;
  switch (op) {
    case ">=":
      return { lo: v, loInclusive: true, hiInclusive: false };
    case ">": {
      const bumped = bumpPartial(v, parts);
      return parts === 3 ? { lo: v, loInclusive: false, hiInclusive: false } : { lo: bumped ?? ZERO, loInclusive: true, hiInclusive: false };
    }
    case "<":
      return { lo: ZERO, loInclusive: true, hi: v, hiInclusive: false };
    case "<=": {
      const bumped = bumpPartial(v, parts);
      return parts === 3 ? { lo: ZERO, loInclusive: true, hi: v, hiInclusive: true } : { lo: ZERO, loInclusive: true, hi: bumped, hiInclusive: false };
    }
    case "^":
      return { lo: v, loInclusive: true, hi: v[0] > 0 || parts <= 1 ? [v[0] + 1, 0, 0] : [0, v[1] + 1, 0], hiInclusive: false };
    case "~":
      return { lo: v, loInclusive: true, hi: parts <= 1 ? [v[0] + 1, 0, 0] : [v[0], v[1] + 1, 0], hiInclusive: false };
    default: {
      // "=", or a bare (possibly partial) version: an exact version, or an x-range.
      if (parts === 3) return { lo: v, loInclusive: true, hi: v, hiInclusive: true };
      return { lo: v, loInclusive: true, hi: bumpPartial(v, parts), hiInclusive: false };
    }
  }
}

export function parseRange(raw: string): Range | undefined {
  const alternatives = raw.split("||").map((s) => s.trim());
  const range: Range = [];
  for (const alt of alternatives) {
    if (alt === "") return undefined;
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(alt);
    const tokens = hyphen
      ? [`>=${hyphen[1]}`, `<=${hyphen[2]}`]
      : alt.replace(/(>=|<=|>|<|=|\^|~)\s+/g, "$1").split(/\s+/);
    const set: Interval[] = [];
    for (const t of tokens) {
      const interval = parseComparator(t);
      if (!interval) return undefined;
      set.push(interval);
    }
    range.push(set);
  }
  return range;
}

/** True if the range admits at least one version M.y.z. */
export function rangeAllowsMajor(range: Range, major: number): boolean {
  return range.some((set) => {
    let lo: Version = [major, 0, 0];
    let loInclusive = true;
    let hi: Version | undefined = [major + 1, 0, 0];
    let hiInclusive = false;
    for (const iv of set) {
      const c = cmp(iv.lo, lo);
      if (c > 0 || (c === 0 && !iv.loInclusive)) {
        lo = iv.lo;
        loInclusive = iv.loInclusive;
      }
      if (iv.hi) {
        const d = hi ? cmp(iv.hi, hi) : -1;
        if (d < 0 || (d === 0 && !iv.hiInclusive)) {
          hi = iv.hi;
          hiInclusive = iv.hiInclusive;
        }
      }
    }
    if (!hi) return true;
    const c = cmp(lo, hi);
    return c < 0 || (c === 0 && loInclusive && hiInclusive);
  });
}
