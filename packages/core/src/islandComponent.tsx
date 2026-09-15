/**
 * The <Island> wrapper — what a route actually renders around an island
 * component. Two genuinely different strategies live in this one file, on
 * purpose (architecture-v2.md's Phase 3, "streaming render mode"):
 *
 * 1. **Two-pass** (ssr/ssg/csr/isr, unchanged from v1): resolving an async
 *    import inside a synchronous `renderToString` pass isn't supported —
 *    `renderToString` never waits for a suspended promise, it just renders
 *    the fallback immediately and moves on. So this collects each
 *    unresolved island's import() promise via `IslandCollectorContext` on a
 *    first pass (rendering `null` for each), awaits them all, then renders
 *    once more — at which point every `<Island>` finds its component
 *    already in `collector.resolved`. A page with zero islands never pays
 *    for a second pass — see renderRoute.ts.
 * 2. **Suspense-throw** (streaming only): `renderToPipeableStream` DOES
 *    support real Suspense — a component that throws a promise suspends
 *    its nearest `<Suspense>` boundary, which streams a fallback
 *    immediately and patches in the real content (via React's own inline
 *    script mechanism) once the promise resolves. This is what actually
 *    makes streaming possible for islands; the two-pass model doesn't
 *    apply here at all — synchronously collecting-then-rerendering has no
 *    meaning against a stream that's already being written to the client.
 *
 * Which strategy a given `<Island>` uses is decided by `IslandStreamingContext`
 * — provided (`true`) only by `renderStreaming.ts`'s own render path.
 * Existing routes render inside neither knowing nor caring which context
 * value is present; every ssr/ssg/csr/isr render path leaves it at its
 * default (`false`), so this is a strict, zero-code-change addition for
 * every route not opting into `renderMode: "streaming"`.
 */
import { createContext, createElement, useContext, Suspense, type ReactNode } from "react";
import type { IslandDescriptor } from "./island.js";

type ResolvedIsland = { default: (props: unknown) => unknown };

export interface IslandCollector {
  pending: Promise<unknown>[];
  resolved: Map<IslandDescriptor<unknown>, ResolvedIsland>;
  resolving: Set<IslandDescriptor<unknown>>;
}

export function createIslandCollector(): IslandCollector {
  return { pending: [], resolved: new Map(), resolving: new Set() };
}

export const IslandCollectorContext = createContext<IslandCollector | null>(null);

/** A mutable tracker `<Island>` marks when it actually renders under the
 * streaming path — see `StreamingIslandTracker`'s own doc comment for why
 * this exists (not just a boolean "is this streaming" flag). */
export interface StreamingIslandTracker {
  hasIsland: boolean;
}

/** Provided (non-null) only inside renderStreaming.ts's own render — see
 * this file's doc comment. Never provided by the two-pass path, so
 * `<Island>`'s default (`null`) is exactly today's v1 behavior. */
export const IslandStreamingContext = createContext<StreamingIslandTracker | null>(null);

let islandIdCounter = 0;

interface ModuleCacheEntry {
  status: "pending" | "resolved" | "rejected";
  promise: Promise<void>;
  value?: ResolvedIsland;
  error?: unknown;
}

/**
 * Module-scope (not per-request) — deliberately: the underlying `import()`
 * this wraps resolves to the same real module regardless of which request
 * triggered it first, so caching it across requests (the same way a
 * browser's own dynamic-import cache would) avoids re-importing the same
 * island module on every single streamed request. Safe to key by
 * `descriptor` directly since `island()` calls produce one stable object
 * per call site, created once at module load — never per-request.
 */
const streamingModuleCache = new Map<IslandDescriptor<unknown>, ModuleCacheEntry>();

/**
 * Real, previously-undiscovered dev-mode regression this exists to fix:
 * `streamingModuleCache` is keyed by the `descriptor` *object*, created
 * fresh only when the route file that calls `island(...)` itself
 * re-evaluates — editing an island's own component file (e.g. `Counter.tsx`)
 * doesn't necessarily cause Vite to reload the *route* file that imports it
 * dynamically, so the old descriptor object (and its now-stale cached
 * resolution) can survive indefinitely across dev-server HMR edits, with a
 * full server restart as the only way to clear it. The two-pass model
 * (ssr/ssg/csr/isr) has no equivalent risk, since it never caches a
 * resolution across requests at all. Wired into every dev server's
 * `handleHotUpdate` (`moduleDisposePlugin.ts`, alongside the unrelated but
 * same-lifecycle-event `registerDisposable()` mechanism) — a real, if blunt,
 * fix: any edit clears every cached island resolution, not just the one
 * that changed, trading a few unnecessary re-imports of unrelated islands
 * for guaranteed correctness rather than precise per-descriptor invalidation.
 * Never called in production — there's no HMR there to trigger it, and a
 * production process never needs this cache to change after it's warm.
 */
export function clearStreamingModuleCache(): void {
  streamingModuleCache.clear();
}

/** The real "throw a promise to suspend" idiom React's Suspense contract
 * expects — reads a cached resolution if there is one, otherwise throws the
 * in-flight promise (first render) or the real error (a rejected import). */
