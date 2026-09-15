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
export const MAX_BODY_BYTES = 10 * 1024 * 1024; // 10MB — generous for JSON/webhook payloads, well short of memory-exhaustion territory

export class PayloadTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`[devora] request body exceeds the ${maxBytes}-byte limit`);
    this.name = "PayloadTooLargeError";
  }
}

/**
 * Reads `req` into a single `Buffer`, aborting (destroying the underlying
 * connection, not just stopping the read) the moment the running total
 * exceeds `maxBytes` — a client can't force unbounded buffering just by
 * sending an oversized body, or a `Content-Length` header lying about it
 * (the cap is enforced against real bytes received, not a trusted header).
 */
export async function readBodyWithLimit(
  req: AsyncIterable<Buffer> & { destroy?: (error?: Error) => void },
  maxBytes: number = MAX_BODY_BYTES
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      req.destroy?.();
      throw new PayloadTooLargeError(maxBytes);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
