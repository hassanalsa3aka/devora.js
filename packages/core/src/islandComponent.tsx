/**
 * The <Island> wrapper — what a route actually renders around an island
 * component. Resolving async imports inside a synchronous renderToString
 * pass isn't supported without Suspense/streaming (not in v1 — see
 * ROADMAP.md #1), so this uses a two-pass render instead: pass one walks
 * the tree, collecting each unresolved island's import() promise via
 * context; the caller (entry-server.tsx) awaits them all, then renders
 * once more, at which point every <Island> finds its component already in
 * `collector.resolved` and renders the real thing. A page with zero
 * islands never pays for a second pass — see entry-server.tsx.
 */
import { createContext, createElement, useContext, type ReactNode } from "react";
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

let islandIdCounter = 0;

export function Island<Props extends Record<string, unknown>>(props: {
  component: IslandDescriptor<Props>;
  props: Props;
}): ReactNode {
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
