import { createHmac, timingSafeEqual } from "node:crypto";

// Same format as packages/backend/realtimeToken.ts: "<base64url payload>.<base64url HMAC>",
// payload { sub: userId, exp: seconds since epoch }. No JWT library needed.
export function verifyToken(token, secret, now = Date.now()) {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(createHmac("sha256", secret).update(payload).digest("base64url"));
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
