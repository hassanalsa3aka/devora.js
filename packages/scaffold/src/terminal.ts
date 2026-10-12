/**
 * The branded terminal header shared by `devora dev`/`build`/`start` and
 * `create-devora` (both bundle this package), plus the small set of ANSI
 * styles their output uses. Plain escape codes, no dependency.
 *
 * Color follows the usual conventions, in this order:
 * - `FORCE_COLOR` wins (as in Node itself): `0`/`false` turns color off,
 *   `1`/`2`/`3` force 16/256/truecolor, anything else forces at least 16.
 * - `NO_COLOR` (non-empty) turns color off.
 * - Otherwise color only on a TTY that isn't `TERM=dumb`, at the depth
 *   `COLORTERM`/`TERM` advertise.
 *
 * The block-character mark only appears on an interactive terminal (a TTY,
 * not CI) wide enough for it. Piped output, CI logs and narrow terminals
 * get a single plain line instead. Nothing animates.
 */

export type ColorLevel = 0 | 1 | 2 | 3;

export interface TerminalInfo {
  /** 0 none, 1 basic 16 colors, 2 256 colors, 3 truecolor. */
  level: ColorLevel;
  /** A TTY outside CI: worth drawing the mark. */
  interactive: boolean;
  columns: number;
}

type Env = Record<string, string | undefined>;

export function detectColorLevel(env: Env, isTTY: boolean): ColorLevel {
  const force = env.FORCE_COLOR;
  if (force !== undefined) {
    if (force === "0" || force === "false") return 0;
    if (force === "1" || force === "2" || force === "3") return Number(force) as ColorLevel;
    return Math.max(1, depthFromEnv(env)) as ColorLevel;
  }
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return 0;
  if (!isTTY || env.TERM === "dumb") return 0;
  return depthFromEnv(env);
}

function depthFromEnv(env: Env): ColorLevel {
  const colorterm = env.COLORTERM?.toLowerCase();
  if (colorterm === "truecolor" || colorterm === "24bit") return 3;
  if (env.TERM?.includes("256")) return 2;
  return 1;
}

export function terminalInfo(
  stream: { isTTY?: boolean; columns?: number } = process.stdout,
  env: Env = process.env
): TerminalInfo {
  const isTTY = stream.isTTY === true;
  return {
    level: detectColorLevel(env, isTTY),
    interactive: isTTY && env.TERM !== "dumb" && !isCI(env),
    columns: stream.columns && stream.columns > 0 ? stream.columns : 80,
  };
}

function isCI(env: Env): boolean {
  return (env.CI !== undefined && env.CI !== "" && env.CI !== "false" && env.CI !== "0") || env.CONTINUOUS_INTEGRATION !== undefined;
}

type Rgb = readonly [number, number, number];

// The logo's gradient (theme.ts --devora-accent-from/-to) and status colors.
const BLUE: Rgb = [59, 130, 246];
const VIOLET: Rgb = [168, 85, 247];
const GREEN: Rgb = [34, 197, 94];
const YELLOW: Rgb = [234, 179, 8];
const RED: Rgb = [239, 68, 68];

const BASIC: Record<string, number> = { blue: 34, violet: 35, green: 32, yellow: 33, red: 31 };

function fg(level: ColorLevel, rgb: Rgb, basic: number): string {
  if (level === 3) return `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`;
  if (level === 2) return `\x1b[38;5;${to256(rgb)}m`;
  return `\x1b[${basic}m`;
}

/** Nearest color in the xterm 6×6×6 cube. */
export function to256([r, g, b]: Rgb): number {
  const q = (v: number) => Math.round((v / 255) * 5);
  return 16 + 36 * q(r) + 6 * q(g) + q(b);
}

export interface Paint {
  level: ColorLevel;
  bold(text: string): string;
  dim(text: string): string;
  blue(text: string): string;
  violet(text: string): string;
  green(text: string): string;
  yellow(text: string): string;
  red(text: string): string;
}

