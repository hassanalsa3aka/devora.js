// No dynamic APIs, so Next pre-renders it at build time (its default).
export const metadata = { title: "Static page" };

export default function Static() {
  return (
    <main>
      <h1>Static page</h1>
      <p>This page has no data and no interactive parts.</p>
      <p>It is rendered once at build time and served as a file.</p>
      <p>The same three paragraphs appear in every framework's version.</p>
    </main>
  );
}
