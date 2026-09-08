// isr demo (ROADMAP.md's render-modes item): revalidate.seconds is short on
// purpose so staleness/regeneration is actually observable in a manual
// test — a real page would use something like 3600.
export const renderMode = "isr";
export const revalidate = { seconds: 5 };

export function meta() {
  return { title: "ISR demo", description: "Regenerates at most once per 5 seconds" };
}

import { PageShell } from "@devorajs/core";
import { MARKETING_NAV } from "../nav.js";

export async function loader() {
  return { renderedAt: new Date().toISOString() };
}

export default function IsrDemo({ data }: { data?: { renderedAt: string } }) {
  return (
    <PageShell nav={MARKETING_NAV}>
      <h1>ISR demo</h1>
      <p>Rendered at: {data?.renderedAt}</p>
      <div className="devora-card">
        <p style={{ margin: 0 }}>
          Refresh within 5 seconds and this timestamp stays the same (cached); after 5 seconds, the
          next request regenerates it.
        </p>
      </div>
    </PageShell>
  );
}
