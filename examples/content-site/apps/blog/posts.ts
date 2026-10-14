// The site's content. A real site might read Markdown files or a CMS here;
// anything the build can call works, because every page is pre-rendered.
export interface Post {
  slug: string;
  title: string;
  date: string;
  body: string[];
}

export const POSTS: Post[] = [
  {
    slug: "hello-islands",
    title: "Hello, islands",
    date: "2026-10-14",
    body: [
      "This page was rendered to HTML once, at build time (renderMode \"ssg\").",
      "The like button below is an island: the only part of the page that ships JavaScript and hydrates in the browser.",
    ],
  },
  {
    slug: "static-params",
    title: "One file, many pages",
    date: "2026-10-13",
    body: [
      "routes/posts/[slug].tsx is one dynamic route. Its getStaticParams() export lists the slugs, and the build writes one HTML file per slug.",
      "A slug that isn't listed is a 404, rendered by error.tsx.",
    ],
  },
];

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
