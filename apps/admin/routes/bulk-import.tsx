import type { RequestContext } from "@devorajs/core";
import { CsrfField, PageShell } from "@devorajs/core";
import { serverFn } from "@devorajs/core";
import { ADMIN_NAV } from "../nav.js";

// This one lives only in admin — no other app needs it. This is the
// per-function opt-out from the shared backend default (§6), used only
// when something is genuinely app-specific.
export const bulkImportUsers = serverFn(async (input: { rows: string[] }, ctx) => {
  ctx.requireAuth();
  return { imported: input.rows.length };
});

export const renderMode = "ssr";

export function meta() {
  return { title: "Bulk import", description: "Admin-only bulk import" };
}

// Previously this route had no `action` at all — bulkImportUsers was
// defined but nothing ever called it, and (before apps/admin/routes/login.tsx
// existed) requireAuth() inside it could never pass anyway, since nothing
// could set the isolated devora_session_admin cookie. Both gaps are closed
// together here.
export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  const rows = String(formData.get("rows") ?? "")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  return bulkImportUsers({ rows }, ctx);
}

export default function BulkImport({ csrfToken }: { csrfToken?: string }) {
  return (
    <PageShell appName="admin" nav={ADMIN_NAV}>
      <h1>Bulk import</h1>
      <p>Admin-only function — defined locally instead of in @devorajs/backend.</p>
      <form method="post">
        <CsrfField token={csrfToken} />
        <label htmlFor="rows">Rows</label>
        <textarea id="rows" name="rows" placeholder="one row per line" />
        <button type="submit">Import</button>
      </form>
    </PageShell>
  );
}
