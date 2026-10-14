"use server";
import { redirect } from "next/navigation";

export async function submit(prevState, formData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };
  redirect("/form?sent=1");
}
