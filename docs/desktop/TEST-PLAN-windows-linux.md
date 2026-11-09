# Desktop target: Windows and Linux test plan (proposal)

Status: nothing below has been run. The macOS check is `pnpm run check:desktop-window` (builds the shell, opens the window,
the page reports back, the shell exits). The same script is meant to run on the other platforms; it has only run on macOS.

## Machines
- Windows 11 x64 with WebView2 (preinstalled on current Windows 11), Visual Studio Build Tools (C++), Rust stable, Node 22.15+.
- Ubuntu 24.04 x64 (a desktop session or `xvfb-run`), `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, Rust stable, Node 22.15+.

## Steps per platform
1. `pnpm install --frozen-lockfile`, then `pnpm run build` for the CLI.
2. `pnpm run check:desktop-window`: expect the page report (title, one window, URL on 127.0.0.1) and a zero exit.
3. By hand: `devora desktop dev --experimental` in `examples/desktop-app`; check the ten items of its README (window title, icon, navigation locked to the app's origin, external links open in the system browser, server stops when the window closes, no IPC command callable from the page).
4. Close the window with the server mid-request; confirm no process is left (Windows: Task Manager; Linux: `pgrep -f desktop`).
5. Kill the shell abruptly; confirm the server exits (the parent-pid watcher).
6. `devora desktop build --experimental`; record what the bundler needs that was not installed.

## Known risks to look at first
- Path separators in the generated Tauri project and in the sidecar arguments (Windows).
- The icon set: `icon.ico` is assembled in Node; check it renders in the title bar and taskbar.
- WebKitGTK versions older than 2.40 on Linux; Wayland versus X11 focus behaviour (the macOS fix for an occluded window was `show` plus `set_focus`).
- Antivirus or SmartScreen on an unsigned Windows build.

## Pass criteria
Steps 2 to 5 pass on both platforms three times in a row, with the output saved. Until then the docs keep saying "macOS only".
