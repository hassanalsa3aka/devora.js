import { describe, it, expect, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseScope, type ProjectScope } from "../resolveScopeChoice.js";
import { scaffoldProjectFiles } from "../scaffoldProjectFiles.js";
import { scaffoldAppFiles } from "../scaffoldAppFiles.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

/** Scaffolds a project exactly the way create-devora does for `scope`. */
async function scaffold(scope: ProjectScope, auth: "shared" | "none" = "shared"): Promise<string> {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "devora-scope-")), "proj");
  dirs.push(path.dirname(root));
  const apps = [{ name: "one", domain: "one.example.com", auth }];
  await scaffoldProjectFiles(root, { projectName: "proj", apps, coreVersion: "^0.3.0", cliVersion: "^0.3.0", scope });
  await scaffoldAppFiles(path.join(root, "apps", "one"), "one", {
    authMode: auth,
    coreVersion: "^0.3.0",
    cliInvocation: "standalone",
    cliVersion: "^0.3.0",
    kind: scope === "backend" ? "api" : "pages",
    withBackend: scope !== "frontend",
  });
  return root;
}

const exists = (root: string, rel: string) => fs.existsSync(path.join(root, rel));
const deps = (root: string) =>
  Object.keys(JSON.parse(fs.readFileSync(path.join(root, "apps/one/package.json"), "utf-8")).dependencies);
const config = (root: string) => fs.readFileSync(path.join(root, "devora.config.ts"), "utf-8");

describe("parseScope", () => {
  it("accepts the prompt's spellings and common aliases", () => {
    expect(parseScope("full-stack")).toBe("fullstack");
    expect(parseScope("fullstack")).toBe("fullstack");
    expect(parseScope(" Frontend ")).toBe("frontend");
    expect(parseScope("frontend-only")).toBe("frontend");
    expect(parseScope("backend")).toBe("backend");
    expect(parseScope("api")).toBe("backend");
    expect(parseScope("mobile")).toBeUndefined();
  });
});

describe("scaffold scope (devora-pre-v3-hotfixes.md #12)", () => {
  it("full-stack: page app + packages/backend, app depends on it, config names it", async () => {
    const root = await scaffold("fullstack");
    expect(exists(root, "packages/backend/package.json")).toBe(true);
    expect(exists(root, "apps/one/routes/index.tsx")).toBe(true);
    expect(exists(root, "apps/one/entry-server.tsx")).toBe(true);
    expect(deps(root)).toEqual(expect.arrayContaining(["@devorajs/backend", "react", "react-dom"]));
    expect(config(root)).toContain(`backend: "packages/backend"`);
  });

  it("frontend only: no packages/backend at all, and nothing references it", async () => {
    const root = await scaffold("frontend");
    expect(exists(root, "packages/backend")).toBe(false);
    expect(exists(root, "apps/one/routes/index.tsx")).toBe(true);
    expect(deps(root)).not.toContain("@devorajs/backend");
    expect(config(root)).not.toMatch(/backend:/);
    expect(fs.readFileSync(path.join(root, "README.md"), "utf-8")).toContain("frontend only");
  });

  it("backend only: an API app (no pages, no React) + packages/backend", async () => {
    const root = await scaffold("backend");
    expect(exists(root, "packages/backend/package.json")).toBe(true);
    expect(exists(root, "apps/one/api/health.ts")).toBe(true);
    expect(exists(root, "apps/one/api/session.ts")).toBe(true);
    expect(exists(root, "apps/one/api/me.ts")).toBe(true);
    for (const pageFile of ["routes", "entry-server.tsx", "island-client.tsx", "csr-client.tsx"]) {
      expect(exists(root, `apps/one/${pageFile}`), pageFile).toBe(false);
    }
    expect(deps(root)).not.toEqual(expect.arrayContaining(["react"]));
    expect(deps(root)).not.toContain("react-dom");
    expect(fs.readFileSync(path.join(root, "apps/one/app.config.ts"), "utf-8")).toContain("backendOnly: true");
  });

  it("backend only with auth none: just the health route, no session routes", async () => {
    const root = await scaffold("backend", "none");
    expect(fs.readdirSync(path.join(root, "apps/one/api"))).toEqual(["health.ts"]);
  });
});
