// Dynamic route demo — a static segment in the same position
// (`routes/settings.tsx`) never collides with this one; a URL like
// /users/settings is genuinely ambiguous only if both files existed at
// the exact same depth, and router.ts resolves that by picking the fewer-
// dynamic-segments match, not file-scan order. No such collision exists
// in this app today — this file just proves `ctx.params` is real.
import type { RequestContext } from "@devorajs/core";
import { PageShell } from "@devorajs/core";
import { DASHBOARD_NAV } from "../../nav.js";

export const renderMode = "ssr";

export function meta() {
  return { title: "User", description: "Dynamic route demo" };
}

export async function loader(ctx: RequestContext) {
  return { id: ctx.params.id };
}

export default function UserPage({ data }: { data?: { id: string } }) {
  return (
    <PageShell appName="dashboard" nav={DASHBOARD_NAV}>
      <h1>User {data?.id}</h1>
      <p>
        This route is <code>routes/users/[id].tsx</code> — <code>{"{data?.id}"}</code> above came
        from <code>ctx.params.id</code>, captured from the URL itself.
      </p>
    </PageShell>
  );
}
