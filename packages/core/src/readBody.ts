/**
 * Real, previously-undiscovered bug fixed here (Phase 4 security audit):
 * every place this framework reads a request body (API routes, dev and
 * prod; form-action submissions, dev and prod) did `for await (const chunk
 * of req) chunks.push(chunk)` with no `Content-Length` check and no byte
 * cap — unlike Express (100KB default) or Fastify (1MB default), there was
 * no limit at all. Verified end-to-end against a real, already-built app:
 * a 200MB POST body was fully buffered in memory (~486MB RSS) and answered
 * with a 200, for every `/api/*` route in every app. This is one shared,
 * size-limited reader for all four call sites (prodRequestHandler.ts's
 * `readRawBody`/`parseFormData`, ssrMiddleware.ts's `parseFormData`,
 * apiMiddleware.ts's `readBody`) instead of patching each copy separately —
 * a single chokepoint that can't drift out of sync with the others again.
 */
export const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB default — app.config.ts `maxBodyBytes` changes it

export class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`[devora] request body exceeds the ${maxBytes}-byte limit`);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Reads `req` into a single `Buffer`, never holding more than `maxBytes` —
 * a client can't force unbounded buffering by sending an oversized body or a
 * `Content-Length` lying about it (the cap is enforced on real bytes).
 *
 * How it stops matters for the client getting a 413 at all (round 3: a
 * browser uploading a too-large file got a connection reset, because the
 * socket was destroyed mid-upload before any response could be sent):
 * - a `Content-Length` over the limit is rejected before reading anything;
 *   Node discards the unread body after the response, so the 413 arrives;
 * - a body that overflows while streaming (chunked) stops being buffered and
 *   is discarded; only past twice the limit is the connection destroyed,
 *   so an endless upload still can't tie it up.
 */
export async function readBodyWithLimit(
  req: AsyncIterable<Buffer> & {
    destroy?: (error?: Error) => void;
    headers?: Record<string, string | string[] | undefined>;
  },
  maxBytes: number = MAX_BODY_BYTES
): Promise<Buffer> {
  const declared = Number(req.headers?.["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) throw new PayloadTooLargeError(maxBytes);

  const chunks: Buffer[] = [];
  let total = 0;
  let overflowed = false;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      overflowed = true;
      chunks.length = 0;
      if (total > maxBytes * 2) {
        req.destroy?.();
        break;
      }
      continue;
    }
    chunks.push(chunk);
  }
  if (overflowed) throw new PayloadTooLargeError(maxBytes);
  return Buffer.concat(chunks);
}

export class MalformedBodyError extends Error {
  constructor(message: string) {
    super(`[devora] ${message}`);
    this.name = "MalformedBodyError";
  }
}

/**
 * A page action's body as `FormData`: `multipart/form-data` (file uploads —
 * fields arrive as `File` objects) or URL-encoded. Multipart is parsed by
 * the platform's own `Response.formData()` (Node's fetch implementation), so
 * no dependency; the size cap was already applied while reading `body`.
 * Before this, every action body went through URLSearchParams, so a file
 * field arrived as null.
 */
export async function parseFormBody(body: Buffer, contentType: string | undefined): Promise<FormData> {
  if (contentType && /^multipart\/form-data\b/i.test(contentType)) {
    try {
      return await new Response(body as unknown as BodyInit, { headers: { "content-type": contentType } }).formData();
    } catch {
      throw new MalformedBodyError("malformed multipart/form-data body");
    }
  }
  const formData = new FormData();
  // .forEach(), not for-of — @types/node's URLSearchParams and the DOM
  // lib's disagree on its iterator typing when both are in scope.
  new URLSearchParams(body.toString("utf-8")).forEach((value, key) => formData.append(key, value));
  return formData;
}
