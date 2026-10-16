import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateSessionId, sessionStoreKey } from "../session.js";

const direct = (id: string, o: { name: string; secret: string }) => createHmac("sha256", o.secret).update(`${o.name}:${id}`).digest("base64url");

describe("sessionStoreKey", () => {
  const shared = { name: "devora_session", secret: "s".repeat(32) };

  it("equals HMAC(secret, name:id), the first time and when remembered", () => {
    const id = generateSessionId();
    expect(sessionStoreKey(id, shared)).toBe(direct(id, shared));
    expect(sessionStoreKey(id, shared)).toBe(direct(id, shared));
  });

  it("keeps apps apart: another cookie name or secret gives another key", () => {
    const id = generateSessionId();
    const admin = { name: "devora_session_admin", secret: shared.secret };
    const other = { name: shared.name, secret: "t".repeat(32) };
    expect(sessionStoreKey(id, admin)).toBe(direct(id, admin));
    expect(sessionStoreKey(id, admin)).not.toBe(sessionStoreKey(id, shared));
    expect(sessionStoreKey(id, other)).not.toBe(sessionStoreKey(id, shared));
  });

  it("stays correct past the memory bound (a flood of made-up IDs)", () => {
    const ids = Array.from({ length: 6000 }, () => generateSessionId());
    for (const id of ids) expect(sessionStoreKey(id, shared)).toBe(direct(id, shared));
    for (const id of ids.slice(0, 50)) expect(sessionStoreKey(id, shared)).toBe(direct(id, shared));
  });
});
