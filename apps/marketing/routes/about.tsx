// No explicit renderMode export — inherits app.config.ts's
// defaultRenderMode ("ssg") via resolveRenderMode(). Exists specifically to
// prove that inheritance actually works, not just the explicit-per-route
// case index.tsx already covers.
export function meta() {
  return { title: "About", description: "About this framework" };
}

import { PageShell } from "@devora/core";
import { MARKETING_NAV } from "../nav.js";

export async function loader() {
  return {};
}

export default function About() {
  return (
    <PageShell nav={MARKETING_NAV}>
      <h1>About</h1>
      <p>This route has no renderMode export — it inherits ssg from app.config.ts.</p>
    </PageShell>
  );
}
