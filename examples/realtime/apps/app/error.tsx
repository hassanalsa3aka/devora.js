import { PageShell, type ErrorPageProps } from "@devorajs/core";

// Rendered for unmatched URLs (404) and for errors a page throws — an
// HttpError keeps its status (401 from ctx.requireAuth(), 403 from
// ctx.verifyCsrf(), your own 400/404). `message` is safe to show: for an
// unexpected error it's just "Internal Server Error" in production.
export function meta({ status }: ErrorPageProps) {
  return { title: status === 404 ? "Not found" : `Error ${status}` };
}

export default function ErrorPage({ status, message }: ErrorPageProps) {
  return (
    <PageShell appName="app">
      <div className="devora-error">
        <h1>{status}</h1>
        <p>{message}</p>
        <p><a className="devora-button" href="/">Back to the home page</a></p>
      </div>
    </PageShell>
  );
}
