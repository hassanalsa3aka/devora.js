/**
 * Shared visual identity (logo + one small theme), used by every app so a
 * page looks the same whether it's marketing, dashboard, or admin. Dark by
 * default (matches the brand's primary dark presentation, see
 * assets/icons/devorajs.png) with an automatic light variant via
 * `prefers-color-scheme` — no toggle button, no client JS, no new CSP
 * allowance needed (this is a plain `<style>` block, already covered by the
 * existing `style-src 'self' 'unsafe-inline'` default). A developer whose
 * OS is set to light mode gets a light page automatically while building;
 * everyone else sees the dark brand theme.
 *
 * Logo files live in the repo-root `assets/icons/` folder, not duplicated
 * per app — each app's `vite.config.ts` sets `publicDir` to point there
 * directly (see apps/*\/vite.config.ts), so `/icons/<file>.png` resolves in
 * both dev and a real production build without copying binaries three times.
 */
export const DEVORA_LOGO_URL = "/icons/devorajs-logo-withoutbg.png";

export const THEME_CSS = `
:root {
  color-scheme: dark light;
  --devora-font: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --devora-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  --devora-text-xs: 0.75rem;
  --devora-text-sm: 0.875rem;
  --devora-text-base: 1rem;
  --devora-text-lg: 1.125rem;
  --devora-text-xl: 1.375rem;
  --devora-text-2xl: clamp(1.875rem, 1.45rem + 1.6vw, 2.5rem);
  --devora-space-1: 0.25rem;
  --devora-space-2: 0.5rem;
  --devora-space-3: 0.75rem;
  --devora-space-4: 1rem;
  --devora-space-6: 1.5rem;
  --devora-space-8: 2rem;
  --devora-space-12: 3rem;
  --devora-radius-sm: 6px;
  --devora-radius: 10px;
  --devora-radius-lg: 14px;
  --devora-content-width: 760px;
  --devora-wide-width: 1120px;
  --devora-gutter: clamp(1rem, 0.6rem + 1.8vw, 1.5rem);

  --devora-bg: #0b0b12;
  --devora-surface: #11111a;
  --devora-header-bg: rgba(17, 17, 26, 0.85);
  --devora-card: #15151f;
  --devora-fg: #f4f4f6;
  --devora-fg-muted: #a6a6b8;
  --devora-fg-subtle: #8a8a9e;
  --devora-border: #262633;
  --devora-border-strong: #383850;
  --devora-accent-from: #3b82f6;
  --devora-accent-to: #a855f7;
  --devora-button-from: #2563eb;
  --devora-button-to: #7c3aed;
  --devora-link: #93b8ff;
  --devora-ring: rgba(120, 160, 255, 0.55);
  --devora-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.45);
  --devora-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.28);
  --devora-hover: rgba(255, 255, 255, 0.06);
}
@media (prefers-color-scheme: light) {
  :root {
    --devora-bg: #f7f7fa;
    --devora-surface: #ffffff;
    --devora-header-bg: rgba(255, 255, 255, 0.88);
    --devora-card: #ffffff;
    --devora-fg: #15151e;
    --devora-fg-muted: #4c4c5c;
    --devora-fg-subtle: #646475;
    --devora-border: #e3e3eb;
    --devora-border-strong: #cdcdd9;
    --devora-accent-from: #2563eb;
    --devora-accent-to: #9333ea;
    --devora-link: #1d4ed8;
    --devora-ring: rgba(37, 99, 235, 0.45);
    --devora-shadow-sm: 0 1px 2px rgba(20, 20, 40, 0.06);
    --devora-shadow: 0 1px 2px rgba(20, 20, 40, 0.05), 0 8px 24px rgba(20, 20, 40, 0.07);
    --devora-hover: rgba(20, 20, 40, 0.05);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--devora-bg);
  color: var(--devora-fg);
  font-family: var(--devora-font);
  font-size: var(--devora-text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: var(--devora-link); text-underline-offset: 3px; text-decoration-thickness: 1px; }
a:hover { text-decoration-thickness: 2px; }
:where(a, button, input, textarea, select, summary):focus-visible {
  outline: 2px solid var(--devora-ring);
  outline-offset: 2px;
  border-radius: var(--devora-radius-sm);
}
h1, h2, h3 { line-height: 1.2; color: var(--devora-fg); }
code {
  font-family: var(--devora-mono);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: 5px;
  padding: 0.1em 0.4em;
  font-size: 0.875em;
}
img { max-width: 100%; }

/* Shell: full-height column; <main> grows, so the footer sits at the
   bottom of a short page and below the content of a long one. */
.devora-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* Header */
.devora-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--devora-header-bg);
  -webkit-backdrop-filter: saturate(180%) blur(10px);
  backdrop-filter: saturate(180%) blur(10px);
  border-bottom: 1px solid var(--devora-border);
}
.devora-header-inner {
  max-width: var(--devora-wide-width);
  margin: 0 auto;
  min-height: 60px;
  padding: var(--devora-space-2) var(--devora-gutter);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--devora-space-2) var(--devora-space-4);
}
.devora-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--devora-space-2);
  text-decoration: none;
  color: var(--devora-fg);
  font-weight: 700;
  font-size: var(--devora-text-lg);
  letter-spacing: -0.01em;
  flex-shrink: 0;
}
.devora-brand img { height: 28px; width: 28px; display: block; }
.devora-brand .devora-js, .devora-gradient-text {
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.devora-app-badge {
  font-size: var(--devora-text-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--devora-fg-muted);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  flex-shrink: 0;
}
.devora-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--devora-space-1);
  margin-left: auto;
}
.devora-nav a {
  color: var(--devora-fg-muted);
  text-decoration: none;
  font-size: var(--devora-text-sm);
  font-weight: 500;
  white-space: nowrap;
  padding: 0.4rem 0.65rem;
  border-radius: var(--devora-radius-sm);
  transition: color 0.15s ease, background-color 0.15s ease;
}
.devora-nav a:hover, .devora-nav a[aria-current="page"] { color: var(--devora-fg); background: var(--devora-hover); }
@media (max-width: 640px) {
  /* The nav takes its own row and wraps — no hidden, sideways-scrolling links. */
  .devora-nav { order: 3; width: 100%; margin: 0 calc(-1 * var(--devora-space-2)); }
}

/* Page content: one centered reading column */
.devora-page {
  flex: 1 0 auto;
  width: 100%;
  max-width: calc(var(--devora-content-width) + 2 * var(--devora-gutter));
  margin: 0 auto;
  padding: clamp(2rem, 1.2rem + 3.5vw, 4rem) var(--devora-gutter) clamp(3rem, 2rem + 4vw, 5rem);
}
.devora-page > :first-child { margin-top: 0; }
.devora-page h1 {
  font-size: var(--devora-text-2xl);
  letter-spacing: -0.02em;
  margin: 0 0 var(--devora-space-4);
}
.devora-page h2 {
  font-size: var(--devora-text-xl);
  letter-spacing: -0.01em;
  margin: var(--devora-space-12) 0 var(--devora-space-4);
  padding-bottom: var(--devora-space-2);
  border-bottom: 1px solid var(--devora-border);
}
.devora-page h3 { font-size: var(--devora-text-lg); margin: var(--devora-space-8) 0 var(--devora-space-3); }
.devora-page p { margin: 0 0 var(--devora-space-4); color: var(--devora-fg-muted); }
.devora-page p code, .devora-page li code { color: var(--devora-fg); }
.devora-lead { font-size: var(--devora-text-lg); color: var(--devora-fg-muted); max-width: 60ch; }
.devora-page strong { color: var(--devora-fg); }
.devora-page ul, .devora-page ol { color: var(--devora-fg-muted); padding-left: 1.25rem; margin: 0 0 var(--devora-space-4); }
.devora-page li { margin: var(--devora-space-2) 0; }
.devora-page li::marker { color: var(--devora-accent-from); }
.devora-page hr { border: 0; border-top: 1px solid var(--devora-border); margin: var(--devora-space-8) 0; }
.devora-page pre {
  margin: 0 0 var(--devora-space-6);
  padding: var(--devora-space-4) 1.125rem;
  overflow-x: auto;
  font-size: var(--devora-text-sm);
  line-height: 1.65;
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius);
}
.devora-page pre code { background: transparent; border: none; padding: 0; font-size: 1em; }

/* Cards, and a responsive grid of them */
.devora-card {
  padding: var(--devora-space-6);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius-lg);
  box-shadow: var(--devora-shadow-sm);
  margin: var(--devora-space-6) 0;
}
.devora-card > :first-child { margin-top: 0; }
.devora-card > :last-child { margin-bottom: 0; }
.devora-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--devora-space-4);
  margin: var(--devora-space-8) 0;
}
.devora-grid > .devora-card { margin: 0; }
.devora-card h3 { margin: 0 0 var(--devora-space-2); font-size: var(--devora-text-base); }

/* Forms: a card, labels above full-width fields */
.devora-page form {
  display: flex;
  flex-direction: column;
  gap: var(--devora-space-4);
  max-width: 440px;
  margin: var(--devora-space-6) 0;
  padding: var(--devora-space-6);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius-lg);
  box-shadow: var(--devora-shadow);
}
.devora-page label {
  font-size: var(--devora-text-sm);
  font-weight: 600;
  color: var(--devora-fg);
  margin-bottom: calc(-1 * var(--devora-space-2));
}
.devora-page input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
.devora-page textarea,
.devora-page select {
  width: 100%;
  min-height: 42px;
  padding: 0.55rem 0.75rem;
  border-radius: var(--devora-radius-sm);
  border: 1px solid var(--devora-border-strong);
  background: var(--devora-bg);
  color: var(--devora-fg);
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.devora-page textarea { min-height: 6rem; resize: vertical; }
.devora-page input::placeholder, .devora-page textarea::placeholder { color: var(--devora-fg-subtle); }
.devora-page input:focus, .devora-page textarea:focus, .devora-page select:focus {
  outline: none;
  border-color: var(--devora-accent-from);
  box-shadow: 0 0 0 3px var(--devora-ring);
}
.devora-page button, .devora-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--devora-space-2);
  min-height: 42px;
  padding: 0.55rem 1.25rem;
  border-radius: var(--devora-radius-sm);
  border: none;
  /* Darker than the brand gradient so white text stays above 4.5:1 contrast. */
  background: linear-gradient(90deg, var(--devora-button-from), var(--devora-button-to));
  color: #ffffff;
  font: inherit;
  font-weight: 600;
  font-size: var(--devora-text-sm);
  text-decoration: none;
  cursor: pointer;
  align-self: flex-start;
  box-shadow: var(--devora-shadow-sm);
  transition: filter 0.15s ease, transform 0.1s ease;
}
.devora-page button:hover, .devora-button:hover { filter: brightness(1.08); }
.devora-page button:active, .devora-button:active { transform: translateY(1px); }
.devora-page button:disabled { opacity: 0.55; cursor: not-allowed; }

/* Error and status pages */
.devora-error, .devora-status { text-align: center; padding-top: clamp(3rem, 2rem + 8vw, 7rem); }
.devora-error h1, .devora-status h1 {
  font-size: clamp(3rem, 2rem + 6vw, 5rem);
  letter-spacing: -0.04em;
  margin-bottom: var(--devora-space-2);
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.devora-status h1 { font-size: var(--devora-text-2xl); }
.devora-error pre { text-align: left; }
.devora-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--devora-space-2);
  font-size: var(--devora-text-sm);
  font-weight: 600;
  color: var(--devora-fg);
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: 999px;
  padding: 0.3rem 0.8rem;
}
.devora-pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }

/* Footer */
.devora-footer {
  border-top: 1px solid var(--devora-border);
  background: var(--devora-surface);
  color: var(--devora-fg-subtle);
  font-size: var(--devora-text-sm);
}
.devora-footer-inner {
  max-width: var(--devora-wide-width);
  margin: 0 auto;
  padding: var(--devora-space-6) var(--devora-gutter);
  display: flex;
  flex-direction: column;
  gap: var(--devora-space-4);
}
.devora-footer a { color: var(--devora-fg-muted); }
.devora-footer a:hover { color: var(--devora-fg); }
.devora-footer-custom, .devora-footer-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--devora-space-3) var(--devora-space-8);
}
.devora-footer-brand { display: inline-flex; align-items: center; gap: var(--devora-space-2); }
.devora-footer-brand a { text-decoration: none; font-weight: 600; }
.devora-footer img { height: 18px; width: 18px; display: block; }
.devora-footer-links { display: flex; flex-wrap: wrap; gap: var(--devora-space-2) var(--devora-space-6); }
.devora-footer-links a { text-decoration: none; }

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; }
}
`;
