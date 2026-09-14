/**
 * Minimal HTML document shell for SSR responses (see ROADMAP.md #1). No
 * full-page hydration script — that's not this framework's model. Only a
 * page that actually used at least one island gets a script tag
 * (`islandScriptUrl`, ROADMAP.md #3); a page with none stays plain HTML.
 *
 * Every document also carries the shared brand `<style>` (theme.ts —
 * dark by default, automatic light variant via `prefers-color-scheme`) and
 * a favicon using the real logo — standard across every app, not opt-in
 * per route (see ROADMAP.md's shared-design item, and branding.tsx for the
 * header/page components that actually use these theme classes).
 */
import { DEVORA_LOGO_URL, THEME_CSS } from "./theme.js";
export interface DocumentMeta {
  title?: string;
  description?: string;
  /** Open Graph overrides (§8) — og:title/og:description fall back to title/description when omitted. */
  og?: {
    title?: string;
    description?: string;
    type?: string;
    image?: string;
    url?: string;
  };
}

function renderHead(meta: DocumentMeta | undefined): string {
  const { title, description, og } = meta ?? {};
  const ogTitle = og?.title ?? title;
  const ogDescription = og?.description ?? description;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="${DEVORA_LOGO_URL}" />
    <style>${THEME_CSS}</style>
    ${title ? `<title>${escapeHtml(title)}</title>` : ""}
    ${description ? `<meta name="description" content="${escapeHtml(description)}" />` : ""}
    ${ogTitle ? `<meta property="og:title" content="${escapeHtml(ogTitle)}" />` : ""}
    ${ogDescription ? `<meta property="og:description" content="${escapeHtml(ogDescription)}" />` : ""}
    ${ogTitle || ogDescription ? `<meta property="og:type" content="${escapeHtml(og?.type ?? "website")}" />` : ""}
    ${og?.image ? `<meta property="og:image" content="${escapeHtml(og.image)}" />` : ""}
    ${og?.url ? `<meta property="og:url" content="${escapeHtml(og.url)}" />` : ""}
  </head>
  <body>
`;
}

function renderTail(opts: { islandScriptUrl?: string; csrScriptUrl?: string; devPreambleUrl?: string }): string {
  // Must come before island/csr script tags — @vitejs/plugin-react's Fast
  // Refresh preamble has to run before any Refresh-wrapped component
  // module does (see reactRefreshPreamblePlugin.ts's doc comment for the
  // full account of the real bug this fixes). Dev-only: prodRequestHandler.ts
  // never sets `devPreambleUrl`, since production has no Vite dev
  // server/HMR to preamble in the first place.
  const preambleScript = opts.devPreambleUrl
    ? `<script type="module" src="${escapeHtml(opts.devPreambleUrl)}"></script>\n    `
    : "";
  return `    ${preambleScript}${opts.islandScriptUrl ? `<script type="module" src="${escapeHtml(opts.islandScriptUrl)}"></script>` : ""}
    ${opts.csrScriptUrl ? `<script type="module" src="${escapeHtml(opts.csrScriptUrl)}"></script>` : ""}
  </body>
</html>
`;
}

export function renderHtmlDocument(opts: {
  bodyHtml: string;
  meta?: DocumentMeta;
  /** Set only when the page rendered at least one island — see ROADMAP.md #3. */
  islandScriptUrl?: string;
  /** Set only for a renderMode: "csr" page — the generic csr-client bootstrap
   * that mounts the route's component client-side (see csrRoute.ts). Mutually
   * exclusive with islandScriptUrl in practice: a csr route never runs the
   * island two-pass render at all. */
  csrScriptUrl?: string;
  /** Dev-mode-only virtual module URL for the React Refresh preamble — see
   * `renderTail`'s doc comment. Never set in production. */
  devPreambleUrl?: string;
}): string {
  return `${renderHead(opts.meta)}    <div id="root">${opts.bodyHtml}</div>
${renderTail(opts)}`;
}

/**
 * Head/tail split for `renderMode: "streaming"` (architecture-v2.md's
 * Phase 3) — there's no complete `bodyHtml` string to embed until the whole
 * tree (including every Suspense boundary) has resolved, which defeats the
 * entire point of streaming. `renderStreaming.ts` writes `renderDocumentHead`
 * immediately, then pipes React's own `renderToPipeableStream` output
 * (which renders the `<div id="root">...</div>` wrapper itself, closing tag
 * included) directly into the same destination, then writes
 * `renderDocumentTail` once React's stream ends. Kept as two exports (not
 * cased into the same function as the two above) since the streaming
 * caller needs to write them at genuinely different times, with React's
 * own output arriving in between — not something a single string-returning
 * function can express.
 */
export function renderDocumentHead(meta: DocumentMeta | undefined): string {
  return renderHead(meta);
}

export function renderDocumentTail(opts: { islandScriptUrl?: string; devPreambleUrl?: string }): string {
  return renderTail(opts);
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
