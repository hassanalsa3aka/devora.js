import { Form, data, redirect, useActionData, useLoaderData } from "react-router";

export function meta() {
  return [{ title: "Form" }];
}

export function loader({ request }) {
  return { sent: new URL(request.url).searchParams.get("sent") === "1" };
}

export async function action({ request }) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return data({ error: "Name is required" }, { status: 400 });
  return redirect("/form?sent=1", 303);
}

export default function FormPage() {
  const { sent } = useLoaderData();
  const actionData = useActionData();
  return (
    <main>
      <h1>Form</h1>
      {sent ? <p>Thanks!</p> : null}
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
      <Form method="post">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" />
        <button type="submit">Send</button>
      </Form>
    </main>
  );
}