export function createPaint(level: ColorLevel): Paint {
  const wrap = (open: string, close: string) => (text: string) => (level === 0 || text === "" ? text : `${open}${text}${close}`);
  const color = (rgb: Rgb, name: string) => wrap(fg(level, rgb, BASIC[name]!), "\x1b[39m");
  return {
    level,
    bold: wrap("\x1b[1m", "\x1b[22m"),
    dim: wrap("\x1b[2m", "\x1b[22m"),
    blue: color(BLUE, "blue"),
    violet: color(VIOLET, "violet"),
    green: color(GREEN, "green"),
    yellow: color(YELLOW, "yellow"),
    red: color(RED, "red"),
  };
}

/**
 * The `d›` mark from assets/icons/devorajs.png on a 15×10 pixel grid, two
 * pixel rows per text line (half blocks), so 5 lines tall.
 */
const MARK_PIXELS = [
  "        #      ",
  "       ##      ",
  "       ##      ",
  "  #######  #   ",
  " ########  ##  ",
  "##     ##   ## ",
  "##     ##    ##",
  "##     ##   ## ",
  " ########  ##  ",
  "  #######  #   ",
];

export const MARK_WIDTH = MARK_PIXELS[0]!.length;

/** The mark's lines, uncolored: every line exactly MARK_WIDTH wide. */
export function markLines(): string[] {
  const lines: string[] = [];
  for (let row = 0; row < MARK_PIXELS.length; row += 2) {
    const top = MARK_PIXELS[row]!;
    const bottom = MARK_PIXELS[row + 1]!;
    let line = "";
    for (let col = 0; col < MARK_WIDTH; col++) {
      const t = top[col] === "#";
      const b = bottom[col] === "#";
      line += t && b ? "█" : t ? "▀" : b ? "▄" : " ";
    }
    lines.push(line);
  }
  return lines;
}

/** One mark line with a left-to-right blue→violet gradient (or the 16-color halves). */
function colorMarkLine(line: string, level: ColorLevel): string {
  if (level === 0) return line;
  let out = "";
  for (let col = 0; col < line.length; col++) {
    const ch = line[col]!;
    if (ch === " ") {
      out += ch;
      continue;
    }
    const t = col / (MARK_WIDTH - 1);
    const rgb: Rgb = [0, 1, 2].map((i) => Math.round(BLUE[i]! + (VIOLET[i]! - BLUE[i]!) * t)) as unknown as Rgb;
    out += fg(level, rgb, t < 0.5 ? BASIC.blue! : BASIC.violet!) + ch;
  }
  return `${out}\x1b[39m`;
}

export interface HeaderOptions {
  /** Printed after "devora.js"; omitted when absent (create-devora names its own version in `detail`). */
  version?: string;
  /** Shown after the name: "dev · ready in 812 ms". */
  detail?: string;
}

/** Room the mark needs: indent + mark + gap + "devora.js 0.0.0". */
const MIN_COLUMNS_FOR_MARK = 2 + MARK_WIDTH + 2 + 24;

/**
 * The header as printed: the mark with the name and detail beside it on an
 * interactive terminal that has room, otherwise one line.
 */
export function formatHeader(opts: HeaderOptions, term: TerminalInfo): string {
  const paint = createPaint(term.level);
  const name = `${paint.bold("devora")}${paint.violet(".js")}${opts.version ? ` ${paint.dim(opts.version)}` : ""}`;
  const detail = opts.detail ? paint.dim(opts.detail) : "";

  if (!term.interactive || term.columns < MIN_COLUMNS_FOR_MARK) {
    const glyph = term.interactive ? `${paint.blue("d")}${paint.violet("›")} ` : "";
    const line = `  ${glyph}${name}${detail ? `  ${detail}` : ""}`;
    // Too narrow for one line: the detail goes underneath, aligned with the name.
    if (!detail || !term.interactive || stripAnsi(line).length <= term.columns) return line;
    return `  ${glyph}${name}\n  ${glyph ? "   " : ""}${detail}`;
  }

  const beside = ["", name, detail, "", ""];
  return markLines()
    .map((line, i) => {
      const drawn = line.trimEnd();
      const mark = colorMarkLine(drawn, term.level);
      return beside[i] ? `  ${mark}${" ".repeat(MARK_WIDTH - drawn.length)}  ${beside[i]}` : `  ${mark}`;
    })
    .join("\n");
}

/** Strips ANSI escape codes (for width checks and tests). */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}
