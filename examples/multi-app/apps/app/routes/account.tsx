import type { RequestContext } from "@devorajs/core";
import { PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Account", description: "app account (protected demo)" };
}

// ctx.requireAuth() throws if there's no active session — see
// packages/core/src/session.ts and apps/dashboard/routes/settings.tsx for
// the same pattern against the shared backend.
export async function loader(ctx: RequestContext) {
  ctx.requireAuth();
  return { session: ctx.session };
}

export default function Account({ data }: { data?: { session: unknown } }) {
  return (
    <PageShell appName="app">
      <h1>Account</h1>
      <p>Protected demo route — only reachable with an active session (see routes/login.tsx).</p>
      <pre>{JSON.stringify(data?.session, null, 2)}</pre>
    </PageShell>
  );
}
