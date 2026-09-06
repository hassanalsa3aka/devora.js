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
  --devora-bg: #0a0a12;
  --devora-bg-elevated: #13131f;
  --devora-card: #15151f;
  --devora-fg: #f5f5f7;
  --devora-fg-muted: #9d9db0;
  --devora-border: #26262f;
  --devora-accent-from: #3b82f6;
  --devora-accent-to: #a855f7;
  --devora-link: #93c5fd;
  --devora-shadow: 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.25);
  --devora-radius: 10px;
}
@media (prefers-color-scheme: light) {
  :root {
    --devora-bg: #fafafc;
    --devora-bg-elevated: #ffffff;
    --devora-card: #ffffff;
    --devora-fg: #16161f;
    --devora-fg-muted: #5c5c6b;
    --devora-border: #e6e6ee;
    --devora-accent-from: #2563eb;
    --devora-accent-to: #9333ea;
    --devora-link: #2563eb;
    --devora-shadow: 0 1px 2px rgba(20, 20, 40, 0.04), 0 8px 24px rgba(20, 20, 40, 0.06);
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--devora-bg);
  color: var(--devora-fg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: var(--devora-link); }
h1, h2, h3 { line-height: 1.25; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--devora-bg-elevated);
  border: 1px solid var(--devora-border);
  border-radius: 4px;
  padding: 0.1em 0.4em;
  font-size: 0.9em;
}

/* Header */
.devora-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.875rem 1.5rem;
  background: var(--devora-bg-elevated);
  border-bottom: 1px solid var(--devora-border);
  position: sticky;
  top: 0;
  z-index: 10;
}
.devora-header-left { display: flex; align-items: center; gap: 1.75rem; min-width: 0; }
.devora-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--devora-fg);
  font-weight: 700;
  font-size: 1.125rem;
  flex-shrink: 0;
}
.devora-brand img { height: 26px; width: 26px; display: block; }
.devora-brand .devora-js {
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.devora-nav {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  overflow-x: auto;
}
.devora-nav a {
  color: var(--devora-fg-muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  transition: color 0.15s ease;
}
.devora-nav a:hover { color: var(--devora-fg); }
.devora-app-badge {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--devora-fg-muted);
  border: 1px solid var(--devora-border);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  flex-shrink: 0;
}

/* Page content */
.devora-page {
  flex: 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
}
.devora-page h1 { font-size: 1.875rem; margin: 0 0 0.625rem; letter-spacing: -0.01em; }
.devora-page > p:first-of-type { margin-top: 0; }
.devora-page p { line-height: 1.65; color: var(--devora-fg-muted); }
.devora-page p code { color: var(--devora-fg); }

/* Forms rendered as a card, not bare inputs floating in the page */
.devora-page form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 420px;
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius);
  box-shadow: var(--devora-shadow);
}
.devora-page label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--devora-fg-muted);
  margin-bottom: -0.5rem;
}
.devora-page input, .devora-page textarea {
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--devora-border);
  background: var(--devora-bg);
  color: var(--devora-fg);
  font: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.devora-page textarea { min-height: 6rem; resize: vertical; }
.devora-page input::placeholder, .devora-page textarea::placeholder { color: var(--devora-fg-muted); }
.devora-page input:focus, .devora-page textarea:focus {
  outline: none;
  border-color: var(--devora-accent-from);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}
.devora-page button {
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  border: none;
  background: linear-gradient(90deg, var(--devora-accent-from), var(--devora-accent-to));
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  align-self: flex-start;
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.devora-page button:hover { opacity: 0.92; }
.devora-page button:active { transform: translateY(1px); }
.devora-page button:focus-visible {
  outline: 2px solid var(--devora-accent-from);
  outline-offset: 2px;
}

/* A card-like group for non-form content (e.g. a list, a demo widget) */
.devora-card {
  padding: 1.5rem;
  background: var(--devora-card);
  border: 1px solid var(--devora-border);
  border-radius: var(--devora-radius);
  box-shadow: var(--devora-shadow);
  margin-top: 1.25rem;
}

/* Footer */
.devora-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: var(--devora-fg-muted);
  font-size: 0.8rem;
  border-top: 1px solid var(--devora-border);
}
.devora-footer img { height: 16px; width: 16px; opacity: 0.7; }
`;
