# Page routes: requests, forms, errors, head and CSS

What a file under `apps/<name>/routes/` can do. Sessions and cookies are in
`packages/backend/AUTH.md`; API routes in `packages/core/README.md`.

## The request: `ctx.url`, `ctx.headers`, `ctx.ip`

`loader(ctx)` and `action(formData, ctx)` get the request:

```tsx
export function loader(ctx: RequestContext) {
  const q = ctx.url.searchParams.get("q") ?? "";      // query string
  const next = ctx.url.searchParams.get("next");
  const lang = ctx.headers.get("accept-language");    // a standard Headers
  return { q, next, lang, ip: ctx.ip, method: ctx.method };
}
```

- `ctx.url` is a `URL` of the request as the client sent it. Scheme and host come from the
  request, and from `X-Forwarded-Proto`/`-Host` when the app has `trustProxy` (app.config.ts).
  Like any Host-derived URL, check the host against your own domain before using it to build
  links you email out.
- `ctx.ip` is the socket's peer address. With `trustProxy: true` it's the address your proxy saw,
  read from `X-Forwarded-For`; `trustProxy: 2` trusts two proxies (e.g. a CDN in front of nginx).
  On Vercel/Netlify it's the platform's client IP.
- `ctx.request` is a standard `Request` (no body) for libraries that want one.
- API routes get the same `ctx` fields.
- At build time (`ssg`/`isr`), `ctx.url` is the page's own URL on the app's domain, `headers` is
  empty and `ip` is undefined.

To type `ctx.session` once instead of casting in every route:

```ts
// apps/<name>/session.d.ts (any .d.ts the app's tsconfig includes)
import "@devorajs/core";
declare module "@devorajs/core" {
  interface Register {
    session: { userId: string; role: "admin" | "user" };
  }
}
```

## Forms: what an action can return

```tsx
import { CsrfField, fail, redirect, type RequestContext, type RouteComponentProps } from "@devorajs/core";

export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  const code = String(formData.get("code") ?? "");
  if (!(await isValid(code))) return fail(400, { error: "Wrong code", code });
  return redirect("/welcome");                        // 303 See Other
}

export default function Verify({ csrfToken, actionData }: RouteComponentProps<unknown, { error?: string }>) {
  return (
    <form method="post">
      <CsrfField token={csrfToken} />
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
      <input name="code" /> <button>Verify</button>
    </form>
  );
}
```

