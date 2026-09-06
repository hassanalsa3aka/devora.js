import type { NavLink } from "@devora/core";

// Same reasoning as apps/dashboard/nav.ts — login/logout excluded on purpose.
export const ADMIN_NAV: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Bulk import", href: "/bulk-import" },
];
