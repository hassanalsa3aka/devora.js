/**
 * Remembers the result of an async `load()` for `ttlMs`, then loads again on the next call.
 * Concurrent callers during a load share one load. A load that throws is not remembered.
 *
 * Used for build manifests read on every server-rendered request. They only change when the app
 * is rebuilt, and the production handler already re-checks built files on a one-second interval,
 * so a rebuilt manifest shows up within a second, as the static files do.
 */
export function ttlMemo<T>(load: () => Promise<T>, ttlMs: number, now: () => number = Date.now): () => Promise<T> {
  let value: Promise<T> | undefined;
  let loadedAt = 0;
  return () => {
    const t = now();
    if (!value || t - loadedAt >= ttlMs) {
      const p = load();
      value = p;
      loadedAt = t;
      p.catch(() => {
        if (value === p) value = undefined;
      });
    }
    return value;
  };
}
