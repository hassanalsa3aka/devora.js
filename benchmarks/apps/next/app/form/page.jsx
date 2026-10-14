import NameForm from "./NameForm";

export const metadata = { title: "Form" };

export default async function Form({ searchParams }) {
  const { sent } = await searchParams;
  return (
    <main>
      <h1>Form</h1>
      {sent === "1" ? <p>Thanks!</p> : null}
      <NameForm />
    </main>
  );
}
