/**
 * What `devora desktop dev` needs on this machine before it can open a window, and what to run when something is missing.
 * The check only runs programs with `--version`-style arguments; it never installs anything. The runner is a parameter so
 * the logic is testable without a toolchain.
 */
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export interface RunResult {
  ok: boolean;
  output: string;
}
export type Runner = (command: string, args: string[]) => RunResult;

export interface Prerequisite {
  name: string;
  ok: boolean;
  detail: string;
  /** What to run yourself when it is missing. */
  fix?: string;
}

export interface PrerequisiteReport {
  ready: boolean;
  items: Prerequisite[];
}

export const systemRunner: Runner = (command, args) => {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 15_000 });
  return { ok: result.status === 0 && !result.error, output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim() };
};

const RUSTUP = "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh";

/**
 * `forBuild` also requires the Tauri CLI (`cargo tauri`), which only bundling needs: `desktop dev` runs the shell with
 * plain `cargo run`.
 */
export function checkDesktopPrerequisites(run: Runner = systemRunner, options: { platform?: NodeJS.Platform; forBuild?: boolean; home?: string } = {}): PrerequisiteReport {
  const platform = options.platform ?? process.platform;
  const home = options.home ?? os.homedir();
  const items: Prerequisite[] = [];

  if (platform === "darwin") {
    const xcode = run("xcode-select", ["-p"]);
    items.push({ name: "Xcode command line tools", ok: xcode.ok, detail: xcode.ok ? xcode.output : "xcode-select -p found no developer folder", fix: "xcode-select --install" });
  } else if (platform === "linux") {
    const webkit = run("pkg-config", ["--exists", "webkit2gtk-4.1"]);
    items.push({
      name: "WebKitGTK 4.1 (the web view)",
      ok: webkit.ok,
      detail: webkit.ok ? "webkit2gtk-4.1 found" : "pkg-config did not find webkit2gtk-4.1",
      fix: "install your distribution's WebKitGTK 4.1 development package (Debian/Ubuntu: sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev)",
    });
  } else {
    items.push({ name: "Windows build tools and WebView2", ok: true, detail: "not checked by devora: install the Visual Studio C++ Build Tools (WebView2 ships with Windows 11)" });
  }

  for (const tool of ["rustc", "cargo"] as const) {
    const direct = run(tool, ["--version"]);
    if (direct.ok) {
      items.push({ name: tool, ok: true, detail: direct.output });
      continue;
    }
    const inHome = path.join(home, ".cargo", "bin", tool);
    if (existsSync(inHome)) {
      items.push({ name: tool, ok: false, detail: `${inHome} exists but ${tool} is not on PATH in this terminal`, fix: `source "$HOME/.cargo/env"   # or open a new terminal` });
    } else {
      items.push({ name: tool, ok: false, detail: `${tool} was not found`, fix: RUSTUP });
    }
  }

  if (options.forBuild) {
    const tauri = run("cargo", ["tauri", "--version"]);
    items.push({ name: "Tauri CLI (only `desktop build` needs it)", ok: tauri.ok, detail: tauri.ok ? tauri.output : "cargo tauri was not found", fix: 'cargo install tauri-cli --version "^2" --locked' });
  }
  return { ready: items.every((i) => i.ok), items };
}

/** Plain text for the terminal: what is missing and the exact commands. */
export function describeMissing(report: PrerequisiteReport): string[] {
  const lines: string[] = [];
  for (const item of report.items.filter((i) => !i.ok)) {
    lines.push(`  missing: ${item.name} (${item.detail})`);
    if (item.fix) lines.push(`    run: ${item.fix}`);
  }
  return lines;
}
