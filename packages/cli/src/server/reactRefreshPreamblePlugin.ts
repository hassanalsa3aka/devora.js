import type { Plugin } from "vite";
import viteReact from "@vitejs/plugin-react";

const VIRTUAL_ID = "virtual:devora-react-refresh-preamble";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

/**
 * Real, previously-undiscovered dev-mode bug, found only by actually
 * hydrating an island in a real browser (Playwright) — curl and build-
 * output checks never exercise client-side JS execution at all, so this
 * survived unnoticed through every earlier "islands work in dev" claim.
 *
 * `@vitejs/plugin-react`'s Fast Refresh transform assumes its "preamble"
 * (`viteReact.preambleCode` — sets up `window.$RefreshReg$`/`$RefreshSig$`
 * before any Refresh-wrapped module runs) has already executed, normally
 * injected automatically into `index.html` by Vite's own
 * `transformIndexHtml`. This framework never calls that (hand-built HTML,
 * `appType: "custom"`) — so every island/csr component crashed at runtime
 * with "@vitejs/plugin-react can't detect preamble" the moment its module
 * loaded, in dev only.
 *
 * The officially exported fix (`viteReact.preambleCode`) is designed to be
 * injected as an **inline** `<script type="module">` — which this
 * framework's own default CSP (`default-src 'self'`, no `unsafe-inline`)
 * then blocks outright. Confirmed both failures directly, in that order,
 * rather than guessing: first the "can't detect preamble" crash with no
 * preamble at all, then a CSP inline-script violation after adding it the
 * naive (inline) way. Serving the exact same code as a real virtual
 * module instead — referenced via a normal `<script type="module"
 * src="...">`, same-origin — sidesteps needing to weaken CSP even in dev.
 */
export function reactRefreshPreamblePlugin(): Plugin {
  return {
    name: "devora-react-refresh-preamble",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id !== RESOLVED_ID) return null;
      // "__BASE__" + preambleCode's own already-slash-stripped
      // "@react-refresh" needs the base's own trailing slash to form a
      // real absolute path ("/@react-refresh") — every app here serves
      // from root ("/"), confirmed by no `base` option in any of the three
      // apps' vite.config.ts, so this is hardcoded rather than threaded
      // through from Vite's resolved config for one extra plumbing step
      // this framework doesn't need yet.
      const code = (viteReact.preambleCode as string).replace("__BASE__", "/");
      return { code, map: null };
    },
  };
}

export const REACT_REFRESH_PREAMBLE_VIRTUAL_ID = VIRTUAL_ID;
