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

### What kind of app is this?
A native desktop window made with **Tauri 2**: a small Rust program that opens an operating-system window containing the system's own web
view (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux). The window shows your Devora app, which is served by a Node server that
the shell starts on `127.0.0.1`. So it is the same routes as the website, shown in a desktop window with its own title bar, Dock/taskbar entry
and icon; it is not Electron and not a browser tab. The window title is "Devora.js" (`productName` in `apps/<app>/desktop.json`).

### One command that checks the window for you (macOS, Windows, Linux)
```bash
pnpm run check:desktop-window
```
It builds a small app, opens the window, and the page itself reports back to the terminal: it loaded, an island hydrated (a click changed it),
`window.open` returned `null`, and a `_blank` link and `location.assign` to another site left the window on the app. It passes only if the window
reported all of that, then closes everything. The first run compiles the Tauri crates (minutes). This is also what to run on Windows and Linux.
`DEVORA_DESKTOP_DEBUG=1` on any `desktop dev` run prints the same page reports (debug builds only).

### Ten-minute check (macOS)

```bash
# 0. once: the tools (a new terminal afterwards), then check
. "$HOME/.cargo/env"; rustc --version && cargo --version

# 1. from a project with an app (here: the lab app; any project with apps/web works):
node ../../packages/cli/dist/index.js desktop dev --experimental --app web
```

1. [ ] First run only: 3 to 10 minutes of `cargo` output. If it fails, copy the last 30 lines.
2. [ ] A window titled **Devora.js** opens, 1100 x 760, showing the app's home page with the Devora.js logo in the header and footer. If it opens
       behind other windows it floats on top for a moment. (Only a debug build does this.)
3. [ ] Click the counter button (an island): the number goes up. Click a link inside the app, then use back and forward.
4. [ ] In a normal browser, open `http://127.0.0.1:<port>/`: **403** (no token). `lsof -nP -iTCP -sTCP:LISTEN | grep <port>` shows `127.0.0.1` only.
5. [ ] Navigation lock: add `<a href="https://example.com">out</a>` to a page, rebuild (run the command again), click it: **nothing happens**.
       Same for `<a target="_blank" ...>`.
6. [ ] Right-click, Inspect Element, Console: `window.open("https://example.com")` returns `null` and no window appears; `window.__TAURI__` is `undefined`.
7. [ ] Network tab, the page response: the app's `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
8. [ ] Close the window (or Cmd+Q). The terminal prints `the window closed`; `ps aux | grep "desktop serve" | grep -v grep` shows nothing.
9. [ ] Kill test: start it again, `kill <pid of target/debug/...>`: within two seconds the server process is gone too.
10. [ ] Start it twice at once (two terminals, no `PORT` set): different ports.

Known notes: the Dock shows the generic icon while running from `cargo run` (the Devora.js icon is used in the window and in a bundled app,
`desktop build`); WebKit keeps its HTTP cache between runs, so your server's request log may not show every asset on a second run (the page's
own report, with `DEVORA_DESKTOP_DEBUG=1`, always does); bundling (`desktop build`) and shipping the server as a binary are not done.

### Windows and Linux
The window code is portable (Tauri, plain Rust standard library, no macOS-only calls), but **it has only been run on macOS**. To test it:

- **Windows 10/11:** install Rust (https://rustup.rs), the Visual Studio Build Tools with the "Desktop development with C++" workload, and WebView2
  (included in Windows 11). Node 22.15+, git, pnpm. Then in the repository: `pnpm install` and `pnpm run check:desktop-window` (symlinks need Developer Mode on).
- **Linux:** install Rust and the WebKitGTK development packages (Debian/Ubuntu:
  `sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev`), run it inside a desktop
  session (or `xvfb-run` on a server), then `pnpm run check:desktop-window`.

`devora desktop dev` checks what is missing on each system and prints the commands; it never installs anything.

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
