/**
 * Server-side session storage (devora-pre-v3-hotfixes.md, "Architecture
 * addendum — unified session auth"). A session is an opaque random ID the
 * client holds (in a cookie or an `Authorization: Bearer` header) and a
 * record this store holds — so deleting the record revokes the session
 * everywhere, immediately, which a self-contained signed token can't do.
 *
 * The store is bring-your-own, same boundary as the DB itself (§6/§11: no
 * built-in ORM): implement these three methods against whatever you already
 * run (a `sessions` table, Redis, ...) and point
 * `shared.sessions.store` in devora.config.ts at the module. The in-memory
 * store below is for dev, tests, and single-process `devora start` only.
 *
 * Keys are never the raw session ID — session.ts passes an HMAC of it
 * (keyed with the session secret and scoped to the app's cookie name), so a
 * leaked copy of the store doesn't contain usable tokens, and an ID issued
 * by one auth scope can't be looked up under another.
 */

export interface SessionRecord {
  /** Whatever `ctx.setSession(data)` was given — must be JSON-serializable
   * for any store that persists outside the process. */
  data: unknown;
  /** Epoch ms. Before this the session is "active". */
  activeExpiresAt: number;
  /** Epoch ms. Between `activeExpiresAt` and this the session is "idle" (still
   * valid; using it extends both timestamps). At or after this it's "dead". */
  expiresAt: number;
}

export type SessionState = "active" | "idle" | "dead";

export interface SessionStore {
  get(key: string): Promise<SessionRecord | undefined> | SessionRecord | undefined;
  set(key: string, record: SessionRecord): Promise<void> | void;
  delete(key: string): Promise<void> | void;
}

/** Identity helper for a store module's default export — exists for the
 * type inference, same role `apiRoute`/`serverFn` used to play. */
export function defineSessionStore(store: SessionStore): SessionStore {
  return store;
}

export function getSessionState(record: SessionRecord | undefined, now: number = Date.now()): SessionState {
  if (!record || now >= record.expiresAt) return "dead";
  if (now >= record.activeExpiresAt) return "idle";
  return "active";
}

export function isSessionStore(value: unknown): value is SessionStore {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.get === "function" && typeof candidate.set === "function" && typeof candidate.delete === "function"
  );
}

const SWEEP_EVERY_N_WRITES = 1000;

/**
 * In-process store. Records are deep-copied in and out so code that mutates
 * `ctx.session` behaves the same as it will against a real DB-backed store
 * (where it would never write back implicitly). Expired records are dropped
 * on read and swept periodically on write, so abandoned sessions don't
 * accumulate forever.
 *
 * Not for serverless: each function instance would get its own empty map,
 * so users would be logged out at random. Production refuses to use it
 * unless `shared.sessions.store` is explicitly set to `"memory"`.
 */
export function createMemorySessionStore(): SessionStore {
  const records = new Map<string, SessionRecord>();
  let writesSinceSweep = 0;

  return {
    get(key) {
      const record = records.get(key);
      if (!record) return undefined;
      if (getSessionState(record) === "dead") {
        records.delete(key);
        return undefined;
      }
      return structuredClone(record);
    },
    set(key, record) {
      records.set(key, structuredClone(record));
      if (++writesSinceSweep >= SWEEP_EVERY_N_WRITES) {
        writesSinceSweep = 0;
        const now = Date.now();
        for (const [k, r] of records) {
          if (getSessionState(r, now) === "dead") records.delete(k);
        }
      }
    },
    delete(key) {
      records.delete(key);
    },
  };
}

/**
 * One process-wide memory store, keyed on `globalThis` via `Symbol.for` —
 * in dev the CLI's bundled copy of this package and the copy Vite loads
 * route files against are separate module instances, and every app's dev
 * server runs in the same process; a module-level `const` would silently
 * give each its own map (so a "shared" auth session set by one app wouldn't
 * exist in another).
 */
const MEMORY_STORE_KEY = Symbol.for("devora.sessions.memoryStore");

export function getProcessMemorySessionStore(): SessionStore {
  const holder = globalThis as unknown as Record<symbol, SessionStore | undefined>;
  holder[MEMORY_STORE_KEY] ??= createMemorySessionStore();
  return holder[MEMORY_STORE_KEY]!;
}
