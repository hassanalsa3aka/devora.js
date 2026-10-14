import { CsrfField, PageShell, fail, redirect, type RequestContext, type RouteComponentProps } from "@devorajs/core";
import { addNote, listNotes, type Note } from "@devorajs/backend/notes";

export const renderMode = "ssr";

export function meta() {
  return { title: "Notes" };
}

export async function loader(ctx: RequestContext) {
  if (!ctx.session) throw redirect("/login");
  return { notes: await listNotes(undefined, ctx) };
}

export async function action(formData: FormData, ctx: RequestContext) {
  ctx.verifyCsrf(formData);
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return fail(400, { error: "Write something first." });
  await addNote({ text }, ctx);
  return redirect("/notes");
}

export default function Notes({ data, csrfToken, actionData }: RouteComponentProps<{ notes: Note[] }, { error?: string }>) {
  return (
    <PageShell appName="app">
      <h1>Notes</h1>
      <ul>
        {data?.notes.map((n, i) => (
          <li key={i}>
            <strong>{n.author}</strong>: {n.text}
          </li>
        ))}
      </ul>
      <form method="post">
        <CsrfField token={csrfToken} />
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <label htmlFor="text">New note</label>
        <input id="text" name="text" />
        <button type="submit">Add</button>
      </form>
    </PageShell>
  );
}
