/**
 * Client-side bootstrap for `renderMode: "csr"` routes — real logic shared
 * by every app's `csr-client.tsx`, same dedup reasoning as
 * `hydrateIslands.ts`/`entry-server.tsx` (found identical across all three
 * apps, confirmed by diff before extracting, not assumed).
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";

export function hydrateCsrRoutes(): void {
  for (const node of Array.from(document.querySelectorAll<HTMLElement>("[data-csr-entry]"))) {
    const url = node.getAttribute("data-csr-entry");
    if (!url) continue;

    import(/* @vite-ignore */ url).then((mod) => {
      createRoot(node).render(createElement(mod.default));
    });
  }
}
