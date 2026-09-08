// Same function, same DB, same logic every app uses — the "one true
// shared backend" default from §3/§6. No fetch() + API route boilerplate.
import { updateSettings } from "@devorajs/backend/settings";
import type { RequestContext } from "@devorajs/core";
import { CsrfField, PageShell } from "@devorajs/core";
import { DASHBOARD_NAV } from "../nav.js";

export const renderMode = "ssr";

export async function loader() {
  return {};
}

// ctx is supplied by the framework's SSR request handler — a real, signed
// session (or undefined if not logged in; see apps/dashboard/routes/login.tsx
// and ROADMAP.md #2), not a stub.
export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  return updateSettings(
    { key: String(formData.get("key")), value: String(formData.get("value")) },
    ctx
  );
}

export default function Settings({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="dashboard" nav={DASHBOARD_NAV}>
      <h1>Settings</h1>
      <p>Calls the shared @devorajs/backend function directly — no separate admin copy of this logic.</p>
      <form method="post">
        <CsrfField token={csrfToken} />
        <label htmlFor="key">Key</label>
        <input id="key" name="key" placeholder="e.g. theme" />
        <label htmlFor="value">Value</label>
        <input id="value" name="value" placeholder="e.g. dark" />
        <button type="submit">Save</button>
      </form>
    </PageShell>
  );
}
