# Try Devora.js in 15 minutes

For anyone who has never used it. You will scaffold a project, run it, build it, serve the build,
then add a second app that shares a function with the first. Everything below was run on a fresh
project from the published packages (`@devorajs/core` and `@devorajs/cli` 0.3.5).

## Before you start

- **Node 20 or newer** (`node -v`), and npm. pnpm and Yarn work too; the commands below use npm.
- An empty folder to work in. Nothing is installed globally.

## 1. Create a project (1 minute)

```bash
npm create devora@latest myproj
cd myproj
```

Pick the full-stack scope if it asks. You get three apps (`marketing`, `dashboard`, `admin`) and
one shared backend in `packages/backend`. Dependencies are installed for you.

## 2. Run it (2 minutes)

```bash
npm run dev
```

You should see `devora.js 0.3.5  dev · 3 apps`, then each app's URL and its routes. The apps start
on port 10000 and move up if a port is taken, so read the URLs it prints. Open the first one. Try
`/login` on any app: any username works (it is a demo, there is no password check).

Stop it with Ctrl+C.

## 3. Build and serve the build (3 minutes)

```bash
npm run build
```

Expected: `built 3 apps`, no errors.

`npm start` serves the production build, and it **refuses to start until you say where login
sessions are stored**. Right after a scaffold it prints one line and exits with status 1:
`[devora] no session store configured: add sessions: { store: "memory" } under shared in
devora.config.ts ...`. That is by design, not a crash of your project. Open `devora.config.ts` and
add one line inside `shared`:

```ts
sessions: { store: "memory" },   // one long-running server only; use a database-backed store to deploy
```

Rebuild (`npm run build`, the store choice is baked into the build), then set a secret and start:

```bash
export DEVORA_SESSION_SECRET="$(openssl rand -base64 32)"
npm start
```

Expected: one `[adapter-node] "<app>" → http://localhost:4173` line per app (4173, 4174, 4175).
`curl -i localhost:4173/` answers `200` with `content-security-policy` and `x-frame-options` headers.

## 4. A small task: add a second app and share a function (8 minutes)

```bash
npx devora add reports --auth shared
npm install
```

Expected: `registered "reports" in devora.config.ts` and `created apps/reports`.

Now write a function once, in the shared backend, and call it from two apps.

`packages/backend/greeting.ts`:

```ts
import { serverFn } from "@devorajs/core";

export const greet = serverFn(async (input: { name: string }) => `Hello, ${input.name}!`);
```

Expose it in `packages/backend/package.json` by adding `"./greeting": "./greeting.ts"` to
`exports`. Then create the same page in two apps, `apps/marketing/routes/hello.tsx` and
`apps/reports/routes/hello.tsx`, changing the name string in each:

```tsx
import type { RequestContext } from "@devorajs/core";
import { PageShell } from "@devorajs/core";
import { greet } from "@devorajs/backend/greeting";

export const renderMode = "ssr";

export async function loader(ctx: RequestContext) {
  return { message: await greet({ name: "marketing" }, ctx) };
}

export default function Hello({ data }: { data?: { message: string } }) {
  return (
    <PageShell appName="marketing">
      <h1>{data?.message}</h1>
    </PageShell>
  );
}
```

Run `npm run dev` again and open `/hello` on both apps. Each prints its own greeting from the one
function in `packages/backend`.

## What to report

Anything that surprised you, even if you are not sure it is a bug. The most useful reports have:

- what you tried (the exact command),
- what you expected,
- what happened (the output, copied),
- how long it took to get to a running app,
- whether you would use it again, and what would have to change for that to be a yes.

There is a **Tester feedback** issue template for exactly this.

## Where to send it

- GitHub issues: https://github.com/hassanalsa3aka/devora.js/issues (choose "Tester feedback")
- Discord, for questions and quick feedback: https://discord.gg/wYFYmFxdS8
- Security problems: not in public, see [SECURITY.md](SECURITY.md).

Devora.js is early and pre-1.0; see the Status section of the [README](README.md) for what that
means.