| Return | Response |
|---|---|
| `redirect(to)` | 303 after a POST (so a refresh doesn't resubmit), 302 from a loader; `redirect(to, 301 \| 302 \| 307 \| 308)` to choose |
| `fail(status, data)` | the page re-rendered with that 4xx/5xx status; `data` is the `actionData` prop |
| anything else | the page re-rendered (200) with it as `actionData` |

A loader can also `return redirect(...)` or `throw redirect(...)` (e.g. "not logged in →
/login").

**Uploads.** `<form method="post" encType="multipart/form-data">` works: file fields arrive in
`formData` as `File` objects (`file.name`, `file.size`, `await file.arrayBuffer()`). The body limit
for forms and API routes is `maxBodyBytes` in app.config.ts (default 10 MB). A larger body gets a
413, and the browser actually receives it.

## Errors and the error page

A thrown `HttpError` keeps its status on page routes too: `ctx.requireAuth()` gives 401,
`ctx.verifyCsrf()` 403, and your own `throw new HttpError(404, "No such order")` 404. They used to
all be generic 500s. Anything else is a 500 whose message is shown in dev and replaced by
"Internal Server Error" in production; the real error is logged server-side.

These responses, and unmatched URLs (404), render the app's error page, `apps/<name>/error.tsx`.
New apps get one; without it a small built-in page is used.

```tsx
import { PageShell, type ErrorPageProps } from "@devorajs/core";
export function meta({ status }: ErrorPageProps) {
  return { title: status === 404 ? "Not found" : `Error ${status}` };
}
export default function ErrorPage({ status, message }: ErrorPageProps) {
  return <PageShell><h1>{status}</h1><p>{message}</p></PageShell>;
}
```

`message` is always safe to show.

## `<head>`: stylesheets, fonts, manifest, meta, scripts

App-wide, in `app.config.ts`:

```ts
export default defineApp({
  head: {
    lang: "en",
    stylesheets: ["/styles.css", "https://fonts.googleapis.com/css2?family=Inter"],
    links: [
      { rel: "icon", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
    ],
    meta: [{ name: "theme-color", content: "#0a0a12" }],
    scripts: [{ src: "/analytics.js", defer: true }],
  },
});
```

Per route, through `meta()`:

```ts
export function meta(data) {
  return { title: data.title, head: { links: [{ rel: "canonical", href: `https://example.com/p/${data.slug}` }] } };
}
```

Files under the app's public dir (`/styles.css`, `/favicon.png`) are served as-is.

- Scripts are external `src` only, because the default CSP blocks inline scripts.
- Loading fonts or styles from another origin needs your `security.csp` to allow that origin.

**The framework's own stylesheet is opt-in.** The theme CSS (including its `body` layout rules)
and the default Devora favicon are added only to pages that render `PageShell`/`AppHeader`, which
need them. CSR pages also get them by default, because the server can't see what they render.
`head: { theme: false }` turns them off everywhere; `theme: true` adds them to every page. A
`links` entry with `rel: "icon"` replaces the default favicon.

## CSS imported by a route

`import "./page.css"` (or a component's own `import "./card.css"`) is linked
in the page's `<head>` automatically, in dev, in the production build, and for `ssg`/`isr` HTML.
In production the files are emitted to `/assets/` with hashed names. `?inline`/`?raw`/`?url`
imports are values, not stylesheets, and are left alone.

## Islands

`island(() => import("./Counter"))` can be declared in any module the page imports, a shared
component included; it used to be found only in route files. The call must keep that exact
shape: a literal path, so the build knows which file to ship to the browser. Anything else
(`island(loader)`, a computed path) fails `devora dev`/`devora build` with the file and line, instead
of rendering an island that never hydrates.

## Dynamic and catch-all routes

| File | Matches | `ctx.params` | `ctx.catchAll` |
|---|---|---|---|
| `routes/users/[id].tsx` | `/users/42` | `{ id: "42" }` | `{}` |
| `routes/docs/[...slug].tsx` | `/docs/a`, `/docs/a/b/c` (not `/docs`) | `{ slug: "a/b/c" }` | `{ slug: ["a", "b", "c"] }` |
| `routes/docs/[[...slug]].tsx` | `/docs`, `/docs/a`, `/docs/a/b` | `{ slug: "" }` for `/docs` | `{ slug: [] }` for `/docs` |

- `ctx.params` values are always strings, so code written for `[id]` routes compiles and runs
  unchanged. A catch-all's segments are joined with `/` there; `ctx.catchAll` (and `req.catchAll`
  in an API route) has them as an array. A segment can never contain a `/` (an encoded `%2F` does
  not match), so the join loses nothing.
- Precedence is per segment: a static file wins over `[param]`, which wins over `[...slug]`. So
  with `docs/intro.tsx` and `docs/[...slug].tsx`, `/docs/intro` is the static page.
- A catch-all must be the last segment of the path. `docs/[...slug]/edit.tsx` is an error, and so
  are two files that match the same URLs (`[a].tsx` and `[b].tsx` side by side); the message names
  both files.
- Each segment is URL-decoded once. A segment that is empty, `.`, `..`, or contains `/`, `\` or a
  NUL byte (including as `%2F`, `%5C`, `%00`) never matches; the request gets the app's 404.
- A dot in a URL is not a file: `/docs/v1.2/intro` reaches the catch-all unless a real file with
  that path exists in the app's public folder.
- `ssg`/`isr` need `getStaticParams()`; for a catch-all it returns arrays:

  ```ts
  export function getStaticParams() {
    return [{ slug: ["intro"] }, { slug: ["guide", "setup"] }]; // /docs/intro, /docs/guide/setup
  }
  ```

  Those URLs are also what `sitemap.xml` lists for the route. A dynamic route without
  `getStaticParams()` is left out of the sitemap.
- API routes work the same way: `endpoints/files/[...path].ts` gets `req.params.path === "a/b"`
  and `req.catchAll.path === ["a", "b"]`.

## What runs at build time

`devora build` only imports (and so runs) routes that are `ssg` or `isr`, and what they import.
It reads each route's mode from its source (`export const renderMode = "ssr"`), so a module that
needs secrets at import time (a DB or storage client) no longer crashes a build that doesn't have
them, e.g. a Docker build stage. Two cases still run at build:

- `ssg`/`isr` routes and everything they import;
- a route whose `renderMode` isn't a plain string literal, which is imported to find out.

For those, don't do work that needs request-time secrets at import time: create the client lazily,
on first use.

## The shell: `PageShell` and its classes

`PageShell` renders a sticky header, a centred content column and a footer that stays at the
bottom of short pages. Its props:

- `appName` — the badge next to the logo;
- `nav` — header links, which wrap onto their own row on narrow screens;
- `footerLinks` — links next to the footer logo;
- `footer` — any footer content (copyright, links).

Classes you can use inside it:

| Class | For |
|---|---|
| `devora-lead` | a larger intro paragraph |
| `devora-card` | a bordered card |
| `devora-grid` | a responsive grid of `devora-card`s |
| `devora-button` | a link styled as the primary button (`<button>`s already are) |
| `devora-error` / `devora-status` | the centred error / status layout |
| `devora-gradient-text`, `devora-pill` | the brand gradient on text; a small status pill |

Forms inside the page are styled as cards, with full-width fields and labels above them.
Everything is plain CSS custom properties (`--devora-*`), dark by default with a light variant
from `prefers-color-scheme`. Override any token in your own stylesheet.
