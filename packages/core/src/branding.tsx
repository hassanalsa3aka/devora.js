/**
 * Standard page chrome every app uses (see docs/history/BUILD-LOG.md's shared-design
 * item) — one header with the real logo + wordmark + nav, one content
 * container, shared across marketing/dashboard/admin so a page looks the
 * same regardless of which app rendered it. Styling comes from theme.ts's
 * `THEME_CSS` (classNames here, not inline styles, so the whole theme is
 * edited in one place); this file only supplies the markup.
 */
import { createContext, createElement, useContext, type ReactNode } from "react";
import { DEVORA_LOGO_URL } from "./theme.js";

/**
 * Set by the server renderer for one page render; PageShell/AppHeader mark
 * it, which is how `head.theme: "auto"` knows the page needs the framework
 * stylesheet (html.ts). A page that never renders them gets no global CSS.
 */
export const ShellUsageContext = createContext<{ used: boolean } | null>(null);

function useMarkShellUsed(): void {
  const usage = useContext(ShellUsageContext);
  if (usage) usage.used = true;
}

export interface NavLink {
  label: string;
  href: string;
}

export function AppHeader({ appName, nav }: { appName?: string; nav?: NavLink[] }) {
  useMarkShellUsed();
  return (
    <header className="devora-header">
      <div className="devora-header-inner">
        <a href="/" className="devora-brand" aria-label="Home">
          {/* Intrinsic size on the element, so the header never shifts while the image loads. */}
          <img src={DEVORA_LOGO_URL} alt="" width={28} height={28} />
          <span>
            devora<span className="devora-js">.js</span>
          </span>
        </a>
        {appName ? <span className="devora-app-badge">{appName}</span> : null}
        {nav && nav.length > 0 ? (
          <nav className="devora-nav" aria-label="Main">
            {nav.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Wraps a route's content with the standard header + content column +
 * footer. `appName` labels which app this page belongs to (e.g.
 * "dashboard", "admin") — omit it for a page (like marketing) that doesn't
 * need the badge. `nav` is this app's own link set (see apps/*\/nav.ts) —
 * kept explicit per app rather than guessed from `appName` inside this
 * shared component, consistent with "explicit over implicit" (CLAUDE.md).
 * Routes render their own content directly (no `<main>` of their own).
 *
 * Footer: `footerLinks` renders a row of links next to the logo; `footer`
 * (any content — copyright, links) renders in the same footer, before the
 * "Built with devora.js" line. Both optional.
 *
 * The whole page sits in `.devora-shell` — a full-height column whose
 * `<main>` grows — so the footer stays at the bottom of a short page and
 * below the content of a long one. (Before round 3 it relied on `body`
 * being a flex column, but the document wraps everything in `<div
 * id="root">`, so the footer floated mid-screen on short pages.)
 */
export function PageShell({
  appName,
  nav,
  footer,
  footerLinks,
  children,
}: {
  appName?: string;
  nav?: NavLink[];
  footer?: ReactNode;
  footerLinks?: NavLink[];
  children: ReactNode;
}) {
  useMarkShellUsed();
  return (
    <div className="devora-shell">
      <AppHeader appName={appName} nav={nav} />
      <main className="devora-page">{children}</main>
      <footer className="devora-footer">
        <div className="devora-footer-inner">
          {footer ? <div className="devora-footer-custom">{footer}</div> : null}
          <div className="devora-footer-row">
            <div className="devora-footer-brand">
              <img src={DEVORA_LOGO_URL} alt="" width={18} height={18} />
              <span>
                Built with <a href="https://github.com/hassanalsa3aka/devora.js">devora.js</a>
              </span>
            </div>
            {footerLinks && footerLinks.length > 0 ? (
              <nav className="devora-footer-links" aria-label="Footer">
                {footerLinks.map((link) => (
                  <a key={link.href} href={link.href}>
                    {link.label}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
