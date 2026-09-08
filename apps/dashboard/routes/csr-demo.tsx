// csr demo (ROADMAP.md's render-modes item): the server renders only a
// shell (view-source shows an empty <div data-csr-entry>, no "CSR demo"
// text at all) — this component's actual markup only exists once
// csr-client.tsx imports and mounts it in a real browser. No loader runs
// anywhere for a csr route; this reads a client-only value (Date.now()) to
// make that concrete rather than just asserted.
// From "@devorajs/core/client", not the main entry — this route is built
// for the browser too (renderMode: "csr"), and the main barrel reaches
// server-only code (node:crypto etc.) that can't bundle for a browser
// target. See packages/core/src/client.ts for the real failure this avoids.
import { PageShell } from "@devorajs/core/client";
import { DASHBOARD_NAV } from "../nav.js";

export const renderMode = "csr";

export function meta() {
  return { title: "CSR demo", description: "Renders only in the browser" };
}

export default function CsrDemo() {
  return (
    <PageShell appName="dashboard" nav={DASHBOARD_NAV}>
      <h1>CSR demo</h1>
      <p>Mounted client-side at: {new Date().toISOString()}</p>
    </PageShell>
  );
}
