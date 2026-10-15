import { HttpError, Island, PageShell, island, type RequestContext, type RouteComponentProps } from "@devorajs/core";
import { POSTS, findPost, type Post } from "../../posts.js";
import "../post.css";

// Pre-rendered at build time, one HTML file per slug below.
export const renderMode = "ssg";

export async function getStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function loader(ctx: RequestContext) {
  const post = findPost(String(ctx.params.slug ?? ""));
  if (!post) throw new HttpError(404, "No such post");
  return { post };
}

export function meta(data?: { post: Post }) {
  return data ? { title: data.post.title, description: data.post.body[0] } : { title: "Post" };
}

const LikeButton = island(() => import("../../components/LikeButton"));

export default function PostPage({ data }: RouteComponentProps<{ post: Post }>) {
  const post = data!.post;
  return (
    <PageShell appName="blog" nav={[{ label: "All posts", href: "/" }]}>
      <h1>{post.title}</h1>
      <p className="post-date">{post.date}</p>
      <div className="post-body">
        {post.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <Island component={LikeButton} props={{ label: post.title }} />
    </PageShell>
  );
}
