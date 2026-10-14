import { PageShell } from "@devorajs/core";
import { POSTS } from "../posts.js";

export const renderMode = "ssg";

export function meta() {
  return { title: "Blog", description: "A content site built with Devora.js: ssg pages and one island." };
}

export async function loader() {
  return { posts: POSTS.map(({ slug, title, date }) => ({ slug, title, date })) };
}

export default function Index({ data }: { data?: { posts: { slug: string; title: string; date: string }[] } }) {
  return (
    <PageShell appName="blog">
      <h1>Blog</h1>
      <p className="devora-lead">Every page here is pre-rendered at build time.</p>
      <div className="devora-grid">
        {data?.posts.map((p) => (
          <a className="devora-card" href={`/posts/${p.slug}`} key={p.slug}>
            <h3>{p.title}</h3>
            <p>{p.date}</p>
          </a>
        ))}
      </div>
    </PageShell>
  );
}
