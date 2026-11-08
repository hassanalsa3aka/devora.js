/**
 * The per-launch token. The desktop shell creates one token each time it starts
 * the app's server and hands it to the server through the environment, never on the command line (other local
 * users can read a process's arguments). Every request must carry it, so a browser tab or another program on the
 * same machine that finds the port gets a 403.
 *
 * Two ways to carry it: the `x-devora-desktop-token` header, or the `devora_desktop` cookie. The window opens
 * `/__devora_desktop/launch?token=<token>` once; that answer sets the cookie (HttpOnly, SameSite=Strict, Path=/)
 * and redirects to `/`. A web view cannot add a header to every request on every platform, so the cookie is the
 * path the window uses; the header is for tests and tools.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

export const DESKTOP_TOKEN_HEADER = "x-devora-desktop-token";
export const DESKTOP_TOKEN_COOKIE = "devora_desktop";
export const DESKTOP_LAUNCH_PATH = "/__devora_desktop/launch";
export const DESKTOP_TOKEN_ENV = "DEVORA_DESKTOP_TOKEN";

/** 32 random bytes, base64url (43 characters). */
export function generateLaunchToken(): string {
  return randomBytes(32).toString("base64url");
}

/** A token is 43 base64url characters; anything else is refused before comparing. */
export function isWellFormedToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** Constant-time comparison. */
export function tokensMatch(expected: string, presented: unknown): boolean {
  if (!isWellFormedToken(presented)) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cookieValue(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq !== -1 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

export type GuardOutcome = "allowed" | "launched" | "refused";

/**
 * Checks one request. "allowed": carry on to the app. "launched": the launch URL with the right token was
 * answered here (cookie set, 303 to /). "refused": a 403 was sent. The response is finished in the last two cases.
 */
export function guardDesktopRequest(token: string, req: IncomingMessage, res: ServerResponse): GuardOutcome {
  if (!isWellFormedToken(token)) throw new Error("[devora desktop] the launch token is missing or malformed");
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname === DESKTOP_LAUNCH_PATH) {
    if ((req.method === "GET" || req.method === "HEAD") && tokensMatch(token, url.searchParams.get("token"))) {
      res.statusCode = 303;
      res.setHeader("Set-Cookie", `${DESKTOP_TOKEN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict`);
      res.setHeader("Location", "/");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Referrer-Policy", "no-referrer");
      res.end();
      return "launched";
    }
    return refuse(res);
  }
  const header = req.headers[DESKTOP_TOKEN_HEADER];
  if (tokensMatch(token, Array.isArray(header) ? header[0] : header)) return "allowed";
  if (tokensMatch(token, cookieValue(req.headers.cookie, DESKTOP_TOKEN_COOKIE))) return "allowed";
  return refuse(res);
}

function refuse(res: ServerResponse): "refused" {
  res.statusCode = 403;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end("Forbidden: this server only answers the desktop window that started it");
  return "refused";
}
