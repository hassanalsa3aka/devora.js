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

/** Provided (`true`) only inside renderStreaming.ts's own render — see this
 * file's doc comment. Never provided by the two-pass path, so `<Island>`'s
 * default (`false`) is exactly today's v1 behavior. */
export const IslandStreamingContext = createContext<boolean>(false);

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
  const isStreaming = useContext(IslandStreamingContext);
  if (isStreaming) {
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
