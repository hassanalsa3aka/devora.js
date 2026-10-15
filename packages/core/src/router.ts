import fs from "node:fs";
import path from "node:path";

const ROUTE_EXTENSIONS = new Set([".tsx", ".ts"]);

/** What a matched route's dynamic segments captured: `[id]` gives a string,
 * `[...slug]` and `[[...slug]]` give a string[] (empty for an optional
 * catch-all matching nothing). */
export type RouteParams = Record<string, string | string[]>;

export interface RouteMatch {
  filePath: string;
  /** The concrete requested path (e.g. "/users/123" for a `[id].tsx` file,
   * not the file's own pattern) — what isr caching and logs should key on. */
  routePath: string;
  /** Values captured from the file's `[param]`, `[...rest]` and
   * `[[...rest]]` segments — empty for a route with none. */
  params: RouteParams;
}

type Segment =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string }
  | { kind: "catchAll"; name: string }
  | { kind: "optionalCatchAll"; name: string };

interface RouteEntry {
  filePath: string;
  segments: Segment[];
  /** The file's own pattern ("/docs/[...slug]"), for messages. */
  pattern: string;
}

/** A route table built once: use it where the route files can't change
 * (production), and `matchRoute` where they can (dev). */
export interface RouteTable {
  entries: RouteEntry[];
}

// Specificity of a segment kind, higher wins at the same position.
const RANK: Record<Segment["kind"], number> = { static: 3, param: 2, catchAll: 1, optionalCatchAll: 0 };

/**
 * File-based route matching (see architecture doc §4).
 *
 * Segments of a route file's path:
 *   - `about`          a static segment
 *   - `[id]`           matches exactly one URL segment; `params.id` is a string
 *   - `[...slug]`      matches one or more; `params.slug` is a string[]
 *   - `[[...slug]]`    matches zero or more; `params.slug` is a string[]
 *
 * A catch-all must be the last segment of its path (a *folder* named
 * `[...slug]` is an error). When several files could match one URL, the most
 * specific wins, compared segment by segment from the left: static, then
 * `[param]`, then `[...catchAll]`, then `[[...optional]]` — so `users/new.tsx`
 * beats `users/[id].tsx` beats `users/[...rest].tsx`. Two files with the same
 * shape (`[id].tsx` and `[slug].tsx` in one folder) are an error that names
 * both, rather than a pick by scan order.
 *
 * A URL is refused (no match, so a 404) if any segment is empty, fails to
 * percent-decode, decodes to something containing `/`, `\` or NUL, or is `.`
 * or `..` — so no parameter, catch-all included, can carry a path traversal.
 * Each segment is decoded exactly once.
 */
export function matchRoute(routesDir: string, urlPath: string): RouteMatch | null {
  return matchInTable(buildRouteTable(routesDir), urlPath);
}

/** Scans `routesDir` and validates its routes (see `matchRoute`'s rules). */
export function buildRouteTable(routesDir: string): RouteTable {
  const entries: RouteEntry[] = collectRouteFiles(routesDir).map((filePath) => {
    const segments = fileToRouteSegments(routesDir, filePath).map(parseSegment);
    return { filePath, segments, pattern: fileToRoutePath(routesDir, filePath) };
  });

  for (const entry of entries) {
    const rest = entry.segments.findIndex((s) => s.kind === "catchAll" || s.kind === "optionalCatchAll");
    if (rest !== -1 && rest !== entry.segments.length - 1) {
      throw new Error(
        `[devora] ${entry.filePath}: a catch-all segment must be the last part of the route ` +
          `(found ${JSON.stringify(entry.pattern)}). Move the files that sit under it elsewhere.`
      );
    }
  }

  const seen = new Map<string, RouteEntry>();
  for (const entry of entries) {
    const shape = entry.segments.map((s) => (s.kind === "static" ? `s:${s.value}` : s.kind)).join("/");
    const other = seen.get(shape);
    if (other) {
      throw new Error(
        `[devora] two routes match the same URLs: ${other.filePath} and ${entry.filePath} ` +
          `(both are ${JSON.stringify(entry.pattern)}-shaped). Rename or remove one.`
      );
    }
    seen.set(shape, entry);
  }
  return { entries };
}

export function matchInTable(table: RouteTable, urlPath: string): RouteMatch | null {
  const normalized = normalizePath(urlPath);
  const urlSegments = segmentsOf(normalized);
  const decoded: string[] = [];
  for (const raw of urlSegments) {
    const value = decodeSegment(raw);
    if (value === null) return null;
    decoded.push(value);
  }

  let best: { entry: RouteEntry; params: RouteParams } | null = null;
  for (const entry of table.entries) {
    const params = matchSegments(entry.segments, decoded);
    if (!params) continue;
    if (!best || moreSpecific(entry.segments, best.entry.segments)) best = { entry, params };
  }
  if (!best) return null;
  return { filePath: best.entry.filePath, routePath: normalized, params: best.params };
}

function matchSegments(route: Segment[], url: string[]): RouteParams | null {
  const params: RouteParams = {};
  for (let i = 0; i < route.length; i++) {
    const seg = route[i] as Segment;
    if (seg.kind === "catchAll" || seg.kind === "optionalCatchAll") {
      const rest = url.slice(i);
      if (seg.kind === "catchAll" && rest.length === 0) return null;
      params[seg.name] = rest;
      return params;
    }
    const value = url[i];
    if (value === undefined) return null;
    if (seg.kind === "static") {
      if (seg.value !== value) return null;
    } else {
      params[seg.name] = value;
    }
  }
  return url.length === route.length ? params : null;
}

