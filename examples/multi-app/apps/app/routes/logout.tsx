import type { RequestContext } from "@devorajs/core";
import { redirect, CsrfField, PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Log out", description: "app logout" };
}

export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  // Revoked server-side — dead everywhere, not just in this browser.
  await ctx.revokeSession();
  return redirect("/login");
}

export default function Logout({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="app">
      <h1>Log out</h1>
      {/* POST-only, never a bare <a href="/logout"> — a GET-triggered logout
          is itself a CSRF-adjacent footgun. */}
      <form method="post">
        <CsrfField token={csrfToken} />
        <button type="submit">Log out</button>
      </form>
    </PageShell>
  );
}
