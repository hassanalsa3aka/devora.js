import { describe, expect, it } from "vitest";
import { createRequestContext, generateSessionId, sessionStoreKey, type SessionCookieOptions } from "../session.js";
import { createMemorySessionStore } from "../sessionStore.js";

// sessionStoreKey() remembers its result. These tests check that remembering it cannot keep a
// session alive that the store says is gone, and cannot let one app's session in another's scope.

const fresh = (over: Partial<SessionCookieOptions> = {}): SessionCookieOptions => ({
  name: "devora_session", secret: "memo-test-secret", store: createMemorySessionStore(), ...over,
});

async function login(o: SessionCookieOptions): Promise<string> {
  const { ctx, settle } = await createRequestContext({}, o);
  const id = await ctx.setSession({ userId: "u1" });
  await settle();
  return id;
}
const bearer = (id: string, o: SessionCookieOptions) => createRequestContext({ authorizationHeader: `Bearer ${id}` }, o);

describe("the remembered session store key never outlives the session", () => {
  it("a session that has been used many times (key remembered) is rejected right after revocation", async () => {
    const o = fresh();
    const id = await login(o);
    for (let i = 0; i < 50; i++) expect((await bearer(id, o)).ctx.session).toEqual({ userId: "u1" });
    const { ctx, settle } = await bearer(id, o);
    await ctx.revokeSession();
    await settle();
    expect((await bearer(id, o)).ctx.session).toBeUndefined();
    expect((await bearer(id, o)).ctx.sessionTransport).toBeUndefined();
  });

  it("a session revoked from another request (sign out other devices) is rejected on its next use", async () => {
    const o = fresh();
    const laptop = await login(o);
    const phone = await login(o);
    expect((await bearer(phone, o)).ctx.session).toBeDefined();
    const from = await bearer(laptop, o);
    await from.ctx.revokeSession(phone);
    await from.settle();
    expect((await bearer(phone, o)).ctx.session).toBeUndefined();
    expect((await bearer(laptop, o)).ctx.session).toBeDefined();
  });

  it("a session whose record is deleted or expired in the store is rejected, remembered key or not", async () => {
    const o = fresh();
    const id = await login(o);
    expect((await bearer(id, o)).ctx.session).toBeDefined();
    await o.store.delete(sessionStoreKey(id, o)); // what an operator or a TTL sweep does
    expect((await bearer(id, o)).ctx.session).toBeUndefined();

    const id2 = await login(o);
    const key = sessionStoreKey(id2, o);
    const record = (await o.store.get(key))!;
    await o.store.set(key, { ...record, activeExpiresAt: 1, expiresAt: 2 }); // long dead
    expect((await bearer(id2, o)).ctx.session).toBeUndefined();
    expect(await o.store.get(key)).toBeUndefined(); // and a dead record is cleaned up
  });

  it("revocation still works after the memory has been flooded past its bound and emptied", async () => {
    const o = fresh();
    const id = await login(o);
    expect((await bearer(id, o)).ctx.session).toBeDefined();
    for (let i = 0; i < 6000; i++) sessionStoreKey(generateSessionId(), o);
    const { ctx, settle } = await bearer(id, o);
    await ctx.revokeSession();
    await settle();
    expect((await bearer(id, o)).ctx.session).toBeUndefined();
  });

  it("an isolated app's scope, or another secret, cannot use a session the memory has seen", async () => {
    const shared = fresh();
    const id = await login(shared);
    expect((await bearer(id, shared)).ctx.session).toBeDefined();
    const admin = { ...shared, name: "devora_session_admin" };
    const otherSecret = { ...shared, secret: "another-secret" };
    expect((await bearer(id, admin)).ctx.session).toBeUndefined();
    expect((await bearer(id, otherSecret)).ctx.session).toBeUndefined();
    expect((await bearer(id, shared)).ctx.session).toBeDefined();
  });
});
