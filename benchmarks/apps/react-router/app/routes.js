import { route } from "@react-router/dev/routes";

export default [
  route("static", "routes/static.jsx"),
  route("items", "routes/items.jsx"),
  route("form", "routes/form.jsx"),
  route("api/items", "routes/api.items.jsx"),
  route("api/session", "routes/api.session.jsx"),
  route("api/me", "routes/api.me.jsx"),
  route("api/slow", "routes/api.slow.jsx"),
];
