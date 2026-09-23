/**
 * Turns `shared.sessions` (devora.config.ts) into the `SessionCookieOptions`
 * a request needs, in both dev (packages/cli's middlewares, which load a
 * store module through Vite) and production (prodRequestHandler.ts, which
 * loads the pre-built `dist/server/session-store.js`). The two differ only
 * in *how* they import the store module; everything about what's allowed —
 * including production refusing to guess — lives here once.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { AuthMode, SessionsConfig } from "./config.js";
import { resolveSessionScope, type SessionCookieOptions } from "./session.js";
import { getProcessMemorySessionStore, isSessionStore, type SessionStore } from "./sessionStore.js";

/** Written into `dist/server/` by buildAppServer.ts so a production server
 * (any adapter) knows what the build was configured with, without
 * re-reading devora.config.ts at runtime. */
export const SESSION_MANIFEST_FILE = "session-manifest.json";
/** Build key (buildKey.ts) of the bundled store module, when there is one. */
export const SESSION_STORE_BUILD_KEY = "session-store";

export interface SessionManifest {
  /** null = nothing configured. */
  store: "memory" | "module" | null;
  activePeriodMs?: number;
  idlePeriodMs?: number;
}

export function toSessionManifest(sessions: SessionsConfig | undefined): SessionManifest {
  const store = sessions?.store === undefined ? null : sessions.store === "memory" ? "memory" : "module";
  return {
    store,
    activePeriodMs: sessions?.activeSeconds !== undefined ? sessions.activeSeconds * 1000 : undefined,
    idlePeriodMs: sessions?.idleSeconds !== undefined ? sessions.idleSeconds * 1000 : undefined,
  };
}

export function readSessionManifest(serverOutDir: string): SessionManifest {
  const manifestPath = path.join(serverOutDir, SESSION_MANIFEST_FILE);
  // A build from before session stores existed has no manifest — same as
  // "nothing configured", so production fails loudly instead of guessing.
  if (!existsSync(manifestPath)) return { store: null };
  return JSON.parse(readFileSync(manifestPath, "utf-8")) as SessionManifest;
}

let warnedUnconfigured = false;

/**
 * The fallback when no store is configured: memory in dev (with a one-time
 * warning), a thrown error in production. Called when a handler is
 * created, not per request, so a misconfigured production server fails at
 * boot rather than on its first logged-in request.
 */
export function assertSessionStoreConfigured(manifest: SessionManifest): void {
  if (manifest.store !== null) return;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `[devora] no session store configured. Set shared.sessions.store in devora.config.ts — ` +
        `a path to a module whose default export is a SessionStore backed by your database ` +
        `(see packages/backend/AUTH.md), or "memory" to explicitly accept in-process sessions ` +
        `(single long-lived server only — not serverless).`
    );
  }
  if (!warnedUnconfigured) {
    console.warn(
      `[devora] no shared.sessions.store set in devora.config.ts — using an in-memory session ` +
        `store (sessions are lost on restart). Production will refuse to start until one is set.`
    );
    warnedUnconfigured = true;
  }
}

/**
 * Builds a per-request resolver for an app's session options. `loadModule`
 * is only called when the manifest says "module". It's called per request
 * rather than cached here: both real callers are already cached by their
 * module system (Vite's SSR module graph in dev, which also picks up edits
 * to the store module; Node's `import()` cache in production), and a failed
 * load shouldn't be pinned forever.
 */
export function createSessionOptionsResolver(
  authMode: AuthMode,
  appName: string,
  manifest: SessionManifest,
  loadModule: () => Promise<unknown>
): () => Promise<SessionCookieOptions> {
  assertSessionStoreConfigured(manifest);
  const scope = resolveSessionScope(authMode, appName);
  const periods = { activePeriodMs: manifest.activePeriodMs, idlePeriodMs: manifest.idlePeriodMs };

  const loadStore = async (): Promise<SessionStore> => {
    if (manifest.store !== "module") return getProcessMemorySessionStore();
    let store = ((await loadModule()) as { default?: unknown }).default;
    // esbuild's CJS output for the Vercel/Netlify function bundle can nest
    // the real default export one level deeper under Node's ESM/CJS
    // interop — the same gap prodRequestHandler.ts's
    // unwrapCjsDefaultInterop() documents for route modules.
    const nested = (store as { default?: unknown } | undefined)?.default;
    if (!isSessionStore(store) && isSessionStore(nested)) store = nested;
    if (!isSessionStore(store)) {
      throw new Error(
        "[devora] the shared.sessions.store module must default-export a SessionStore " +
          "({ get, set, delete }) — see defineSessionStore()"
      );
    }
    return store;
  };

  return async () => ({ ...scope, ...periods, store: await loadStore() });
}
