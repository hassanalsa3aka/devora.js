import path from "node:path";
import { writeFile } from "node:fs/promises";
import type { AppConfig } from "@devora/core";
import { loadProjectConfig } from "@devora/core/config-loader";
import { assignPorts } from "../build/portScheme.js";

function nginxBlock(app: AppConfig, appPort: number): string {
  return `server {
    listen 80;
    server_name ${app.domain};

    # No HTTPS by default — plain HTTP only, since this environment has no
    # real domain/DNS to issue a certificate against. The standard next step
    # on a real VPS with ${app.domain} actually resolving is \`certbot --nginx
    # -d ${app.domain}\`, which rewrites this block in place to add the
    # \`listen 443 ssl;\` + \`ssl_certificate\`/\`ssl_certificate_key\` directives
    # and a matching :80 redirect — not attempted here since automating real
    # ACME issuance needs infrastructure this command can't assume exists.

    location / {
        proxy_pass http://127.0.0.1:${appPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`;
}

function caddyBlock(app: AppConfig, appPort: number): string {
  return `${app.domain} {
    reverse_proxy 127.0.0.1:${appPort}
}
`;
}

export async function generateProxy(opts: { target: string; out?: string }) {
  const root = process.cwd();
  const project = await loadProjectConfig(root);

  if (opts.target !== "nginx" && opts.target !== "caddy") {
    console.error(`[devora] --target must be "nginx" or "caddy"`);
    process.exit(1);
  }

  // Each app's production port — matches the doc's one-Node-process-per-app
  // model for the self-hosted adapter (§13, adapter-node). Shared with
  // `devora start`'s own port assignment (portScheme.ts) — these used to be
  // two independently-guessed numbers (4000 here, 4173 in start.ts) that
  // silently disagreed; a real bug, since running `devora start` then
  // `devora generate:proxy`, exactly the documented workflow, produced a
  // proxy config pointing at ports nothing was actually listening on.
  const ports = assignPorts(project.apps);
  const blocks = project.apps.map((app) => {
    const appPort = ports.get(app.name)!;
    return opts.target === "nginx" ? nginxBlock(app, appPort) : caddyBlock(app, appPort);
  });

  const output = blocks.join("\n");
  const outPath = opts.out ?? path.join(root, opts.target === "nginx" ? "nginx.conf" : "Caddyfile");

  await writeFile(outPath, output);
  console.log(`[devora] generated ${opts.target} config for ${project.apps.length} app(s) → ${outPath}`);
  console.log(`[devora] no hand-editing needed — domains came straight from devora.config.ts`);
}
