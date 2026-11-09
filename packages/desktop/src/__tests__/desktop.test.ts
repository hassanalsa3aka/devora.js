/** The desktop sidecar rules that can run without a display. */
import { afterEach, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  DESKTOP_LAUNCH_PATH,
  DESKTOP_TOKEN_HEADER,
  generateLaunchToken,
  HARDEN_SCRIPT,
  buildIcns,
  buildIco,
  buildIconSet,
  planIconWrites,
  checkDesktopPrerequisites,
  describeMissing,
  generateTauriBinaryFiles,
  generateTauriProject,
  isAllowedNavigation,
  isProcessAlive,
  parseParentPid,
  watchParent,
  mayOpenExternally,
  parseIpcAllowlist,
  pickLoopbackPort,
  startDesktopServer,
  tokensMatch,
  type DesktopServer,
} from "../index.js";

const running: DesktopServer[] = [];
afterEach(async () => {
  await Promise.all(running.splice(0).map((s) => s.close()));
});

function request(port: number, path: string, headers: Record<string, string> = {}, host = "127.0.0.1"): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, headers: { Host: `${host}:${port}`, ...headers } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function serve() {
  const token = generateLaunchToken();
  const server = await startDesktopServer({ token, handler: (_req, res) => void res.end("app page") });
  running.push(server);
  return { token, server };
}

describe("token", () => {
  it("is 43 base64url characters, different every launch, compared in constant time", () => {
    const a = generateLaunchToken();
    const b = generateLaunchToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
    expect(tokensMatch(a, a)).toBe(true);
    expect(tokensMatch(a, b)).toBe(false);
    expect(tokensMatch(a, a.slice(1))).toBe(false);
    expect(tokensMatch(a, undefined)).toBe(false);
  });
});

describe("sidecar server", () => {
  it("listens on 127.0.0.1 only, on a random port", async () => {
    const { server } = await serve();
    const address = server.server.address() as net.AddressInfo;
    expect(address.address).toBe("127.0.0.1");
    const other = await serve();
    expect(other.server.port).not.toBe(server.port);
    await expect(startDesktopServer({ token: generateLaunchToken(), handler: () => {}, host: "0.0.0.0" })).rejects.toThrow(/127\.0\.0\.1 only/);
    await expect(startDesktopServer({ token: generateLaunchToken(), handler: () => {}, host: "::" })).rejects.toThrow(/127\.0\.0\.1 only/);
    expect(await pickLoopbackPort()).toBeGreaterThan(0);
  });

  it("refuses a request without the token, with a wrong one, or for another host", async () => {
    const { token, server } = await serve();
    expect((await request(server.port, "/")).status).toBe(403);
    expect((await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: generateLaunchToken() })).status).toBe(403);
    expect((await request(server.port, "/", { Cookie: `devora_desktop=${generateLaunchToken()}` })).status).toBe(403);
    expect((await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: token }, "localhost")).status).toBe(400);
    expect((await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: token }, "evil.example")).status).toBe(400);
    const ok = await request(server.port, "/", { [DESKTOP_TOKEN_HEADER]: token });
    expect(ok.status).toBe(200);
    expect(ok.body).toBe("app page");
  });

  it("the launch URL sets an HttpOnly, SameSite=Strict cookie and redirects; the cookie then works", async () => {
    const { token, server } = await serve();
    expect((await request(server.port, `${DESKTOP_LAUNCH_PATH}?token=${generateLaunchToken()}`)).status).toBe(403);
    expect((await request(server.port, DESKTOP_LAUNCH_PATH)).status).toBe(403);
    const launched = await request(server.port, `${DESKTOP_LAUNCH_PATH}?token=${token}`);
    expect(launched.status).toBe(303);
    expect(launched.headers.location).toBe("/");
    const cookie = String(launched.headers["set-cookie"]);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    const page = await request(server.port, "/", { Cookie: cookie.split(";")[0]! });
    expect(page.status).toBe(200);
  });
});

