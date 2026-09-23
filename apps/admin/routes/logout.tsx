import type { RequestContext } from "@devorajs/core";
import { redirect, CsrfField, PageShell } from "@devorajs/core";
import { ADMIN_NAV } from "../nav.js";

export const renderMode = "ssr";

export function meta() {
  return { title: "Admin log out", description: "Admin logout" };
}

export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  // Revoked server-side, not just a cookie deleted from this browser — the
  // session ID is dead everywhere (including as a Bearer token) from here on.
  await ctx.revokeSession();
  return redirect("/login");
}

export default function AdminLogout({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="admin" nav={ADMIN_NAV}>
      <h1>Admin log out</h1>
      <form method="post">
        <CsrfField token={csrfToken} />
        <button type="submit">Log out</button>
      </form>
    </PageShell>
  );
}
