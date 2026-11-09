/**
 * The on-disk cache of the bundled browser dependencies. What makes it safe:
 *  - it lives in `<app>/node_modules/.devora/dev-server/v<format>/` and nowhere else (a node_modules that is a link to
 *    another folder disables it rather than writing through the link); only entries named by a 64-hex key are ever touched;
 *  - an entry is used only when its key matches: the key covers the cache format, the esbuild version, the exact list of
 *    dependencies, the lockfile, the version of every dependency, and, for a dependency that is a linked source folder, a
 *    fingerprint (path, size, modification time) of every file in it;
 *  - on load every file is checked against the SHA-256 recorded in the manifest, must be a plain file (never a link), must
 *    have a plain name, and the manifest must name exactly the dependencies asked for; anything else is a miss, not an error;
 *  - a cache of another format version is removed when a new one is first written.
 * Cached output is only ever sent to the browser; nothing in it is run by the server.
 */
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { lstat, mkdir, readFile, readdir, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const CACHE_FORMAT = 1;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_ENTRIES = 3;
const NAME = /^[\w.-]{1,120}\.js$/;
const KEY = /^[0-9a-f]{64}$/;
const LOCKFILES = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lockb", "npm-shrinkwrap.json"];

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const ownRequire = createRequire(import.meta.url);

export interface CachedDeps {
  files: Map<string, string>;
  cjs: Set<string>;
}

/** `<app>/node_modules/.devora/dev-server`, or undefined when writing there would leave the app folder. */
export async function resolveCacheRoot(appRoot: string): Promise<string | undefined> {
  try {
    const app = await realpath(appRoot);
    const modules = path.join(app, "node_modules");
    let real: string;
    try {
      real = await realpath(modules);
    } catch {
      await mkdir(modules, { recursive: true });
      real = await realpath(modules);
    }
    if (real !== modules && !real.startsWith(app + path.sep)) return undefined; // a link to somewhere else
    return path.join(real, ".devora", "dev-server");
  } catch {
    return undefined;
  }
}

async function findUp(start: string, names: string[]): Promise<string | undefined> {
  let dir = start;
  for (;;) {
    for (const n of names) {
      const candidate = path.join(dir, n);
      try {
        if ((await stat(candidate)).isFile()) return candidate;
      } catch {
        // keep looking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

async function packageDir(spec: string, from: string): Promise<string | undefined> {
  const parts = spec.split("/");
  const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
  let dir = from;
  for (;;) {
    const candidate = path.join(dir, "node_modules", name);
    try {
      if ((await stat(path.join(candidate, "package.json"))).isFile()) return await realpath(candidate);
    } catch {
      // keep looking
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** A fingerprint of a source folder (path, size, modification time of every file), for dependencies that are linked, not installed. */
async function treeSignature(dir: string): Promise<string> {
  const hash = createHash("sha256");
  let count = 0;
  const walk = async (current: string): Promise<void> => {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
      const full = path.join(current, e.name);
      if (e.isDirectory()) await walk(full);
      else if (count++ < 20000) {
        const info = await stat(full).catch(() => undefined);
        if (info) hash.update(`${path.relative(dir, full)}:${info.size}:${info.mtimeMs}\n`);
      }
    }
  };
  await walk(dir);
  return hash.digest("hex");
}

/** Everything that decides whether a cached bundle is still the bundle these dependencies would produce now. */
export async function computeCacheKey(appRoot: string, specifiers: string[]): Promise<string> {
  const app = await realpath(appRoot);
  const lock = await findUp(app, LOCKFILES);
  const lockHash = lock ? sha256(await readFile(lock)) : "no-lockfile";
  const esbuildVersion = (ownRequire("esbuild/package.json") as { version: string }).version;
  const entries = await Promise.all(
    [...specifiers].sort().map(async (spec) => {
      const dir = spec === "react-refresh/runtime" ? path.dirname(ownRequire.resolve("react-refresh/package.json")) : await packageDir(spec, app);
      if (!dir) return `${spec}=unresolved`;
      let version = "unknown";
      try {
        version = (JSON.parse(await readFile(path.join(dir, "package.json"), "utf8")) as { version?: string }).version ?? "unknown";
      } catch {
        // an unreadable package.json is part of the key as "unknown"
      }
      const linked = !dir.includes(`${path.sep}node_modules${path.sep}`);
      return `${spec}=${version}${linked ? `@source:${await treeSignature(dir)}` : ""}`;
    })
  );
  return sha256(JSON.stringify({ format: CACHE_FORMAT, esbuild: esbuildVersion, lock: lockHash, entries }));
}

/** A valid cached bundle for exactly these dependencies, or undefined (a miss is never an error). */
export async function readCache(root: string, key: string, specifiers: string[]): Promise<CachedDeps | undefined> {
  if (!KEY.test(key)) return undefined;
  const dir = path.join(root, `v${CACHE_FORMAT}`, key);
  try {
    const manifest = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8")) as { format?: number; key?: string; specifiers?: string[]; cjs?: string[]; files?: Record<string, string> };
    if (manifest.format !== CACHE_FORMAT || manifest.key !== key || !Array.isArray(manifest.specifiers) || !manifest.files || typeof manifest.files !== "object") return undefined;
    if (JSON.stringify([...manifest.specifiers].sort()) !== JSON.stringify([...specifiers].sort())) return undefined;
    const cjs = new Set<string>();
    for (const s of manifest.cjs ?? []) {
      if (!specifiers.includes(s)) return undefined;
      cjs.add(s);
    }
    const files = new Map<string, string>();
    for (const [name, expected] of Object.entries(manifest.files)) {
      if (!NAME.test(name) || typeof expected !== "string") return undefined;
      const file = path.join(dir, name);
      const info = await lstat(file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_FILE_BYTES) return undefined;
      const text = await readFile(file, "utf8");
      if (sha256(text) !== expected) return undefined;
      files.set(name, text);
    }
    if (files.size === 0) return undefined;
    return { files, cjs };
  } catch {
    return undefined;
  }
}

export async function writeCache(root: string, key: string, specifiers: string[], state: CachedDeps): Promise<void> {
  if (!KEY.test(key)) return;
  const versionDir = path.join(root, `v${CACHE_FORMAT}`);
  const tmp = path.join(versionDir, `.tmp-${process.pid}-${Date.now()}`);
  try {
    await mkdir(tmp, { recursive: true });
    const files: Record<string, string> = {};
    for (const [name, text] of state.files) {
      if (!NAME.test(name)) return; // never write a name that could leave the folder
      await writeFile(path.join(tmp, name), text);
      files[name] = sha256(text);
    }
    await writeFile(path.join(tmp, "manifest.json"), JSON.stringify({ format: CACHE_FORMAT, key, specifiers: [...specifiers].sort(), cjs: [...state.cjs], files }));
    const final = path.join(versionDir, key);
    await rm(final, { recursive: true, force: true });
    await rename(tmp, final);
    await prune(root, key);
  } catch {
    await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/** Keeps the newest few entries and removes caches of another format version. Only names this module creates are touched. */
async function prune(root: string, keep: string): Promise<void> {
  try {
    for (const e of await readdir(root, { withFileTypes: true })) {
      if (e.isDirectory() && /^v\d+$/.test(e.name) && e.name !== `v${CACHE_FORMAT}`) await rm(path.join(root, e.name), { recursive: true, force: true });
    }
    const versionDir = path.join(root, `v${CACHE_FORMAT}`);
    const entries = [];
    for (const e of await readdir(versionDir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (e.name.startsWith(".tmp-") || KEY.test(e.name)) entries.push({ name: e.name, time: (await stat(path.join(versionDir, e.name))).mtimeMs });
    }
    entries.sort((a, b) => b.time - a.time);
    for (const old of entries.slice(MAX_ENTRIES)) if (old.name !== keep) await rm(path.join(versionDir, old.name), { recursive: true, force: true });
  } catch {
    // pruning is best effort
  }
}
