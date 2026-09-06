import type { RequestContext } from "@devora/core";
import { redirect, CsrfField, PageShell } from "@devora/core";
import { ADMIN_NAV } from "../nav.js";

export const renderMode = "ssr";

// Fixes a real, confirmed gap: apps/admin has auth: "isolated" (its own
// devora_session_admin cookie/secret, per devora.config.ts) but had no
// route anywhere that could ever call ctx.setSession() for that cookie
// namespace — making bulk-import.tsx's ctx.requireAuth() permanently
// unsatisfiable. Dashboard's login.tsx can't serve admin: different cookie
// name and secret entirely, by design (§3's shared-vs-isolated auth).
export function meta() {
  return { title: "Admin log in", description: "Admin login (demo)" };
}

export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  const username = String(formData.get("username") ?? "");
  if (!username) throw new Error("username required");
  ctx.setSession({ username });
  return redirect("/bulk-import");
}

export default function AdminLogin({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="admin" nav={ADMIN_NAV}>
      <h1>Admin log in</h1>
      <p>
        <strong>Demo only</strong> — same carrier-only pattern as the dashboard's login route, but
        against admin's own isolated session cookie (see devora.config.ts's <code>auth: "isolated"</code>).
      </p>
      <form method="post">
        <CsrfField token={csrfToken} />
        <input name="username" placeholder="username" />
        <button type="submit">Log in</button>
      </form>
    </PageShell>
  );
}
