// Streaming demo (architecture-v2.md's Phase 3) — the same real Counter
// island `routes/index.tsx` already uses, just under renderMode:
// "streaming" instead of "ssr". The island's own import is fast here, so
// this mainly proves the wiring is real end-to-end; genuinely observing
// the shell arriving before a slow island resolves is what
// renderStreaming.test.ts verifies directly (a real, artificially deferred
// import, checked mid-stream) — that's the actual mechanism this route
// exercises, just without a fake delay in checked-in demo code.
import { island, Island, PageShell } from "@devorajs/core";
import { DASHBOARD_NAV } from "../nav.js";

export const renderMode = "streaming";

const CounterIsland = island<{ start?: number }>(() => import("../components/Counter"));

export function meta() {
  return { title: "Streaming demo", description: "renderMode: streaming, with a real island" };
}

export async function loader() {
  return { renderedAt: new Date().toISOString() };
}

export default function StreamingDemo({ data }: { data?: { renderedAt: string } }) {
  return (
    <PageShell appName="dashboard" nav={DASHBOARD_NAV}>
      <h1>Streaming demo</h1>
      <p>Rendered at: {data?.renderedAt}</p>
      <p>
        This page streams: the shell above is sent immediately, and the island below is wrapped in
        a real React Suspense boundary — its fallback (<code>data-island-pending</code>) streams
        first, then React patches in the real markup once the island's import resolves.
      </p>
      <div className="devora-card">
        <Island component={CounterIsland} props={{ start: 0 }} />
      </div>
    </PageShell>
  );
}
