// Island demo (ROADMAP.md #3): SSR renders the counter's real starting
// value below (view-source to confirm — no placeholder, no blank div),
// and the client hydration script only loads because this page actually
// used an island; /login and /settings have none and stay plain HTML.
//
// Counter lives in ../components, not ./ — the router treats every file
// under routes/ as a page (§4), so a colocated non-route file there would
// itself become an accidentally-servable route.
import { useEffect, useState, type ComponentType } from "react";
import { island, Island, clientOnly, PageShell } from "@devora/core";
import { DASHBOARD_NAV } from "../nav.js";

export const renderMode = "ssr";

const CounterIsland = island<{ start?: number }>(() => import("../components/Counter"));

// clientOnly() demo, distinct from the island above: unlike Island, this
// renders nothing on the server at all (view-source shows an empty slot),
// per its documented contract (architecture-v1.md §9 — "no server-side
// execution, no window is not defined crash", not "SSR content"). The
// caller is responsible for invoking it and mounting the result itself —
// there's no <Island>-style wrapper for this primitive.
const loadBrowserOnlyWidget = clientOnly(() => import("../components/BrowserOnlyWidget"));

export function meta() {
  return { title: "Dashboard", description: "Dashboard home" };
}

export async function loader() {
  return {};
}

export default function DashboardHome() {
  const [Widget, setWidget] = useState<ComponentType | null>(null);

  useEffect(() => {
    // On the server this resolves to undefined without ever calling the
    // loader (see clientOnly()'s implementation) — only a real browser
    // effect actually imports and mounts BrowserOnlyWidget.
    loadBrowserOnlyWidget().then((mod) => {
      if (mod) setWidget(() => mod.default);
    });
  }, []);

  return (
    <PageShell appName="dashboard" nav={DASHBOARD_NAV}>
      <h1>Dashboard</h1>
      <p>The counter below is an island: real SSR content, hydrates independently.</p>
      <div className="devora-card">
        <Island component={CounterIsland} props={{ start: 5 }} />
      </div>
      <p>The widget below is clientOnly(): empty on the server, fills in only in a real browser.</p>
      <div className="devora-card" id="browser-only-widget-slot">
        {Widget ? <Widget /> : null}
      </div>
    </PageShell>
  );
}
