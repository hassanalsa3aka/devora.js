import type { RequestContext } from "@devora/core";
import { redirect, CsrfField, PageShell } from "@devora/core";
import { DASHBOARD_NAV } from "../nav.js";

export const renderMode = "ssr";

export function meta() {
  return { title: "Log out", description: "Dashboard logout" };
}

// Ordinary file-based route (routes/logout.tsx) — the only genuinely
// special-cased path in this codebase's request handlers is /sitemap.xml;
// this needs no wiring beyond the route file itself.
export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  ctx.clearSession();
  return redirect("/login");
}

export default function Logout({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="dashboard" nav={DASHBOARD_NAV}>
      <h1>Log out</h1>
      {/* POST-only, never a bare <a href="/logout"> — a GET-triggered logout
          is itself a CSRF-adjacent footgun (any third-party page could fire
          it via <img>/navigation). */}
      <form method="post">
        <CsrfField token={csrfToken} />
        <button type="submit">Log out</button>
      </form>
    </PageShell>
  );
}
