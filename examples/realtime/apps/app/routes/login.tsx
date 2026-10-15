import type { RequestContext } from "@devorajs/core";
import { redirect, CsrfField, PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Log in", description: "app login (demo)" };
}

// Demo only: the framework provides the session itself (an opaque ID in an
// HttpOnly cookie, stored server-side and revocable). Checking who someone is
// stays bring-your-own (§6/§11): a real app verifies a password/token
// against its own DB/provider before calling ctx.setSession(); this route
// trusts any submitted username so the session flow can be exercised end to end.
export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  const username = String(formData.get("username") ?? "");
  if (!username) throw new Error("username required");
  await ctx.setSession({ username });
  return redirect("/");
}

export default function Login({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="app">
      <h1>Log in</h1>
      <p><strong>Demo only</strong> — accepts any username with no password check.</p>
      <form method="post">
        <CsrfField token={csrfToken} />
        <label htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" required />
        <button type="submit">Log in</button>
      </form>
    </PageShell>
  );
}
