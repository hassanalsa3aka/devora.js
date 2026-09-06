import type { NavLink } from "@devora/core";

// One shared nav definition, reused by every route in this app — explicit
// (CLAUDE.md §2.2), not guessed from the app name inside the shared header
// component. Logout/login intentionally excluded: this app has neither.
export const MARKETING_NAV: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "ISR demo", href: "/isr-demo" },
];
