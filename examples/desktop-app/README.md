# Desktop example (experimental)

One app, `web`, with three routes (`/`, `/about`, `/api/time`). The same routes run as a website and, with the
experimental desktop target, in a window. The desktop target is **off by default** and every command needs
`--experimental`. It is not in any published package yet: run it with the CLI built from this repository.

Mobile, and Metro-class bundling and device tooling, come later; nothing here is about them.

## As a website

```bash
npm install            # after 0.4.0 is on npm; until then link the local packages
npm run build && npm run start
```

## In the desktop rules, in a browser (works on any machine)

```bash
node ../../packages/cli/dist/index.js desktop dev --experimental --app web
```

It builds the app, serves it on `127.0.0.1` on a random port, and prints a launch URL with a per-launch token.
Open that URL once: it sets an HttpOnly, SameSite=Strict cookie and shows the app. Any request without the token
(another tab with a fresh profile, `curl`) gets a 403, and any Host other than `127.0.0.1` gets a 400.

## In a window (needs Rust and the Tauri 2 CLI)

```bash
node ../../packages/cli/dist/index.js desktop build --experimental --app web
```

writes `apps/web/desktop/src-tauri/` (Tauri config, a capabilities file that allows no command, a Rust shell
template). Building and checking the window is a manual step: see `work-notes/desktop/MANUAL-CHECK.md` in the
repository. The settings are in `apps/web/desktop.json` (`ipc` is the list of commands the window may call;
empty by default).
