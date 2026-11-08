#!/usr/bin/env node
// Renders every route of the repository's four apps under `devora dev` (Vite) and under the experimental dev server, and
// compares status, headers and normalised HTML. It starts both servers itself (ports 11001-11004) on copies of the apps in
// a temporary project. A failed request or a timeout counts as a failure, and so does a difference; the exit code says so.
//   node scripts/dev-server-compare/parity.mjs
import { APP_PORTS, get, makeRepoAppsProject, startServer } from "./lib.mjs";

const KEEP = ["content-type", "content-security-policy", "x-frame-options", "x-content-type-options", "strict-transport-security", "cache-control", "referrer-policy", "permissions-policy"];
const header = (v) => (v ?? "").replace(/'nonce-[^']*'/g, "'nonce-N'");
const normalise = (body, type) =>
  !/html/.test(type)
    ? body
    : body
        .replace(/<script\b[^>]*><\/script>/g, "<script/>")
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "<script/>")
        .replace(/<link rel="stylesheet"[^>]*>/g, "<link-css/>")
        .replace(/data-island="island-\d+"/g, 'data-island="N"')
        .replace(/nonce="[^"]*"/g, 'nonce="N"')
        .replace(/name="_csrf" value="[^"]*"/g, 'name="_csrf" value="T"')
        .replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, "TIME")
        .replace(/data-island-url="[^"]*"/g, 'data-island-url="U"')
        .replace(/data-csr-entry="[^"]*"/g, 'data-csr-entry="U"');

async function snapshot(port, paths) {
  const out = {};
  for (const p of [...new Set([...paths, "/does-not-exist", "/sitemap.xml", "/favicon.ico", "/robots.txt", "/api/nope"])]) {
    const r = await get(`http://localhost:${port}${p}`);
    if (!r.ok) {
      out[p] = { failed: r.error };
      continue;
    }
    const type = r.headers.get("content-type") ?? "";
    out[p] = {
      status: r.status,
      headers: Object.fromEntries(KEEP.map((k) => [k, header(r.headers.get(k))]).filter(([, v]) => v !== "")),
      cookies: r.headers.getSetCookie().map((c) => c.split("=")[0]).sort(),
      location: r.headers.get("location"),
      body: normalise(r.body, type),
    };
  }
  return out;
}

const project = makeRepoAppsProject();
const failures = [];
let compared = 0;
let identical = 0;
let statusAndHeadersOnly = 0;
try {
  for (const [app, port] of Object.entries(APP_PORTS)) {
    const snaps = {};
    for (const experimental of [false, true]) {
      const label = experimental ? "own" : "vite";
      const server = await startServer({ root: project.root, experimental, port, args: [`--app=${app}`] });
      try {
        const paths = [...server.output().matchAll(/^\s+(page|api)\s+(\S+)/gm)].map((m) => m[2].replace(/\[\.\.\.[^\]]+\]/g, "a/b").replace(/\[[^\]]+\]/g, "1"));
        if (paths.length === 0) failures.push(`${app}/${label}: no routes were listed at start`);
        snaps[label] = await snapshot(port, paths);
      } finally {
        await server.stop();
      }
    }
    for (const p of Object.keys(snaps.vite)) {
      const a = snaps.vite[p];
      const b = snaps.own[p];
      if (a.failed || !b || b.failed) {
        failures.push(`${app} ${p}: request failed (vite: ${a.failed ?? "ok"}, own: ${b?.failed ?? "ok"})`);
        continue;
      }
      compared++;
      const diffs = [];
      if (a.status !== b.status) diffs.push(`status ${a.status} vs ${b.status}`);
      for (const k of new Set([...Object.keys(a.headers), ...Object.keys(b.headers)])) if (a.headers[k] !== b.headers[k]) diffs.push(`header ${k}: ${a.headers[k]} | ${b.headers[k]}`);
      if (a.cookies.join() !== b.cookies.join()) diffs.push(`cookies ${a.cookies} | ${b.cookies}`);
      if (a.location !== b.location) diffs.push(`location ${a.location} | ${b.location}`);
      const both500 = a.status === 500 && b.status === 500; // the two servers print different stacks in a 500 page: status and headers only
      if (both500) statusAndHeadersOnly++;
      if (a.body !== b.body && !both500) {
        let i = 0;
        while (i < a.body.length && a.body[i] === b.body[i]) i++;
        diffs.push(`body differs at ${i}: vite=${JSON.stringify(a.body.slice(Math.max(0, i - 40), i + 80))} own=${JSON.stringify(b.body.slice(Math.max(0, i - 40), i + 80))}`);
      }
      if (diffs.length === 0) identical++;
      else failures.push(`${app} ${p}: ${diffs.join("; ").slice(0, 600)}`);
    }
  }
} catch (error) {
  failures.push(String(error.message ?? error));
} finally {
  project.cleanup();
}

console.log(`parity: ${identical} of ${compared} compared routes identical (status, headers, normalised HTML); ${statusAndHeadersOnly} of them are 500 pages compared on status and headers only`);
if (failures.length > 0) {
  console.log(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("PASS");
