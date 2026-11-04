/**
 * What a new project's root files say for each package manager: the pnpm-workspace.yaml settings that pnpm 11 and
 * later need (and pnpm 9, npm and Yarn ignore), the Yarn-only `.yarnrc.yml`, and the files that stay as they were.
 */
import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scaffoldProjectFiles, type ScaffoldProjectOptions } from "../scaffoldProjectFiles.js";
import { PNPM_WORKSPACE_YAML, YARNRC_YML } from "../scaffoldProjectFiles.js";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

async function scaffold(packageManager?: ScaffoldProjectOptions["packageManager"]): Promise<string> {
  const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "devora-pm-")), "proj");
  dirs.push(path.dirname(root));
  await scaffoldProjectFiles(root, {
    projectName: "proj",
    apps: [{ name: "one", domain: "one.example.com", auth: "shared" }],
    coreVersion: "^0.4.0",
    cliVersion: "^0.4.0",
    packageManager,
  });
  return root;
}
const read = (root: string, file: string) => fs.readFileSync(path.join(root, file), "utf-8");

describe("pnpm-workspace.yaml", () => {
  it.each([undefined, "npm", "yarn", "pnpm"] as const)("lists the workspace folders and the pnpm 11+ settings (package manager: %s)", async (pm) => {
    const yaml = read(await scaffold(pm), "pnpm-workspace.yaml");
    expect(yaml).toBe(PNPM_WORKSPACE_YAML);
    expect(yaml).toContain('packages:\n  - "packages/*"\n  - "apps/*"\n');
    expect(yaml).toMatch(/^linkWorkspacePackages: true$/m);
    expect(yaml).toMatch(/^allowBuilds:\n {2}esbuild: true$/m);
  });

  it("is plain YAML with only those top-level keys", () => {
    const keys = PNPM_WORKSPACE_YAML.split("\n").filter((l) => /^[A-Za-z]/.test(l)).map((l) => l.split(":")[0]);
    expect(keys).toEqual(["packages", "linkWorkspacePackages", "allowBuilds"]);
  });
});

describe(".yarnrc.yml", () => {
  it("is written for Yarn, selecting the node_modules linker", async () => {
    const root = await scaffold("yarn");
    expect(read(root, ".yarnrc.yml")).toBe(YARNRC_YML);
    expect(YARNRC_YML).toBe("nodeLinker: node-modules\n");
  });

  it.each([undefined, "npm", "pnpm"] as const)("is not written for %s", async (pm) => {
    expect(fs.existsSync(path.join(await scaffold(pm), ".yarnrc.yml"))).toBe(false);
  });
});

describe("files that did not change for any package manager", () => {
  it.each([undefined, "npm", "yarn", "pnpm"] as const)(".npmrc keeps link-workspace-packages for pnpm 9 and 10, and package.json keeps its workspaces (%s)", async (pm) => {
    const root = await scaffold(pm);
    expect(read(root, ".npmrc")).toBe("link-workspace-packages=true\n");
    expect(JSON.parse(read(root, "package.json")).workspaces).toEqual(["packages/*", "apps/*"]);
  });
});
