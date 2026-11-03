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

/** Default limits on a form body's parts (app.config.ts `maxFormFields`/`maxFormFiles` change them). */
export const MAX_FORM_FIELDS = 1000;
export const MAX_FORM_FILES = 20;

export interface FormLimits {
  /** Fields that are not files. Default 1000. */
  maxFields?: number;
  /** File parts (multipart parts with a filename). Default 20. */
  maxFiles?: number;
}

/** A form body with more fields or files than allowed: answered with a 413. */
export class FormLimitError extends Error {
  readonly status = 413;
  constructor(what: "fields" | "files", limit: number) {
    super(`Too many form ${what} (the limit is ${limit})`);
    this.name = "FormLimitError";
  }
}

/**
 * Counts a multipart body's file and non-file parts from its part headers
 * alone, before anything is parsed, so a body of thousands of tiny parts is
 * refused without building thousands of objects. Stops counting as soon as a
 * limit is passed.
 */
function checkMultipartParts(body: Buffer, contentType: string, maxFields: number, maxFiles: number): void {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const value = boundary?.[1] ?? boundary?.[2]?.trim();
  if (!value) return; // the parser reports the malformed body
  const delimiter = Buffer.from(`--${value}`);
  const headerEnd = Buffer.from("\r\n\r\n");
  let fields = 0;
  let files = 0;
  let at = body.indexOf(delimiter);
  while (at !== -1) {
    const partStart = at + delimiter.length;
    // "--" after the delimiter closes the body.
    if (body[partStart] === 0x2d && body[partStart + 1] === 0x2d) break;
    const headersEnd = body.indexOf(headerEnd, partStart);
    if (headersEnd === -1) break;
    const headers = body.subarray(partStart, headersEnd).toString("latin1");
    if (/^content-disposition:[^\r\n]*;\s*filename\*?=/im.test(headers)) {
      if (++files > maxFiles) throw new FormLimitError("files", maxFiles);
    } else if (++fields > maxFields) {
      throw new FormLimitError("fields", maxFields);
    }
    at = body.indexOf(delimiter, headersEnd);
  }
}

/**
 * A page action's body as `FormData`: `multipart/form-data` (file uploads —
 * fields arrive as `File` objects) or URL-encoded. Multipart is parsed by
 * the platform's own `Response.formData()` (Node's fetch implementation), so
 * no dependency; the size cap was already applied while reading `body`.
 * Before this, every action body went through URLSearchParams, so a file
 * field arrived as null. The number of fields and files is limited too
 * (`limits`, default 1000 fields and 20 files): over it, a FormLimitError.
 */
export async function parseFormBody(body: Buffer, contentType: string | undefined, limits: FormLimits = {}): Promise<FormData> {
  const maxFields = limits.maxFields ?? MAX_FORM_FIELDS;
  const maxFiles = limits.maxFiles ?? MAX_FORM_FILES;
  if (contentType && /^multipart\/form-data\b/i.test(contentType)) {
    checkMultipartParts(body, contentType, maxFields, maxFiles);
    try {
      return await new Response(body as unknown as BodyInit, { headers: { "content-type": contentType } }).formData();
    } catch {
      throw new MalformedBodyError("malformed multipart/form-data body");
    }
  }
  const text = body.toString("utf-8");
  let pairs = text === "" ? 0 : 1;
  for (let i = text.indexOf("&"); i !== -1; i = text.indexOf("&", i + 1)) {
    if (++pairs > maxFields) throw new FormLimitError("fields", maxFields);
  }
  if (pairs > maxFields) throw new FormLimitError("fields", maxFields);
  const formData = new FormData();
  // .forEach(), not for-of — @types/node's URLSearchParams and the DOM
  // lib's disagree on its iterator typing when both are in scope.
  new URLSearchParams(text).forEach((value, key) => formData.append(key, value));
  return formData;
}
