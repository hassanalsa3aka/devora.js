/**
 * Client-side island hydration bootstrap (ROADMAP.md #3). Only requested by
 * the browser when a page actually rendered at least one island — see
 * entry-server.tsx / packages/core/src/html.ts. Finds every
 * [data-island] the server emitted and hydrates it independently; nothing
 * else on the page hydrates (full-page hydration isn't this framework's
 * model — see packages/core/src/html.ts).
 */
import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";

for (const node of document.querySelectorAll<HTMLElement>("[data-island]")) {
  const url = node.getAttribute("data-island-url");
  if (!url) continue; // island() wasn't run through the Vite plugin — SSR-only
  const propsJson = node.getAttribute("data-island-props");
  const props = propsJson ? JSON.parse(propsJson) : {};

  import(/* @vite-ignore */ url).then((mod) => {
    hydrateRoot(node, createElement(mod.default, props));
  });
}
