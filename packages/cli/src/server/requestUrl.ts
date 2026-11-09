/**
 * The request target as a URL, without ever throwing. `new URL("//", base)` is a protocol-relative reference with no host and
 * throws; an async middleware that throws before its own try/catch is an unhandled rejection, which ends the dev server's
 * process (finding H36: a single `GET //` from the local machine stopped `devora dev`). An origin-form target (starting with "/")
 * is attached to a fixed origin instead, so `//`, `/\` and the like are just paths.
 */
export function parseRequestUrl(target: string | undefined): URL | undefined {
  const raw = target ?? "/";
  try {
    return raw.startsWith("/") ? new URL(`http://localhost${raw}`) : new URL(raw, "http://localhost");
  } catch {
    return undefined;
  }
}

/** A 400 for a request target that cannot be read at all. */
export function sendBadRequest(res: import("node:http").ServerResponse): void {
  res.statusCode = 400;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Bad Request");
}
