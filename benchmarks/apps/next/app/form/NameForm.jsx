"use client";
import { useActionState } from "react";
import { submit } from "./actions";

// A Server Action with useActionState: Next's documented form pattern. It
// also works without JavaScript (progressive enhancement).
export default function NameForm() {
  const [state, action] = useActionState(submit, {});
  return (
    <form action={action}>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <label htmlFor="name">Name</label>
      <input id="name" name="name" />
      <button type="submit">Send</button>
    </form>
  );
}
