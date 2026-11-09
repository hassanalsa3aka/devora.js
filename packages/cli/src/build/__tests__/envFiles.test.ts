import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadEnv } from "vite";
import { readEnvFiles } from "../envFiles.js";

// The own reader must give what Vite's loadEnv gives for the files (so projects keep their values on either engine).
const CASES: Record<string, string> = {
  ".env": `A=1\nB="two words"\nC='single $A'\nexport D=exported\n# comment\nE=value # trailing\nF="line1\\nline2"\nG=\nH=\`tick\`\nURL=http://x.test/a?b=c#frag\nQ="a # not a comment"\nMULTI="first\nsecond"\n`,
  ".env.local": `A=local\nREF=$A-and-\${B}\nESC=\\$A\nMISSING=$NOPE_NOT_SET\nCHAIN=\${REF}!\n`,
  ".env.production": `A=prod\nP=only-prod\nSPACED = spaced value  \n`,
  ".env.production.local": `P=prod-local\n`,
};

describe("env files without Vite", () => {
  it("matches Vite's loadEnv", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "devora-env-"));
    try {
      for (const [name, text] of Object.entries(CASES)) writeFileSync(path.join(root, name), text);
      const files = Object.keys(CASES);
      const environment = { SOMETHING_ELSE: "x" };
      const mine = readEnvFiles(root, "production", [".env", ".env.local", ".env.production", ".env.production.local"], environment);
      const vite = loadEnv("production", root, "");
      for (const key of Object.keys(mine)) expect(`${key}=${mine[key]}`).toBe(`${key}=${vite[key]}`);
      expect(Object.keys(mine).length).toBeGreaterThan(10);
      void files;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
