/**
 * Client-side island hydration (ROADMAP.md #3), extended for streaming
 * (architecture-v2.md's Phase 3) — real logic shared by every app's
 * `island-client.tsx`, same dedup reasoning entry-server.tsx already got
 * (`renderRoute.ts`'s doc comment). Each app's own copy shrinks to a
 * one-line call, matching that precedent.
 *
 * A one-shot `document.querySelectorAll("[data-island]")` was the whole
 * v1 implementation — correct there, because every island is already in
 * the DOM by the time this script runs. Streaming breaks that assumption:
 * an island inside a Suspense boundary that hasn't resolved yet isn't in
 * the DOM at all when this script first runs — React patches its real
 * markup in *later*, via its own inline streaming script, once the
 * boundary resolves. A `MutationObserver` is what catches that patch as it
 * happens; the one-shot scan stays too, for the (more common) case where
 * an island is already present — no need to wait on an observer callback
 * for content that's already there.
 */
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";

function hydrateIslandNode(node: Element, hydrated: WeakSet<Element>): void {
  if (hydrated.has(node)) return;
  const url = node.getAttribute("data-island-url");
  if (!url) return; // island() wasn't run through the Vite plugin — SSR-only
  hydrated.add(node);

  const propsJson = node.getAttribute("data-island-props");
  const props = propsJson ? JSON.parse(propsJson) : {};

  import(/* @vite-ignore */ url).then((mod) => {
    hydrateRoot(node, createElement(mod.default, props));
  });
}

export function hydrateIslands(): void {
  const hydrated = new WeakSet<Element>();

  // Array.from(), not for-of, directly on a NodeList — this package's
  // shared tsconfig doesn't include the "DOM.Iterable" lib (a Node-oriented
  // package otherwise has no reason to), and this file is the one place in
  // it that genuinely needs to iterate a live DOM collection.
  for (const node of Array.from(document.querySelectorAll<HTMLElement>("[data-island]"))) {
    hydrateIslandNode(node, hydrated);
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const added of Array.from(mutation.addedNodes)) {
        if (!(added instanceof Element)) continue;
        if (added.matches("[data-island]")) hydrateIslandNode(added, hydrated);
        for (const nested of Array.from(added.querySelectorAll("[data-island]"))) {
          hydrateIslandNode(nested, hydrated);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
