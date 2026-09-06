/**
 * Lets a route's `action` signal "redirect the browser here" instead of
 * falling through to the default 200+rendered-page response. Before this,
 * `renderRoute` always returned `{ status: 200, html }` no matter what an
 * `action` did — there was no way for login (redirect home) or logout
 * (redirect to login) to avoid re-rendering their own form with a 200 after
 * a successful POST.
 */
export interface RedirectResult {
  redirect: string;
}

export function redirect(to: string): RedirectResult {
  return { redirect: to };
}

export function isRedirectResult(value: unknown): value is RedirectResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "redirect" in value &&
    typeof (value as { redirect: unknown }).redirect === "string"
  );
}
