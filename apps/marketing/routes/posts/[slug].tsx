// Static-params demo (architecture-v2.md §3.6) — the real v1 gap this
// closes: a dynamic route pre-rendered at build time, one static file per
// getStaticParams() entry, instead of ssg/isr failing the build outright.
import type { RequestContext } from "@devorajs/core";
import { PageShell } from "@devorajs/core";
import { MARKETING_NAV } from "../../nav.js";

export const renderMode = "ssg";

const POSTS: Record<string, { title: string }> = {
  "hello-world": { title: "Hello, world" },
  "why-multi-app": { title: "Why multi-app" },
};

export async function getStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }));
}

export function meta(data?: { title: string }) {
  return { title: data?.title ?? "Post", description: "Static-params demo" };
}

export async function loader(ctx: RequestContext) {
  const post = POSTS[ctx.params.slug!];
  if (!post) throw new Error(`[marketing] unknown post slug: ${ctx.params.slug}`);
  return post;
}

export default function Post({ data }: { data?: { title: string } }) {
  return (
    <PageShell nav={MARKETING_NAV}>
      <h1>{data?.title}</h1>
      <p>
        Pre-rendered at build time via <code>getStaticParams()</code> — this exact page
        (<code>routes/posts/[slug].tsx</code>) has no fixed URL of its own; the build step called
        <code>getStaticParams()</code> and wrote one static file per entry it returned.
      </p>
    </PageShell>
  );
}
