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
}): string {
  const { title, description, og } = opts.meta ?? {};
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
    <div id="root">${opts.bodyHtml}</div>
    ${opts.islandScriptUrl ? `<script type="module" src="${escapeHtml(opts.islandScriptUrl)}"></script>` : ""}
    ${opts.csrScriptUrl ? `<script type="module" src="${escapeHtml(opts.csrScriptUrl)}"></script>` : ""}
  </body>
</html>
`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
