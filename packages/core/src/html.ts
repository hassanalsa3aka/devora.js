/**
 * The HTML document shell for every server-rendered page (ssr, ssg/isr,
 * streaming, csr shells, error pages). No full-page hydration script —
 * only a page that used an island gets one (`islandScriptUrl`).
 *
 * Head content comes from three explicit places, in this order:
 * - the app's `head` (app.config.ts) — stylesheets, fonts, manifest, meta,
 *   external scripts shared by every page;
 * - CSS the route imports (`import "./page.css"`), linked automatically —
 *   collected from Vite's module graph in dev and from the SSR build's
 *   chunk metadata in production;
 * - the route's own `meta()` (title, description, og, and `head`).
 *
 * The framework's own stylesheet (theme.ts — `body` layout rules included)
 * and default favicon are NOT forced on every page any more: they're added
 * when the page renders `PageShell`/`AppHeader` (which need them), or always
 * with `head: { theme: true }`, or never with `theme: false`.
 */
import { DEVORA_LOGO_URL, THEME_CSS } from "./theme.js";

export interface HeadLink {
  rel: string;
  href: string;
  type?: string;
  sizes?: string;
  as?: string;
  media?: string;
  crossorigin?: "anonymous" | "use-credentials" | "";
  hreflang?: string;
  title?: string;
}

export interface HeadMetaTag {
  name?: string;
  property?: string;
  httpEquiv?: string;
  content: string;
}

export interface HeadScript {
  /** External scripts only — an inline script would need a CSP exception. */
  src: string;
  /** Default "module". */
  type?: "module" | "classic";
  defer?: boolean;
  async?: boolean;
  crossorigin?: "anonymous" | "use-credentials" | "";
}

/** `head` in app.config.ts, and in a route's `meta()` return value. */
export interface HeadConfig {
  /** `<html lang>` (app-level). */
  lang?: string;
  /** `<link rel="stylesheet">` URLs — your CSS, a font stylesheet, ... */
  stylesheets?: string[];
  /** Any other `<link>`: icon, manifest, preload, preconnect, alternate, ... */
  links?: HeadLink[];
  meta?: HeadMetaTag[];
  scripts?: HeadScript[];
  /**
   * The framework's theme stylesheet + default favicon (app-level).
   * "auto" (default): on pages that render PageShell/AppHeader, and on csr
   * pages (rendered in the browser, so the server can't tell). true: every
   * page. false: never — style the app entirely yourself.
   */
  theme?: "auto" | boolean;
}

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
  /** Route-level head tags, added after the app's `head`. */
  head?: Omit<HeadConfig, "lang" | "theme">;
}

/** What a renderer knows about a page beyond its `meta()`. */
export interface DocumentHeadOptions {
  /** app.config.ts `head`. */
  appHead?: HeadConfig;
  /** CSS files the route imports (URLs). */
  styles?: string[];
  /** Whether the page rendered PageShell/AppHeader (see `theme: "auto"`). */
  usedShell?: boolean;
  /** csr shells: the page renders in the browser, so "auto" means include. */
  clientRendered?: boolean;
}

function attrs(pairs: Record<string, string | boolean | undefined>): string {
  return Object.entries(pairs)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(String(v))}"`))
    .join("");
}

function linkTag(link: HeadLink): string {
  return `<link${attrs({
    rel: link.rel,
    href: link.href,
    type: link.type,
    sizes: link.sizes,
    as: link.as,
    media: link.media,
    crossorigin: link.crossorigin,
    hreflang: link.hreflang,
    title: link.title,
  })} />`;
}

function headTags(head: Omit<HeadConfig, "lang" | "theme"> | undefined): string[] {
  if (!head) return [];
  return [
    ...(head.stylesheets ?? []).map((href) => linkTag({ rel: "stylesheet", href })),
    ...(head.links ?? []).map(linkTag),
    ...(head.meta ?? []).map(
      (m) => `<meta${attrs({ name: m.name, property: m.property, "http-equiv": m.httpEquiv, content: m.content })} />`
    ),
    ...(head.scripts ?? []).map(
      (script) =>
        `<script${attrs({
          type: script.type === "classic" ? undefined : "module",
          src: script.src,
          defer: script.defer,
          async: script.async,
          crossorigin: script.crossorigin,
        })}></script>`
    ),
  ];
}

