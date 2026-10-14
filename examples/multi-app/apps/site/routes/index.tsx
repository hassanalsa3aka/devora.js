import { PageShell } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "site" };
}

export async function loader() {
  return {};
}

export default function Index() {
  return (
    <PageShell appName="site">
      <h1>Acme</h1>
      <p className="devora-lead">
        Notes for your team. <a href="http://localhost:10001/notes">Open the app</a>.
      </p>
      <p className="devora-lead">
        This page is <code>apps/site/routes/index.tsx</code>. Edit it and the dev server reloads.
      </p>
      <div className="devora-grid">
        <div className="devora-card">
          <h3>Add a page</h3>
          <p>Every file in <code>routes/</code> is a page: <code>routes/about.tsx</code> serves <code>/about</code>.</p>
        </div>
        <div className="devora-card">
          <h3>Add an API route</h3>
          <p><code>endpoints/hello.ts</code> serves <code>/api/hello</code> as JSON.</p>
        </div>
        <div className="devora-card">
          <h3>Deploy</h3>
          <p><code>npm run build</code>, then <code>npm start</code> — or Vercel, Netlify, Docker.</p>
        </div>
      </div>
    </PageShell>
  );
}
