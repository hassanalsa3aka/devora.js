import { PageShell } from "@devora/core";
import { ADMIN_NAV } from "../nav.js";

export const renderMode = "ssr";

// Real bug this route fixes: apps/admin previously had no route at all
// matching "/" — a visitor landing on the admin app's root URL (the first
// thing anyone naturally tries) hit an unmatched-route 404 that falls
// through to Vite's own raw dev handler (or a plain 404 in production),
// bypassing the shared header/theme entirely. Every app needs a real home
// route for the shared design to actually cover "the whole app," not just
// whichever routes happen to exist.
export function meta() {
  return { title: "Admin", description: "Admin panel" };
}

export async function loader() {
  return {};
}

export default function AdminHome() {
  return (
    <PageShell appName="admin" nav={ADMIN_NAV}>
      <h1>Admin panel</h1>
      <p>Isolated auth (its own session cookie, separate from marketing/dashboard) — log in below.</p>
      <div className="devora-card">
        <p style={{ margin: 0 }}>
          <a href="/login">Log in</a> to reach <a href="/bulk-import">Bulk import</a>.
        </p>
      </div>
    </PageShell>
  );
}
