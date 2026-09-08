import type { RequestContext } from "@devorajs/core";
import { redirect, CsrfField, PageShell } from "@devorajs/core";
import { DASHBOARD_NAV } from "../nav.js";

export const renderMode = "ssr";

// og:title/og:description fall back to title/description automatically
// (see packages/core/src/html.ts) — the explicit og block here just
// demonstrates the override, it isn't required to get OG tags at all.
export function meta() {
  return {
    title: "Log in",
    description: "Dashboard login (demo)",
    og: { type: "website" },
  };
}

// Demo only: the framework provides the session *carrier* (signing/cookie
// storage, see packages/core/src/session.ts) — checking who someone is
// stays bring-your-own per §6/§11. A real app verifies a password/token
// against its own DB/provider before calling ctx.setSession(); this route
// trusts any submitted username so the carrier can be exercised end to end.
export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  const username = String(formData.get("username") ?? "");
  if (!username) throw new Error("username required");
  ctx.setSession({ username });
  return redirect("/");
}

export default function Login({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="dashboard" nav={DASHBOARD_NAV}>
      <h1>Log in</h1>
      <p>
        <strong>Demo only</strong> — this accepts any username with no password check. Real
        credential verification is bring-your-own (§6/§11); this form exists to prove the session
        carrier (signed cookie, CSRF token, post-login redirect) works end to end, not as real auth.
      </p>
      <form method="post">
        <CsrfField token={csrfToken} />
        <input name="username" placeholder="username" />
        <button type="submit">Log in</button>
      </form>
    </PageShell>
  );
}
