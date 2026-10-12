/** Round 3 phase 5: the shell's markup contract (the sticky-footer fix depends on it) and the status page. */
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { PageShell } from "../branding.js";
import { THEME_CSS } from "../theme.js";
import { backendStatusFor } from "../httpError.js";

describe("PageShell", () => {
  it("wraps header, main and footer in .devora-shell, which is the full-height flex column", () => {
    const html = renderToString(createElement(PageShell, { appName: "web", children: createElement("p", null, "hi") }));
    expect(html).toMatch(/^<div class="devora-shell"><header class="devora-header">/);
    expect(html).toContain('<main class="devora-page"><p>hi</p></main>');
    expect(THEME_CSS).toMatch(/\.devora-shell \{\s*min-height: 100vh;\s*min-height: 100dvh;\s*display: flex;\s*flex-direction: column;/);
    expect(THEME_CSS).toMatch(/\.devora-page \{\s*flex: 1 0 auto;/);
    // The old global body layout is gone: the theme no longer makes <body> a flex box.
    expect(THEME_CSS).not.toMatch(/body \{[^}]*display: flex/);
  });

  it("nav, the existing footer prop, and the new footerLinks prop all render", () => {
    const html = renderToString(
      createElement(PageShell, {
        nav: [{ label: "Home", href: "/" }],
        footer: createElement("span", null, "© Example"),
        footerLinks: [{ label: "Privacy", href: "/privacy" }],
        children: null,
      })
    );
    expect(html).toContain('<nav class="devora-nav" aria-label="Main"><a href="/">Home</a></nav>');
    expect(html).toContain('<div class="devora-footer-custom"><span>© Example</span></div>');
    expect(html).toContain('<nav class="devora-footer-links" aria-label="Footer"><a href="/privacy">Privacy</a></nav>');
  });

  it("logo images carry their size (no layout shift while loading)", () => {
    const html = renderToString(createElement(PageShell, { children: null }));
    expect(html).toContain('width="28" height="28"');
    expect(html).toContain('width="18" height="18"');
  });
});

describe("backend-only status at /", () => {
  it("HTML for a browser, JSON for an API client", () => {
    const page = backendStatusFor("api", "text/html,application/xhtml+xml,*/*;q=0.8");
    expect(page.headers?.["Content-Type"]).toMatch(/^text\/html/);
    expect(page.body).toContain('<span class="devora-pill">API is running</span>');
    expect(page.body).toContain(THEME_CSS);
    expect(page.body).not.toContain("<img"); // no public assets in a backend-only app
    const json = backendStatusFor("api", "application/json");
    expect(JSON.parse(json.body!)).toEqual({ app: "api", status: "ok", api: "/api" });
    expect(JSON.parse(backendStatusFor("api", undefined).body!).status).toBe("ok");
  });
});