function readIslandModuleSuspending(descriptor: IslandDescriptor<unknown>): ResolvedIsland {
  let entry = streamingModuleCache.get(descriptor);
  if (!entry) {
    const newEntry: ModuleCacheEntry = {
      status: "pending",
      promise: descriptor.importer().then(
        (mod) => {
          newEntry.status = "resolved";
          newEntry.value = mod as ResolvedIsland;
        },
        (err: unknown) => {
          newEntry.status = "rejected";
          newEntry.error = err;
          // Real, previously-undiscovered bug fixed here (Phase 4 security
          // audit): without this, a single transient import failure (a
          // disk/network hiccup during a serverless cold start — this
          // codebase's own docs already worry about exactly that scenario
          // elsewhere) permanently cached the rejection for the rest of the
          // process's life — `descriptor.importer()` never called again, so
          // every request for that island, forever, throws the same stale
          // error.
          //
          // Deliberately a macrotask (`setTimeout`, not deleting inline
          // here): React re-invokes a component that threw a promise as
          // soon as that promise settles — including on rejection — and
          // that re-invocation happens synchronously within the same
          // microtask turn as this `.then()` callback. Deleting the entry
          // *inline* was tried and measured to cause exactly the bug it was
          // meant to fix, worse: the re-invocation would find no cache
          // entry, immediately call `descriptor.importer()` again, and
          // throw a fresh pending promise — for a persistently-broken
          // import this retries in a tight loop with no bound, hanging the
          // request outright (confirmed: it turned an existing "reports a
          // boundary error" test from a 1ms pass into a 5-second timeout).
          // Scheduling the removal on a macrotask lets the CURRENT
          // request's re-invocation still see `entry.status === "rejected"`
          // and throw `entry.error` as a plain synchronous value — which
          // React correctly treats as a real render error (not a suspend),
          // reported exactly once, no retry — while a *future* request,
          // necessarily at least one full event-loop turn later, finds the
          // entry gone and retries fresh.
          setTimeout(() => {
            if (streamingModuleCache.get(descriptor) === newEntry) {
              streamingModuleCache.delete(descriptor);
            }
          }, 0);
        }
      ),
    };
    entry = newEntry;
    streamingModuleCache.set(descriptor, entry);
  }
  if (entry.status === "pending") throw entry.promise;
  if (entry.status === "rejected") throw entry.error;
  return entry.value as ResolvedIsland;
}

function SuspendingIsland<Props extends Record<string, unknown>>(props: {
  component: IslandDescriptor<Props>;
  props: Props;
}): ReactNode {
  const descriptor = props.component as unknown as IslandDescriptor<unknown>;
  const resolved = readIslandModuleSuspending(descriptor);
  const id = `island-${islandIdCounter++}`;
  return createElement(
    "div",
    {
      "data-island": id,
      "data-island-url": descriptor.clientUrl,
      "data-island-props": JSON.stringify(props.props),
    },
    createElement(resolved.default as (p: Props) => ReactNode, props.props)
  );
}

export function Island<Props extends Record<string, unknown>>(props: {
  component: IslandDescriptor<Props>;
  props: Props;
}): ReactNode {
  const streamingTracker = useContext(IslandStreamingContext);
  if (streamingTracker) {
    // Real bug fixed here: this must be set the moment `<Island>` actually
    // renders under the streaming path — regardless of whether it resolves
    // in the shell or suspends — not left for renderStreaming.ts to guess.
    // Previously the streaming tail *always* included the island hydration
    // script whenever the caller happened to pass an `islandClientUrl` at
    // all (true for any app that has an island anywhere, on every request),
    // silently violating html.ts's own documented contract ("Set only when
    // the page rendered at least one island") for every streaming route
    // with zero islands in an app that has them elsewhere.
    streamingTracker.hasIsland = true;
    // A visible fallback attribute (not `data-island`, so the client
    // hydration bootstrap's MutationObserver — see client.ts — never tries
    // to hydrate a placeholder that hasn't suspended-and-resolved yet).
    return createElement(
      Suspense,
      { fallback: createElement("div", { "data-island-pending": true }) },
      createElement(SuspendingIsland as (p: typeof props) => ReactNode, props)
    );
  }

  // Two-pass path — unchanged from v1, byte-for-byte.
  const collector = useContext(IslandCollectorContext);
  const descriptor = props.component as unknown as IslandDescriptor<unknown>;

  if (!collector) {
    // No collector in scope (entry-server.tsx always provides one) — fail
    // soft rather than crash the whole page render.
    return null;
  }

  const resolved = collector.resolved.get(descriptor);
  if (!resolved) {
    if (!collector.resolving.has(descriptor)) {
      collector.resolving.add(descriptor);
      collector.pending.push(
        descriptor.importer().then((mod) => {
          collector.resolved.set(descriptor, mod as ResolvedIsland);
        })
      );
    }
    return null; // first pass: not resolved yet
  }

  const id = `island-${islandIdCounter++}`;
  return createElement(
    "div",
    {
      "data-island": id,
      "data-island-url": descriptor.clientUrl,
      "data-island-props": JSON.stringify(props.props),
    },
    createElement(resolved.default as (p: Props) => ReactNode, props.props)
  );
}