describe("window policy", () => {
  const origin = "http://127.0.0.1:43123";
  it("allows only the sidecar's origin", () => {
    expect(isAllowedNavigation(`${origin}/account`, origin)).toBe(true);
    for (const target of ["http://127.0.0.1:43124/", "http://localhost:43123/", "https://evil.example/", "file:///etc/passwd", "javascript:alert(1)", "not a url"]) {
      expect(isAllowedNavigation(target, origin), target).toBe(false);
    }
  });

  it("opens only plain https links in the system browser", () => {
    expect(mayOpenExternally("https://docs.example.com/x")).toBe(true);
    for (const target of ["http://example.com", "file:///etc/passwd", "javascript:alert(1)", "data:text/html,x", "vscode://x", "https://user:pw@example.com"]) {
      expect(mayOpenExternally(target), target).toBe(false);
    }
  });

  it("IPC allowlist: none by default, plain command names only", () => {
    expect(parseIpcAllowlist(undefined)).toEqual([]);
    expect(parseIpcAllowlist(["open_file_dialog", "open_file_dialog"])).toEqual(["open_file_dialog"]);
    for (const bad of [["*"], ["fs:allow-read"], ["../x"], ["Open"], [""], "open_file_dialog"]) {
      expect(() => parseIpcAllowlist(bad), JSON.stringify(bad)).toThrow();
    }
  });
});

