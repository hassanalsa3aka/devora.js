import type { NavLink } from "@devora/core";

// One shared nav definition, reused by every route in this app. Login/
// logout deliberately excluded — logout is POST-only by design (a GET nav
// link would be the exact CSRF-adjacent footgun logout.tsx's own comment
// warns against), and login is reachable from wherever auth is required.
export const DASHBOARD_NAV: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Settings", href: "/settings" },
  { label: "CSR demo", href: "/csr-demo" },
];
