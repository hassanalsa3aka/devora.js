# Example: content-site

A small blog where every page is pre-rendered at build time and one component is interactive.

- `apps/blog/app.config.ts` — `defaultRenderMode: "ssg"`, `sitemap: true`, `head: { lang: "en" }`.
- `routes/index.tsx` — the post list.
- `routes/posts/[slug].tsx` — one dynamic route; `getStaticParams()` lists the slugs and the build
  writes one HTML file per post. An unknown slug is a 404 (rendered by `error.tsx`).
- `components/LikeButton.tsx` — an island: the only JavaScript the post page sends.
- `routes/post.css` — imported by the post route and linked in its `<head>` automatically.
- `posts.ts` — the content. Swap in Markdown files or a CMS; anything the build can call works.

No login: the app has `auth: "none"`, so it needs no session secret or store.

## Run it

```bash
npm ci
npm run dev        # http://localhost:10000
npm run build      # pre-renders /, /posts/hello-islands, /posts/static-params
npm start          # serves the build on http://localhost:4173
```

Known gap (Devora.js 0.3.2): `/sitemap.xml` leaves out dynamic routes, even ones with
`getStaticParams()`, so the posts aren't in it yet.

This example hasn't been deployed; it's built and checked in CI (`../check.mjs`).
