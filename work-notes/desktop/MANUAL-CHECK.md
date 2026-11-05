# Desktop target: what to build and click through by hand (macOS)

The cloud container that wrote the desktop code has no display, no desktop Rust toolchain and no signing keys.
What it could check is in `packages/desktop/src/__tests__/desktop.test.ts` (token, 127.0.0.1 only, random port,
host check, launch cookie, navigation and external-link policy, IPC allowlist, generated config). Everything below
was **not run**.

## 0. Tools

```bash
xcode-select --install
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install tauri-cli --version "^2" --locked
```

## 1. The rules in a browser first

```bash
cd devora.js && pnpm install && pnpm --filter @devorajs/cli build
cd examples/desktop-app && npm install    # until 0.4.0 is on npm: link ../../packages/core and ../../packages/cli
node ../../packages/cli/dist/index.js desktop dev --experimental --app web
```

Check, and write down the result:
- [ ] Opening the printed launch URL shows the app; `/about` and `/api/time` work.
- [ ] `curl -i http://127.0.0.1:<port>/` → 403. `curl -i -H "Host: localhost:<port>" ...` → 400.
- [ ] A private window on the same URL without the launch link → 403.
- [ ] `lsof -iTCP -sTCP:LISTEN | grep <port>` shows 127.0.0.1 only. A second launch uses another port and token.

## 2. Generate and build the window

```bash
node ../../packages/cli/dist/index.js desktop build --experimental --app web
cd apps/web/desktop/src-tauri
```

The shell expects a sidecar binary at `binaries/devora-server-<target triple>` (Tauri's naming). It must run
`devora desktop serve --experimental --app web` against the built app with a bundled Node. One way (to decide
before this ships, ROADMAP): Node's single-executable applications (`node --experimental-sea-config`) or `pkg`.
Until then, for a click-through, a shell script that runs the local CLI is enough:

```bash
mkdir -p binaries
printf '#!/bin/sh\ncd "%s" && exec node "%s" desktop serve --experimental --app web\n' "$(pwd)/../../../.." "$(pwd)/../../../../../../packages/cli/dist/index.js" > "binaries/devora-server-$(rustc -vV | sed -n 's/host: //p')"
chmod +x binaries/*
cargo tauri build      # or: cargo tauri dev
```

## 3. Click through the window

- [ ] The window opens the app (the shell waits for the server: if it shows an error page first, add the wait the
      TODO in `src/main.rs` names).
- [ ] Links inside the app work; `/about`, back, forward.
- [ ] A link to another site (add one to `/about`): the window does **not** navigate. (Optional: it opens in the
      system browser only if it is `https:`.)
- [ ] `window.open("https://example.com")` from the devtools console: no new window. If one opens, add an
      `on_new_window` handler and record it.
- [ ] Devtools console: `window.__TAURI__` is undefined (withGlobalTauri off); `window.__TAURI_INTERNALS__.invoke`
      of any command fails (no capability granted).
- [ ] Response headers in devtools: the app's CSP, nosniff, frame options are there.
- [ ] Quit the app: the sidecar process is gone (`ps aux | grep devora`).
- [ ] Start it twice: the second instance gets another port and token.

## 4. Before anyone ships it

- Signing and notarization (Apple Developer ID), the sidecar packaging decision, the session secret in the
  keychain, and updates only if signed (`updaterPublicKey`): none of these is done.
