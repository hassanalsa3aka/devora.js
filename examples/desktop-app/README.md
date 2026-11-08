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

## In a window (experimental; the Rust shell has not been compiled or run by its author)

`devora desktop dev` builds the app, writes a Tauri 2 project to `apps/web/desktop/src-tauri/`, and runs it with
`cargo run`. The shell picks a free port on `127.0.0.1`, makes a per-launch token, starts this CLI's `desktop serve`
as its server (token in the environment, never on a command line), waits until it answers, and opens **one** window on
that origin. Every other origin is refused; no command is exposed to the page; closing the window stops the server, and
the server stops by itself if the shell is killed.

What it needs (it checks, and tells you what is missing and what to run; it never installs anything):
macOS: Xcode command line tools (`xcode-select --install`), Rust and cargo
(`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`, then a new terminal). `cargo tauri` is **not**
needed for `dev`, only for bundling. If something is missing, the command prints `NO WINDOW WILL OPEN`, the list, and
serves the app on its own with a launch URL for a browser (the server-only mode). `--no-window` forces that mode.

### Ten-minute check (macOS)

```bash
# 0. once: the tools (a new terminal afterwards), then check
rustc --version && cargo --version

# 1. from a project with a built-in app, e.g. this folder (npm install first) or the repository's own apps:
node ../../packages/cli/dist/index.js desktop dev --experimental --app web
```

1. [ ] First run only: 3 to 10 minutes of `cargo` output (it downloads and compiles Tauri). If it fails, copy the
       last 30 lines; that is the most useful thing you can send.
2. [ ] A window opens. It shows the app's home page, served from `http://127.0.0.1:<port>`; the terminal prints
       `[devora desktop] serving on http://127.0.0.1:<port> (token required)`.
3. [ ] Click the counter button (an island): the number goes up. Click a link inside the app (`/about`), then use
       back and forward.
4. [ ] In a normal browser, open `http://127.0.0.1:<port>/`: **403** (no token). `curl -i http://127.0.0.1:<port>/`: 403.
       `lsof -nP -iTCP -sTCP:LISTEN | grep <port>` shows `127.0.0.1` only.
5. [ ] Navigation lock: add `<a href="https://example.com">out</a>` to a page, rebuild (`desktop dev` again), click
       it: **nothing happens** (the window stays on the app). Same for `<a target="_blank" ...>`.
6. [ ] Right-click, Inspect Element (debug builds have the inspector), Console: `window.open("https://example.com")`
       returns `null` and no window appears; `window.__TAURI__` is `undefined`;
       `window.__TAURI_INTERNALS__?.invoke?.("anything")` is rejected or absent.
7. [ ] Network tab, the page response: the app's `Content-Security-Policy` (`default-src 'self'; ...`),
       `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` are there. (The window's own CSP setting in
       `tauri.conf.json` covers files Tauri serves itself; for this window the page's header is what applies.)
8. [ ] Close the window (or Cmd+Q). The terminal prints `the window closed`. In another terminal:
       `ps aux | grep "desktop serve" | grep -v grep` shows nothing.
9. [ ] Kill test: start it again, find the shell (`ps aux | grep "target/debug"`), `kill -9 <pid>`. Within two seconds
       `ps aux | grep "desktop serve"` shows nothing (the server noticed its parent was gone).
10. [ ] Start it twice at once (two terminals, no `PORT` set): the two windows have different ports. (Tokens differ too.)

Write down what differs from this list. Known unknowns: the Rust code is untested; on macOS the window title is the
Cargo package name; whether WKWebView lets a `target="_blank"` link through before the page script sees it is exactly
what item 5 checks; bundling (`desktop build`) and shipping the server as a binary are not done.

## The same rules in a browser (any machine, no Rust)

```bash
node ../../packages/cli/dist/index.js desktop dev --experimental --app web --no-window
```

It serves the app on `127.0.0.1` (random port; `PORT=<n>` pins it) and prints a launch URL with the token. Open it
once: it sets an HttpOnly, SameSite=Strict cookie and shows the app. Any request without the token gets a 403, any
Host other than `127.0.0.1` a 400.

## Bundling

`desktop build` writes the same project and says whether this machine could bundle it (it also needs
`cargo install tauri-cli --version "^2" --locked`). The server still has to be shipped as a binary next to the app
(`devora-server`); that packaging is not decided. Settings are in `apps/web/desktop.json` (`ipc` is the list of
commands the window may call; empty by default).
