import { fail, redirect } from "@sveltejs/kit";

export function load({ url }) {
  return { sent: url.searchParams.get("sent") === "1" };
}

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const name = String(data.get("name") ?? "").trim();
    if (!name) return fail(400, { error: "Name is required" });
    throw redirect(303, "/form?sent=1");
  },
};
