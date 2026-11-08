import { PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "About", description: "The same route as a website and in a desktop window." };
}

export default function About() {
  return (
    <PageShell appName="web">
      <h1>About</h1>
      <p>
        This page is served by the app's own server. In a browser it comes from <code>devora start</code>; in the
        desktop window it comes from the same server started as a sidecar on 127.0.0.1, behind a per-launch token.
      </p>
      <p>
        <a href="/">Home</a> · <a href="/api/time">/api/time</a>
      </p>
    </PageShell>
  );
}
