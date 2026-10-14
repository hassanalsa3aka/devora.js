import { fail, redirect, type RequestContext, type RouteComponentProps } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Form" };
}

export async function loader(ctx: RequestContext) {
  return { sent: ctx.url.searchParams.get("sent") === "1" };
}

export async function action(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail(400, { error: "Name is required" });
  return redirect("/form?sent=1");
}

export default function Form({ data, actionData }: RouteComponentProps<{ sent: boolean }, { error?: string }>) {
  return (
    <main>
      <h1>Form</h1>
      {data?.sent ? <p>Thanks!</p> : null}
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
      <form method="post">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" />
        <button type="submit">Send</button>
      </form>
    </main>
  );
}