describe("generated Tauri project", () => {
  it("grants no command by default, sets the CSP, loads nothing remote, and configures no unsigned updater", () => {
    const files = generateTauriProject({ productName: "My App", identifier: "com.example.myapp", version: "0.1.0" });
    const conf = JSON.parse(files["tauri.conf.json"]!);
    const capability = JSON.parse(files["capabilities/main.json"]!);
    expect(capability.permissions).toEqual([]);
    expect(conf.app.security.csp).toMatch(/default-src 'self'/);
    expect(conf.app.security.csp).not.toMatch(/unsafe-eval|https?:/);
    expect(conf.app.security.freezePrototype).toBe(true);
    expect(conf.app.withGlobalTauri).toBe(false);
    expect(conf.plugins).toEqual({});
    expect(files["src/main.rs"]).toMatch(/127\.0\.0\.1:0/);
    expect(files["src/main.rs"]).toMatch(/\.env\("DEVORA_DESKTOP_TOKEN"/);
    expect(files["src/main.rs"]).toMatch(/on_navigation/);
    // the token reaches the server through its environment, never as an argument
    expect(files["src/main.rs"]).not.toMatch(/\.args?\([^)]*token/);
    expect(files["src/main.rs"]).not.toMatch(/invoke_handler|tauri_plugin|withGlobalTauri": true|WebviewUrl::App/);
  });

  it("the shell opens one window on the server's own origin, waits for the server, and stops it on exit", () => {
    const rs = generateTauriProject({ productName: "My App", identifier: "com.example.myapp", version: "0.1.0" })["src/main.rs"]!;
    expect(rs).toMatch(/WebviewUrl::External\(launch\)/);
    expect(rs).toMatch(/format!\("http:\/\/127\.0\.0\.1:\{port\}"\)/);
    expect(rs).toMatch(/\.on_navigation\(move \|url\| url\.origin\(\) == allowed\)/);
    expect(rs).toMatch(/wait_for_server\(port, &mut child\)/);
    expect(rs).toMatch(/RunEvent::Exit/);
    expect(rs).toMatch(/impl Drop for Server/);
    expect(rs).toMatch(/child\.try_wait\(\)\.ok\(\)\.flatten\(\)/); // the app closes if its server stops
    expect(rs).toMatch(/window\.set_focus\(\)/);
    expect(rs).toMatch(/DEVORA_DESKTOP_PARENT_PID/);
    expect(rs).toMatch(/\.env\("HOST", "127\.0\.0\.1"\)/);
    expect(rs).not.toMatch(/0\.0\.0\.0|"::"/);
    // exactly one window is built
    expect(rs.match(/WebviewWindowBuilder::new/g)).toHaveLength(1);
  });

  it("the page-side hardening blocks window.open and links or forms aimed at another window", async () => {
    expect(HARDEN_SCRIPT).toMatch(/window\.open = function \(\) \{ return null; \}/);
    expect(HARDEN_SCRIPT).toMatch(/a\[target\]/);
    expect(HARDEN_SCRIPT).toMatch(/e\.target\.target = "_self"/);
    // it runs (as a module file, with the three globals it uses): window.open returns null and a _blank link does not open anything
    const calls: string[] = [];
    const fakeWindow: Record<string, unknown> = {};
    const listeners: Record<string, (e: unknown) => void> = {};
    const g = globalThis as Record<string, unknown>;
    g.window = fakeWindow;
    g.document = { addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn) };
    g.location = { origin: "http://127.0.0.1:1", assign: (u: string) => calls.push(u) };
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-harden-"));
    fs.writeFileSync(path.join(dir, "harden.mjs"), HARDEN_SCRIPT);
    await import(pathToFileURL(path.join(dir, "harden.mjs")).href);
    fs.rmSync(dir, { recursive: true, force: true });
    expect((fakeWindow.open as () => unknown)()).toBeNull();
    let prevented = false;
    listeners.click!({ target: { closest: () => ({ target: "_blank", origin: "https://evil.example", href: "https://evil.example/" }) }, preventDefault: () => (prevented = true) });
    expect(prevented).toBe(true);
    expect(calls).toEqual([]);
    listeners.click!({ target: { closest: () => ({ target: "_blank", origin: "http://127.0.0.1:1", href: "http://127.0.0.1:1/about" }) }, preventDefault: () => {} });
    expect(calls).toEqual(["http://127.0.0.1:1/about"]);
    for (const k of ["window", "document", "location"]) delete g[k];
  });

  it("the project has the files cargo and Tauri need, and no remote anything", () => {
    const files = generateTauriProject({ productName: "My App", identifier: "com.example.myapp", version: "0.1.0" });
    expect(Object.keys(files).sort()).toEqual([".gitignore", "Cargo.toml", "build.rs", "capabilities/main.json", "frontend/index.html", "src/main.rs", "tauri.conf.json"]);
    expect(files["Cargo.toml"]).not.toMatch(/tauri-plugin|url =/);
    expect(JSON.parse(files["tauri.conf.json"]!).build).toEqual({ frontendDist: "./frontend" });
    expect(files["frontend/index.html"]).not.toMatch(/https?:|<script/);
    expect(files[".gitignore"]).toMatch(/target\//);
    const icon = generateTauriBinaryFiles()["icons/icon.png"]!;
    expect([...icon.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(icon.readUInt32BE(16)).toBe(512); // width
    expect(icon[25]).toBe(6); // RGBA
  });

  it("dev does not declare the server binary (it does not exist); only `desktop build` does", () => {
    const dev = JSON.parse(generateTauriProject({ productName: "Devora.js", identifier: "com.example.web", version: "0.1.0" })["tauri.conf.json"]!);
    expect(dev.bundle.externalBin).toBeUndefined();
    expect(JSON.stringify(dev)).not.toMatch(/binaries\//);
    const built = JSON.parse(generateTauriProject({ productName: "Devora.js", identifier: "com.example.web", version: "0.1.0", bundleSidecar: true })["tauri.conf.json"]!);
    expect(built.bundle.externalBin).toEqual(["binaries/devora-server"]);
  });

  it("the window is titled with the product name, and every icon the config lists is generated", () => {
    const files = generateTauriProject({ productName: "Devora.js", identifier: "com.example.web", version: "0.1.0" });
    expect(files["src/main.rs"]).toMatch(/\.title\("Devora\.js"\)/);
    const conf = JSON.parse(files["tauri.conf.json"]!);
    const generated = Object.keys(generateTauriBinaryFiles());
    for (const f of conf.bundle.icon) expect(generated, f).toContain(f);
  });

  it("icon.icns and icon.ico are well-formed containers of the logo PNGs", () => {
    const icns = buildIcns();
    expect(icns.subarray(0, 4).toString("ascii")).toBe("icns");
    expect(icns.readUInt32BE(4)).toBe(icns.length);
    let at = 8;
    const types: string[] = [];
    while (at < icns.length) {
      types.push(icns.subarray(at, at + 4).toString("ascii"));
      const len = icns.readUInt32BE(at + 4);
      expect([...icns.subarray(at + 8, at + 12)]).toEqual([0x89, 0x50, 0x4e, 0x47]); // each chunk is a PNG
      at += len;
    }
    expect(at).toBe(icns.length);
    expect(types).toEqual(["ic07", "ic08", "ic09", "ic11", "ic13", "ic14"]);
    const ico = buildIco();
    expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
    for (let i = 0; i < 3; i++) {
      const size = ico.readUInt32LE(6 + i * 16 + 8);
      const offset = ico.readUInt32LE(6 + i * 16 + 12);
      expect([...ico.subarray(offset, offset + 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
      expect(offset + size).toBeLessThanOrEqual(ico.length);
    }
  });

  it("an icon the app replaced is never overwritten; an untouched or missing one is refreshed", () => {
    const set = buildIconSet();
    const fresh = planIconWrites({}, undefined);
    expect(fresh.write.sort()).toEqual(Object.keys(set).sort());
    // unchanged since our last run: refreshed; replaced by the app: left alone
    const onDisk: Record<string, Buffer | undefined> = { ...set };
    const marker = fresh.marker;
    onDisk["icons/icon.icns"] = Buffer.from("the app's own icns");
    const second = planIconWrites(onDisk, marker);
    expect(second.write).not.toContain("icons/icon.icns");
    expect(second.write).toContain("icons/icon.png");
    // the tiny placeholder an early version wrote is replaced; a big icon without a marker is not
    expect(planIconWrites({ "icons/icon.png": Buffer.alloc(300) }, undefined).write).toContain("icons/icon.png");
    expect(planIconWrites({ "icons/icon.png": Buffer.alloc(5000) }, undefined).write).not.toContain("icons/icon.png");
  });

  it("lists allowlisted commands only, and refuses an unsigned or plain-http updater", () => {
    const files = generateTauriProject({ productName: "My App", identifier: "com.example.myapp", version: "0.1.0", ipc: ["open_file_dialog"] });
    expect(JSON.parse(files["capabilities/main.json"]!).permissions).toEqual(["allow-open-file-dialog"]);
    expect(() => generateTauriProject({ productName: "A", identifier: "com.example.a", version: "1.0.0", updaterEndpoint: "https://u.example.com" })).toThrow(/signed/);
    expect(() => generateTauriProject({ productName: "A", identifier: "com.example.a", version: "1.0.0", updaterEndpoint: "http://u.example.com", updaterPublicKey: "k" })).toThrow(/https/);
    expect(() => generateTauriProject({ productName: 'A"; rm', identifier: "com.example.a", version: "1.0.0" })).toThrow();
    expect(() => generateTauriProject({ productName: "A", identifier: "example", version: "1.0.0" })).toThrow();
  });
});

describe("prerequisites", () => {
  const present = (output = "ok") => ({ ok: true, output });
  const missing = { ok: false, output: "" };

  it("is ready on macOS with Xcode tools, rustc and cargo, and does not need the Tauri CLI for `dev`", () => {
    const calls: string[] = [];
    const report = checkDesktopPrerequisites((cmd, args) => (calls.push(`${cmd} ${args.join(" ")}`), present("/Applications/Xcode.app")), { platform: "darwin", home: "/nonexistent" });
    expect(report.ready).toBe(true);
    expect(calls).toEqual(["xcode-select -p", "rustc --version", "cargo --version"]);
  });

  it("names exactly what is missing, with the command to run, and never claims ready", () => {
    const report = checkDesktopPrerequisites(() => missing, { platform: "darwin", home: "/nonexistent" });
    expect(report.ready).toBe(false);
    const text = describeMissing(report).join("\n");
    expect(text).toMatch(/Xcode command line tools/);
    expect(text).toMatch(/run: xcode-select --install/);
    expect(text).toMatch(/missing: rustc/);
    expect(text).toMatch(/run: curl --proto '=https' --tlsv1\.2 -sSf https:\/\/sh\.rustup\.rs \| sh/);
    expect(text).toMatch(/missing: cargo/);
  });

  it("tells the difference between Rust not installed and Rust not on this terminal's PATH", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devora-home-"));
    fs.mkdirSync(path.join(dir, ".cargo", "bin"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".cargo", "bin", "cargo"), "");
    const report = checkDesktopPrerequisites((cmd) => (cmd === "xcode-select" ? present() : missing), { platform: "darwin", home: dir });
    const cargo = report.items.find((i) => i.name === "cargo")!;
    expect(cargo.ok).toBe(false);
    expect(cargo.fix).toMatch(/source "\$HOME\/\.cargo\/env"/);
    expect(report.items.find((i) => i.name === "rustc")!.fix).toMatch(/rustup/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("`desktop build` also needs the Tauri CLI", () => {
    const report = checkDesktopPrerequisites((cmd, args) => (cmd === "cargo" && args[0] === "tauri" ? missing : present()), { platform: "darwin", forBuild: true, home: "/nonexistent" });
    expect(report.ready).toBe(false);
    expect(describeMissing(report).join("\n")).toMatch(/cargo install tauri-cli --version "\^2" --locked/);
  });
});

describe("the sidecar does not outlive the window", () => {
  it("parses only a plain process id", () => {
    expect(parseParentPid("4242")).toBe(4242);
    for (const bad of [undefined, "", "0", "1", "-5", "12abc", "1e3", " 7", "99999999999"]) expect(parseParentPid(bad)).toBeUndefined();
  });

  it("calls back once when the parent is gone, and not before", async () => {
    let alive = true;
    let gone = 0;
    const stop = watchParent(4242, () => gone++, 10, () => alive);
    await new Promise((r) => setTimeout(r, 40));
    expect(gone).toBe(0);
    alive = false;
    await new Promise((r) => setTimeout(r, 60));
    expect(gone).toBe(1);
    stop();
  });

  it("isProcessAlive: this process is, an absent one is not, a process we may not signal still counts", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
    expect(isProcessAlive(1, () => { throw Object.assign(new Error("x"), { code: "EPERM" }); })).toBe(true);
    expect(isProcessAlive(1, () => { throw Object.assign(new Error("x"), { code: "ESRCH" }); })).toBe(false);
  });

  it("a real sidecar process stops by itself when its parent dies", async () => {
    // a throwaway parent that exits, and a child that watches it
    const script = `
      import { watchParent } from ${JSON.stringify(path.resolve(__dirname, "../index.ts"))};
      watchParent(Number(process.env.PARENT), () => { console.log("stopped"); process.exit(0); }, 50);
      setInterval(() => {}, 1000);
    `;
    const parent = spawn(process.execPath, ["-e", "setTimeout(() => {}, 100000)"]);
    const child = spawn(path.resolve(__dirname, "../../../../node_modules/.bin/tsx"), ["-e", script], { env: { ...process.env, PARENT: String(parent.pid) } });
    let out = "";
    child.stdout.on("data", (c) => (out += c));
    await new Promise((r) => setTimeout(r, 1500));
    expect(child.exitCode).toBeNull(); // parent alive: still running
    parent.kill("SIGKILL");
    const code = await new Promise<number | null>((resolve) => {
      child.once("exit", resolve);
      setTimeout(() => { child.kill("SIGKILL"); resolve(null); }, 8000);
    });
    expect(code).toBe(0);
    expect(out).toContain("stopped");
  }, 20000);
});
