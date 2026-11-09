// Composes the desktop app icon: the Devora.js logo (assets/icons/devorajs-logo-blackbg.png) on a rounded dark tile, 1024 x 1024 RGBA, using
// the system Chrome's canvas (nothing else on this machine draws and clips). Then, on macOS:
//   for n in 32 128 256 512; do sips -z $n $n icon-1024.png --out icon-$n.png; done
// and src/iconData.ts holds the four PNGs as base64. Usage: node tools/make-icon.mjs <output.png>   (needs playwright-core and Chrome)
import { chromium } from "playwright-core";
import fs from "node:fs";
const src = fs.readFileSync(new URL("../../../assets/icons/devorajs-logo-blackbg.png", import.meta.url)).toString("base64");
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const page = await browser.newPage();
const dataUrl = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 1024, 1024);
  // macOS icon grid: the rounded square is 824 of 1024, corner radius about 185
  const m = 100, size = 824, r = 185;
  g.save();
  g.beginPath();
  g.roundRect(m, m, size, size, r);
  g.clip();
  g.fillStyle = "#000";
  g.fillRect(m, m, size, size);
  // the glyph sits in the middle of the source; crop a square around it and scale it to fill the tile with margin
  const crop = 1000, cx = 635, cy = 610;
  g.drawImage(img, cx - crop / 2, cy - crop / 2, crop, crop, m, m, size, size);
  g.restore();
  return c.toDataURL("image/png");
}, src);
fs.writeFileSync(process.argv[2], Buffer.from(dataUrl.split(",")[1], "base64"));
await browser.close();
