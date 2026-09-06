/**
 * Client-side bootstrap for renderMode: "csr" routes (ROADMAP.md's
 * render-modes item) — one generic file handles every csr route in this
 * app, the same way island-client.tsx handles every island generically.
 * Only requested by the browser when the server actually rendered a csr
 * shell (see packages/core/src/csrRoute.ts / prodRequestHandler.ts).
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";

for (const node of document.querySelectorAll<HTMLElement>("[data-csr-entry]")) {
  const url = node.getAttribute("data-csr-entry");
  if (!url) continue;

  import(/* @vite-ignore */ url).then((mod) => {
    createRoot(node).render(createElement(mod.default));
  });
}
