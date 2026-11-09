/**
 * The generated project's icon set: the Devora.js logo on a rounded dark tile (iconData.ts holds four RGBA PNGs). The macOS icon
 * (`icon.icns`) and the Windows icon (`icon.ico`) are assembled here from those PNGs, so no image tool is needed on the machine
 * that runs `devora desktop`. An app that wants its own icon replaces the files, or runs `cargo tauri icon your.png` in the project;
 * existing files are never overwritten (see the CLI).
 */
import { ICON_PNG_BASE64 } from "./iconData.js";

const png = (size: number): Buffer => Buffer.from(ICON_PNG_BASE64[size]!, "base64");

/** ICNS: 'icns', total length, then chunks of (type, length including the 8-byte header, PNG data). */
export function buildIcns(): Buffer {
  const chunks: [string, Buffer][] = [
    ["ic07", png(128)], // 128x128
    ["ic08", png(256)], // 256x256
    ["ic09", png(512)], // 512x512
    ["ic11", png(32)], // 16x16 @2x
    ["ic13", png(256)], // 128x128 @2x
    ["ic14", png(512)], // 256x256 @2x
  ];
  const body = Buffer.concat(
    chunks.map(([type, data]) => {
      const header = Buffer.alloc(8);
      header.write(type, 0, "ascii");
      header.writeUInt32BE(data.length + 8, 4);
      return Buffer.concat([header, data]);
    })
  );
  const head = Buffer.alloc(8);
  head.write("icns", 0, "ascii");
  head.writeUInt32BE(body.length + 8, 4);
  return Buffer.concat([head, body]);
}

/** ICO with PNG-compressed images (32, 128 and 256 pixels; 0 in the size byte means 256). */
export function buildIco(): Buffer {
  const images: [number, Buffer][] = [
    [32, png(32)],
    [128, png(128)],
    [256, png(256)],
  ];
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const entries: Buffer[] = [];
  for (const [size, data] of images) {
    const entry = Buffer.alloc(16);
    entry[0] = size === 256 ? 0 : size;
    entry[1] = size === 256 ? 0 : size;
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map(([, d]) => d)]);
}

/** Every file of `icons/` in the generated project. */
export function buildIconSet(): Record<string, Buffer> {
  return {
    "icons/32x32.png": png(32),
    "icons/128x128.png": png(128),
    "icons/128x128@2x.png": png(256),
    "icons/icon.png": png(512),
    "icons/icon.icns": buildIcns(),
    "icons/icon.ico": buildIco(),
  };
}

import { createHash } from "node:crypto";

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
export const ICON_MARKER = "icons/.devora-generated";

/**
 * Which icon files to (re)write, given what is on disk. A file is ours to refresh when it is missing, or when it is exactly what
 * an earlier run recorded in the marker (the app did not touch it), or when it is the tiny placeholder an early version wrote
 * (`icon.png` under 2 KB). A file the app changed or replaced is never overwritten. Returns the names to write and the new marker.
 */
export function planIconWrites(existing: Record<string, Buffer | undefined>, marker: Record<string, string> | undefined): { write: string[]; marker: Record<string, string> } {
  const set = buildIconSet();
  const write: string[] = [];
  const next: Record<string, string> = {};
  for (const [name, data] of Object.entries(set)) {
    const have = existing[name];
    const ours = have === undefined || (marker && marker[name] === sha(have)) || (name === "icons/icon.png" && have !== undefined && have.length < 2048);
    if (ours) {
      write.push(name);
      next[name] = sha(data);
    }
  }
  return { write, marker: next };
}
