import { createHmac, timingSafeEqual } from "node:crypto";

// A short-lived token the browser presents to the realtime server. The same
// logic lives in realtime/token.mjs (a separate process, so a separate copy):
// payload "<userId>.<expiresAtSeconds>", signed with HMAC-SHA256, no library.

const TOKEN_TTL_SECONDS = 60;

function secret(): string {
  const value = process.env.REALTIME_TOKEN_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") throw new Error("REALTIME_TOKEN_SECRET is not set");
  return "dev-only-realtime-token-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issueRealtimeToken(userId: string, now = Date.now()): { token: string; expiresIn: number } {
  const exp = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString("base64url");
  return { token: `${payload}.${sign(payload)}`, expiresIn: TOKEN_TTL_SECONDS };
}

/** Exported for tests; the realtime server has its own copy of this check. */
export function verifyRealtimeToken(token: string, now = Date.now()): { sub: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (typeof sub !== "string" || typeof exp !== "number" || exp * 1000 < now) return null;
    return { sub };
  } catch {
    return null;
  }
}
