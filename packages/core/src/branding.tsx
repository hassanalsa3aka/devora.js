/**
 * Standard page chrome every app uses (see ROADMAP.md's shared-design
 * item) — one header with the real logo + wordmark + nav, one content
 * container, shared across marketing/dashboard/admin so a page looks the
 * same regardless of which app rendered it. Styling comes from theme.ts's
 * `THEME_CSS` (classNames here, not inline styles, so the whole theme is
 * edited in one place); this file only supplies the markup.
 */
import { createElement, type ReactNode } from "react";
import { DEVORA_LOGO_URL } from "./theme.js";

export interface NavLink {
  label: string;
  href: string;
}

export function AppHeader({ appName, nav }: { appName?: string; nav?: NavLink[] }) {
  return (
    <header className="devora-header">
      <div className="devora-header-left">
        <a href="/" className="devora-brand">
          <img src={DEVORA_LOGO_URL} alt="" />
          <span>
            devora<span className="devora-js">.js</span>
          </span>
        </a>
        {nav && nav.length > 0 ? (
          <nav className="devora-nav">
            {nav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
      {appName ? <span className="devora-app-badge">{appName}</span> : null}
    </header>
  );
}

/**
 * Wraps a route's content with the standard header + content container.
 * `appName` labels which app this page belongs to (e.g. "dashboard",
 * "admin") — omit it for a page (like marketing) that doesn't need the
 * badge. `nav` is this app's own link set (see apps/*\/nav.ts) — kept
 * explicit per app rather than guessed from `appName` inside this shared
 * component, consistent with "explicit over implicit" (CLAUDE.md). Routes
 * should render their own content directly (no `<main>` wrapper of their
 * own) — this component supplies that.
 */
export function PageShell({
  appName,
  nav,
  children,
}: {
  appName?: string;
  nav?: NavLink[];
  children: ReactNode;
}) {
  return (
    <>
      <AppHeader appName={appName} nav={nav} />
      <main className="devora-page">{children}</main>
      <footer className="devora-footer">
        <img src={DEVORA_LOGO_URL} alt="" />
        <span>Built with devora.js</span>
      </footer>
    </>
  );
}
