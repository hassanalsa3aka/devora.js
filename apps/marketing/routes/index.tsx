// Explicit render mode per route (§5) — this page overrides nothing and
// just inherits the app default (ssg) declared in app.config.ts.
export const renderMode = "ssg";

// Per-route SEO primitive (§8) — auto-collected into sitemap.xml.
export function meta() {
  return {
    title: "My Framework — security-first, multi-app by default",
    description:
      "A Vite-based framework with native multi-app support: marketing site, product app, and admin panel sharing one core.",
  };
}

import { PageShell } from "@devora/core";
import { MARKETING_NAV } from "../nav.js";

export async function loader() {
  return {};
}

export default function MarketingHome() {
  return (
    <PageShell nav={MARKETING_NAV}>
      <h1>My Framework</h1>
      <p>One project. Marketing site, dashboard, and admin panel — sharing one backend.</p>
    </PageShell>
  );
}
