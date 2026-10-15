/**
 * Serving files that never change while the server runs: the built client
 * assets, the public folder, and pre-rendered (ssg) HTML.
 *
 * What the request path used to do per request: walk the routes folder, read
 * the file from disk, set headers from scratch, send the whole body with no
 * validators. What it does now: look the file up in a Map (filled lazily,
 * first request per file), answer from memory with a strong ETag, honor
 * `If-None-Match` with a 304, and send a gzip/brotli variant (made once, then
 * kept) when the client accepts one.
 *
 * Nothing here widens what can be read: a path is only looked up after it
 * resolves inside the root folder, and only real files are cached.
 */
import path from "node:path";
import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { brotliCompress, gzip, constants as zlibConstants } from "node:zlib";
import type { IncomingMessage, ServerResponse } from "node:http";

export const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
};

export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/** Types worth compressing; images/fonts/video are already compressed. */
function isCompressible(type: string): boolean {
  return (
    type.startsWith("text/") ||
    type.startsWith("application/javascript") ||
    type.startsWith("application/json") ||
    type.startsWith("application/xml") ||
    type.startsWith("application/manifest+json") ||
    type.startsWith("image/svg+xml")
  );
}

/** Below this a compressed body saves nothing worth the CPU. */
const MIN_COMPRESS_BYTES = 1024;
/** Larger files are streamed from disk instead of held in memory. */
const MAX_MEMORY_BYTES = 2 * 1024 * 1024;

export interface StaticBody {
  body: Buffer;
  type: string;
  etag: string;
  cacheControl: string;
  /** Lazily built, memoized compressed forms. */
  br?: Promise<Buffer>;
  gz?: Promise<Buffer>;
}

export function makeStaticBody(body: Buffer, type: string, cacheControl: string): StaticBody {
  const etag = `"${createHash("sha1").update(body).digest("base64url").slice(0, 22)}"`;
  return { body, type, etag, cacheControl };
}

function acceptsEncoding(header: string | string[] | undefined, name: string): boolean {
  if (!header) return false;
  const value = Array.isArray(header) ? header.join(",") : header;
  for (const part of value.split(",")) {
    const [token, ...params] = part.trim().split(";");
    if (token!.trim().toLowerCase() !== name) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    return q === undefined || Number(q.slice(2)) > 0;
  }
  return false;
}

function matchesEtag(ifNoneMatch: string | string[] | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const value = Array.isArray(ifNoneMatch) ? ifNoneMatch.join(",") : ifNoneMatch;
  if (value.trim() === "*") return true;
  const bare = etag.replace(/^W\//, "");
  return value.split(",").some((candidate) => candidate.trim().replace(/^W\//, "") === bare);
}

function compress(entry: StaticBody, kind: "br" | "gz"): Promise<Buffer> {
  const existing = entry[kind];
  if (existing) return existing;
  const made = new Promise<Buffer>((resolve, reject) => {
    if (kind === "br") {
      brotliCompress(
        entry.body,
        { params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5, [zlibConstants.BROTLI_PARAM_SIZE_HINT]: entry.body.length } },
        (err, out) => (err ? reject(err) : resolve(out))
      );
    } else {
      gzip(entry.body, { level: 6 }, (err, out) => (err ? reject(err) : resolve(out)));
    }
  });
  entry[kind] = made;
  return made;
}

/**
 * Sends a cached body: GET → 200 with `Content-Length`; HEAD → the same
 * headers, no body; a matching `If-None-Match` → 304. The caller has already
 * checked the method is GET or HEAD.
 */
export async function sendStaticBody(req: IncomingMessage, res: ServerResponse, entry: StaticBody): Promise<void> {
  let body = entry.body;
  let etag = entry.etag;
  let encoding: "br" | "gzip" | undefined;
  const compressible = isCompressible(entry.type) && entry.body.length >= MIN_COMPRESS_BYTES;
  if (compressible) {
    res.setHeader("Vary", "Accept-Encoding");
    const accept = req.headers["accept-encoding"];
    if (acceptsEncoding(accept, "br")) {
      encoding = "br";
      etag = entry.etag.slice(0, -1) + '-br"';
    } else if (acceptsEncoding(accept, "gzip")) {
      encoding = "gzip";
      etag = entry.etag.slice(0, -1) + '-gz"';
    }
  }
  res.setHeader("Content-Type", entry.type);
  res.setHeader("Cache-Control", entry.cacheControl);
  res.setHeader("ETag", etag);
  if (matchesEtag(req.headers["if-none-match"], etag)) {
    res.statusCode = 304;
    res.end();
    return;
  }
  if (encoding) {
    body = await compress(entry, encoding === "br" ? "br" : "gz");
    res.setHeader("Content-Encoding", encoding);
  }
  res.statusCode = 200;
  res.setHeader("Content-Length", body.length);
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(body);
}

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
export const PUBLIC_FILE_CACHE = "public, max-age=3600";
/** Pre-rendered HTML: always revalidated (cheap with the ETag), never stale after a deploy. */
export const HTML_CACHE = "public, max-age=0, must-revalidate";

/**
 * A folder of built files, served by URL path. Lookups are memoized: the
 * first request for a file stats and reads it, later ones are a Map hit.
 * A path that is not a file is never cached, so a file that appears later
 * (a rebuild into a running server) is still found.
 */
export function createStaticFileServer(rootDir: string) {
  const root = path.resolve(rootDir);
  const cache = new Map<string, StaticBody | { file: string; size: number; type: string; etag: string; cacheControl: string }>();

  function resolveInside(pathname: string): string | undefined {
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      return undefined;
    }
    if (decoded.includes("\0") || decoded.includes("\\")) return undefined;
    const filePath = path.resolve(root, "." + decoded);
    if (!filePath.startsWith(root + path.sep)) return undefined;
    return filePath;
  }

  /** Returns true if a file answered the request (including 304/405). */
  return async function serve(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    immutable: boolean
  ): Promise<boolean> {
    const filePath = resolveInside(pathname);
    if (!filePath) return false;

    let entry = cache.get(filePath);
    if (!entry) {
      let stat;
      try {
        stat = statSync(filePath);
      } catch {
        return false;
      }
      if (!stat.isFile()) return false;
      const type = contentTypeFor(filePath);
      const cacheControl = immutable ? IMMUTABLE_CACHE : PUBLIC_FILE_CACHE;
      if (stat.size <= MAX_MEMORY_BYTES) {
        entry = makeStaticBody(await readFile(filePath), type, cacheControl);
      } else {
        const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
        entry = { file: filePath, size: stat.size, type, etag, cacheControl };
      }
      cache.set(filePath, entry);
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.end("Method Not Allowed");
      return true;
    }

    if ("body" in entry) {
      await sendStaticBody(req, res, entry);
      return true;
    }

    // Large file: stream it with its real length.
    res.setHeader("Content-Type", entry.type);
    res.setHeader("Cache-Control", entry.cacheControl);
    res.setHeader("ETag", entry.etag);
    if (matchesEtag(req.headers["if-none-match"], entry.etag)) {
      res.statusCode = 304;
      res.end();
      return true;
    }
    res.statusCode = 200;
    res.setHeader("Content-Length", entry.size);
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    await new Promise<void>((resolve) => {
      const stream = createReadStream(entry.file);
      stream.on("error", () => {
        res.destroy();
        resolve();
      });
      res.on("close", () => {
        stream.destroy();
        resolve();
      });
      stream.pipe(res);
      stream.on("end", resolve);
    });
    return true;
  };
}