/** True when `a` is more specific than `b`, comparing segment by segment. */
function moreSpecific(a: Segment[], b: Segment[]): boolean {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    // A missing segment (an optional catch-all matching nothing) loses.
    const ra = a[i] ? RANK[(a[i] as Segment).kind] : -1;
    const rb = b[i] ? RANK[(b[i] as Segment).kind] : -1;
    if (ra !== rb) return ra > rb;
  }
  return false;
}

/** Decodes one URL segment once; null if it can't be part of a route. */
function decodeSegment(raw: string): string | null {
  if (raw === "") return null;
  let value: string;
  try {
    value = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (value === "" || value === "." || value === ".." || /[\\/\0]/.test(value)) return null;
  return value;
}

function parseSegment(raw: string): Segment {
  let m = /^\[\[\.\.\.([^\[\]]+)\]\]$/.exec(raw);
  if (m) return { kind: "optionalCatchAll", name: m[1] as string };
  m = /^\[\.\.\.([^\[\]]+)\]$/.exec(raw);
  if (m) return { kind: "catchAll", name: m[1] as string };
  if (isDynamicSegment(raw)) return { kind: "param", name: paramName(raw) };
  return { kind: "static", value: raw };
}

/** All route paths under routesDir — used to generate sitemap.xml (§8).
 * A dynamic route (`[id].tsx`) has no single fixed URL, so its literal
 * pattern is never included here — see generateSitemapXml's own filter. */
export function listRoutePaths(routesDir: string): string[] {
  return collectRouteFiles(routesDir).map((filePath) => fileToRoutePath(routesDir, filePath));
}

/** All route file paths (absolute) under routesDir — used by the SSR build (ROADMAP.md #4). */
export function listRouteFiles(routesDir: string): string[] {
  return collectRouteFiles(routesDir);
}

/** The URL *pattern* a given route file corresponds to (e.g. "/users/[id]"
 * for a dynamic route) — used by the ssg/isr build step: a static route's
 * pattern IS its real path; a dynamic route's pattern is resolved to one or
 * more real paths via `resolveStaticRoutePath` + `getStaticParams`
 * (architecture-v2.md §3.6) instead. */
export function routeFileToPath(routesDir: string, filePath: string): string {
  return fileToRoutePath(routesDir, filePath);
}

/** True if any segment of this route file's path is a `[param]` — used to
 * decide whether ssg/isr needs `getStaticParams` (architecture-v2.md §3.6)
 * before pre-rendering it, since a dynamic route has no single fixed path. */
export function isDynamicRouteFile(routesDir: string, filePath: string): boolean {
  return fileToRouteSegments(routesDir, filePath).some(isDynamicSegment);
}

/**
 * Substitutes concrete param values into a dynamic route file's pattern —
 * e.g. `routes/users/[id].tsx` + `{ id: "1" }` → `/users/1`. Used by the
 * ssg/isr build step (buildAppStatic.ts) to compute the real path to write
 * each `getStaticParams()` entry under. Throws if `params` is missing a
 * value for one of the route's own dynamic segments — a mismatched
 * `getStaticParams()` return is a build-time mistake worth failing loudly
 * on, not silently writing a literal "undefined" segment into a path.
 */
export function resolveStaticRoutePath(
  routesDir: string,
  filePath: string,
  params: Record<string, string | string[]>
): string {
  const out: string[] = [];
  for (const segment of fileToRouteSegments(routesDir, filePath)) {
    const parsed = parseSegment(segment);
    if (parsed.kind === "static") {
      out.push(parsed.value);
      continue;
    }
    const value = params[parsed.name];
    if (value === undefined) {
      throw new Error(
        `[devora] getStaticParams() entry is missing "${parsed.name}" for dynamic route segment "${segment}"`
      );
    }
    const isRest = parsed.kind === "catchAll" || parsed.kind === "optionalCatchAll";
    if (isRest !== Array.isArray(value)) {
      throw new Error(
        `[devora] getStaticParams() "${parsed.name}" for "${segment}" must be ${isRest ? "a string[]" : "a string"}`
      );
    }
    const parts = Array.isArray(value) ? value : [value];
    if (parsed.kind === "catchAll" && parts.length === 0) {
      throw new Error(`[devora] getStaticParams() "${parsed.name}" for "${segment}" must have at least one segment`);
    }
    for (const part of parts) {
      if (typeof part !== "string" || part === "" || part === "." || part === ".." || /[\\/\0]/.test(part)) {
        throw new Error(
          `[devora] getStaticParams() "${parsed.name}" contains an unusable path segment ${JSON.stringify(part)} ` +
            `(empty, ".", "..", or containing a slash)`
        );
      }
      out.push(encodeURIComponent(part));
    }
  }
  return out.length === 0 ? "/" : "/" + out.join("/");
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]") && segment.length > 2;
}

function paramName(segment: string): string {
  return segment.replace(/^\[\[?(\.\.\.)?/, "").replace(/\]\]?$/, "");
}

function normalizePath(urlPath: string): string {
  if (urlPath === "" || urlPath === "/") return "/";
  return urlPath.replace(/\/+$/, "");
}

function segmentsOf(normalized: string): string[] {
  return normalized === "/" ? [] : normalized.slice(1).split("/");
}

function collectRouteFiles(routesDir: string): string[] {
  if (!fs.existsSync(routesDir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(routesDir, { withFileTypes: true })) {
    const full = path.join(routesDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full));
    } else if (ROUTE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function fileToRouteSegments(routesDir: string, filePath: string): string[] {
  const rel = path.relative(routesDir, filePath);
  const noExt = rel.slice(0, -path.extname(rel).length);
  const segments = noExt.split(path.sep);
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments;
}

function fileToRoutePath(routesDir: string, filePath: string): string {
  const segments = fileToRouteSegments(routesDir, filePath);
  return segments.length === 0 ? "/" : "/" + segments.join("/");
}
