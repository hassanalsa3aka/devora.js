import { describe, it, expect } from "vitest";
import { detectColorLevel, formatHeader, markLines, stripAnsi, terminalInfo, to256, MARK_WIDTH } from "../terminal.js";

const ESC = "\x1b[";
const header = { version: "0.3.2", detail: "dev · 2 apps · ready in 812 ms" };

describe("detectColorLevel", () => {
  it("is off when not a TTY, on at the advertised depth on one", () => {
    expect(detectColorLevel({}, false)).toBe(0);
    expect(detectColorLevel({ TERM: "xterm" }, true)).toBe(1);
    expect(detectColorLevel({ TERM: "xterm-256color" }, true)).toBe(2);
    expect(detectColorLevel({ TERM: "xterm-256color", COLORTERM: "truecolor" }, true)).toBe(3);
    expect(detectColorLevel({ COLORTERM: "24bit" }, true)).toBe(3);
    expect(detectColorLevel({ TERM: "dumb" }, true)).toBe(0);
  });

  it("NO_COLOR (non-empty) turns color off; an empty NO_COLOR is ignored", () => {
    expect(detectColorLevel({ NO_COLOR: "1", COLORTERM: "truecolor" }, true)).toBe(0);
    expect(detectColorLevel({ NO_COLOR: "", TERM: "xterm-256color" }, true)).toBe(2);
  });

  it("FORCE_COLOR wins over NO_COLOR and a pipe, and FORCE_COLOR=0 wins over a TTY", () => {
    expect(detectColorLevel({ FORCE_COLOR: "1", NO_COLOR: "1" }, false)).toBe(1);
    expect(detectColorLevel({ FORCE_COLOR: "3" }, false)).toBe(3);
    expect(detectColorLevel({ FORCE_COLOR: "" , TERM: "xterm-256color" }, false)).toBe(2);
    expect(detectColorLevel({ FORCE_COLOR: "0", COLORTERM: "truecolor" }, true)).toBe(0);
    expect(detectColorLevel({ FORCE_COLOR: "false" }, true)).toBe(0);
  });
});

describe("terminalInfo", () => {
  it("is interactive only on a TTY outside CI", () => {
    expect(terminalInfo({ isTTY: true, columns: 120 }, {}).interactive).toBe(true);
    expect(terminalInfo({ isTTY: false }, {}).interactive).toBe(false);
    expect(terminalInfo({ isTTY: true }, { CI: "true" }).interactive).toBe(false);
    expect(terminalInfo({ isTTY: true }, { CI: "false" }).interactive).toBe(true);
    expect(terminalInfo({ isTTY: true }, { TERM: "dumb" }).interactive).toBe(false);
  });

  it("falls back to 80 columns when the stream doesn't say", () => {
    expect(terminalInfo({ isTTY: false }, {}).columns).toBe(80);
  });
});

describe("the mark", () => {
  it("is at most 6 lines, each exactly MARK_WIDTH wide, block characters only", () => {
    const lines = markLines();
    expect(lines.length).toBeLessThanOrEqual(6);
    for (const line of lines) {
      expect(line).toHaveLength(MARK_WIDTH);
      expect(line).toMatch(/^[ █▀▄]+$/);
    }
  });
});

describe("formatHeader", () => {
  it("wide interactive truecolor terminal: the mark with a gradient, name and detail beside it", () => {
    const out = formatHeader(header, { level: 3, interactive: true, columns: 100 });
    const lines = out.split("\n");
    expect(lines).toHaveLength(markLines().length);
    expect(out).toContain(`${ESC}38;2;59;130;246m`); // gradient starts at the logo's blue
    expect(out).toContain(`${ESC}1mdevora${ESC}22m`);
    const plain = stripAnsi(out);
    expect(plain).toContain("devora.js 0.3.2");
    expect(plain).toContain("dev · 2 apps · ready in 812 ms");
    for (const line of plain.split("\n")) expect(line.length).toBeLessThanOrEqual(100);
  });

  it("256-color and 16-color terminals get matching fallbacks", () => {
    const c256 = formatHeader(header, { level: 2, interactive: true, columns: 100 });
    expect(c256).toContain(`${ESC}38;5;${to256([59, 130, 246])}m`);
    expect(c256).not.toContain(`${ESC}38;2;`);
    const c16 = formatHeader(header, { level: 1, interactive: true, columns: 100 });
    expect(c16).toContain(`${ESC}34m`);
    expect(c16).toContain(`${ESC}35m`);
    expect(c16).not.toMatch(/\x1b\[38;[25];/);
  });

  it("color off (NO_COLOR) on a TTY: the same mark and text with no escape codes at all", () => {
    const out = formatHeader(header, { level: 0, interactive: true, columns: 100 });
    expect(out).not.toContain("\x1b");
    expect(out).toBe(stripAnsi(formatHeader(header, { level: 3, interactive: true, columns: 100 })));
  });

  it("narrow terminal: the small d› glyph instead of the mark, on one line when it fits", () => {
    const out = formatHeader({ version: "0.3.2", detail: "build" }, { level: 3, interactive: true, columns: 40 });
    expect(out.split("\n")).toHaveLength(1);
    expect(stripAnsi(out)).toBe("  d› devora.js 0.3.2  build");
  });

  it("very narrow terminal: the detail moves under the name instead of wrapping", () => {
    const out = stripAnsi(formatHeader(header, { level: 3, interactive: true, columns: 30 }));
    expect(out).toBe("  d› devora.js 0.3.2\n     dev · 2 apps · ready in 812 ms");
    expect(out.split("\n")[0]!.length).toBeLessThanOrEqual(30);
  });

  it("pipe or CI: one plain line, no glyph, no escapes", () => {
    const out = formatHeader(header, { level: 0, interactive: false, columns: 200 });
    expect(out).toBe("  devora.js 0.3.2  dev · 2 apps · ready in 812 ms");
  });

  it("without a version (create-devora) the name stands alone", () => {
    const out = formatHeader({ detail: "create-devora 0.3.1 · new project" }, { level: 0, interactive: false, columns: 80 });
    expect(out).toBe("  devora.js  create-devora 0.3.1 · new project");
  });
});