/** Whether this page gets the framework theme + default favicon. */
export function includesTheme(options: DocumentHeadOptions): boolean {
  const theme = options.appHead?.theme ?? "auto";
  if (theme === true || theme === false) return theme;
  return options.usedShell === true || options.clientRendered === true;
}

function renderHead(meta: DocumentMeta | undefined, options: DocumentHeadOptions = {}): string {
  const { title, description, og } = meta ?? {};
  const ogTitle = og?.title ?? title;
  const ogDescription = og?.description ?? description;
  const appHead = options.appHead;
  const extra = [...headTags(appHead), ...headTags(meta?.head)];
  const declaredMeta = [...(appHead?.meta ?? []), ...(meta?.head?.meta ?? [])];
  const declaredLinks = [...(appHead?.links ?? []), ...(meta?.head?.links ?? [])];
  const theme = includesTheme(options);
  const hasIcon = declaredLinks.some((l) => l.rel.split(/\s+/).includes("icon"));
  const hasViewport = declaredMeta.some((m) => m.name === "viewport");

  const lines = [
    `<meta charset="utf-8" />`,
    hasViewport ? "" : `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    theme && !hasIcon ? `<link rel="icon" href="${DEVORA_LOGO_URL}" />` : "",
    theme ? `<style>${THEME_CSS}</style>` : "",
    ...(options.styles ?? []).map((href) => linkTag({ rel: "stylesheet", href })),
    title ? `<title>${escapeHtml(title)}</title>` : "",
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : "",
    ogTitle ? `<meta property="og:title" content="${escapeHtml(ogTitle)}" />` : "",
    ogDescription ? `<meta property="og:description" content="${escapeHtml(ogDescription)}" />` : "",
    ogTitle || ogDescription ? `<meta property="og:type" content="${escapeHtml(og?.type ?? "website")}" />` : "",
    og?.image ? `<meta property="og:image" content="${escapeHtml(og.image)}" />` : "",
    og?.url ? `<meta property="og:url" content="${escapeHtml(og.url)}" />` : "",
    ...extra,
  ].filter(Boolean);

  return `<!doctype html>
<html${appHead?.lang ? ` lang="${escapeHtml(appHead.lang)}"` : ""}>
  <head>
    ${lines.join("\n    ")}
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
  /** Set only when the page rendered at least one island — see docs/history/BUILD-LOG.md #3. */
  islandScriptUrl?: string;
  /** Set only for a renderMode: "csr" page — the generic csr-client bootstrap
   * that mounts the route's component client-side (see csrRoute.ts). Mutually
   * exclusive with islandScriptUrl in practice: a csr route never runs the
   * island two-pass render at all. */
  csrScriptUrl?: string;
  /** Dev-mode-only virtual module URL for the React Refresh preamble — see
   * `renderTail`'s doc comment. Never set in production. */
  devPreambleUrl?: string;
  /** App head, route CSS, theme detection — see DocumentHeadOptions. */
  head?: DocumentHeadOptions;
}): string {
  return `${renderHead(opts.meta, opts.head)}    <div id="root">${opts.bodyHtml}</div>
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
export function renderDocumentHead(meta: DocumentMeta | undefined, options?: DocumentHeadOptions): string {
  return renderHead(meta, options);
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

/**
 * PageShell's markup as a plain string, for the framework's own pages that
 * render without React (the built-in error page, a backend-only app's
 * status page). `logo: false` for apps that have no public assets.
 */
export function renderShellMarkup(mainHtml: string, options: { mainClass?: string; badge?: string; logo?: boolean } = {}): string {
  const logo = options.logo === false ? "" : `<img src="${DEVORA_LOGO_URL}" alt="" width="28" height="28" />`;
  const badge = options.badge ? `<span class="devora-app-badge">${escapeHtml(options.badge)}</span>` : "";
  return (
    `<div class="devora-shell">` +
    `<header class="devora-header"><div class="devora-header-inner">` +
    `<a href="/" class="devora-brand" aria-label="devora.js home">${logo}<span>devora<span class="devora-js">.js</span></span></a>${badge}` +
    `</div></header>` +
    `<main class="devora-page${options.mainClass ? ` ${escapeHtml(options.mainClass)}` : ""}">${mainHtml}</main>` +
    `<footer class="devora-footer"><div class="devora-footer-inner"><div class="devora-footer-row">` +
    `<div class="devora-footer-brand"><span>Built with <a href="https://github.com/hassanalsa3aka/devora.js">devora.js</a></span></div>` +
    `</div></div></footer>` +
    `</div>`
  );
}
