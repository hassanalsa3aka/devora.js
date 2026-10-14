# Example: multi-app

One Devora.js project with three apps that share **one backend and one login**:

- `apps/site` — a public site, `auth: "none"` (no sessions, no secret needed).
- `apps/app` — a dashboard people log in to. `/notes` lists notes and adds one through a
  CSRF-protected form (`fail(400)` for an empty note, a 303 redirect on success).
- `apps/api` — a backend-only JSON API for a mobile client. `POST /api/session` returns a Bearer
  token; `GET`/`POST /api/notes` read and add notes.

Both the dashboard and the API call the same functions in `packages/backend/notes.ts`. A token
issued by the API is accepted by the dashboard too, because both apps use `auth: "shared"`.

This is the finished project from the docs tutorial,
[Build a multi-app project](https://devorajs-docs-docs.vercel.app/multi-app-tutorial), which
explains each file.

## Run it

```bash
npm ci
npm run dev
```

- Site: http://localhost:10000
- Dashboard: http://localhost:10001/notes (the demo login accepts any name)
- API: http://localhost:10002/api

```bash
TOKEN=$(curl -s -X POST -H 'content-type: application/json' -d '{"username":"bob"}' \
  http://localhost:10002/api/session | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"text":"Hello from the API"}' http://localhost:10002/api/notes
```

Production build on this machine:

```bash
npm run build
DEVORA_SESSION_SECRET=$(openssl rand -base64 32) npm start   # 4173, 4174, 4175
```

## Before deploying

- Notes are stored in `notes.json` in the project root, standing in for a database (each app
  loads backend modules separately, so a variable wouldn't be shared). Serverless platforms
  can't write files: use your database.
- `devora.config.ts` sets `sessions: { store: "memory" }`, which only works for one long-lived
  process. Point it at a store backed by your database.
- Each app is its own Vercel project or Netlify site; the committed `vercel.json` and
  `netlify.toml` already build it. `app` and `api` need the same `DEVORA_SESSION_SECRET`. See
  [Deployment](https://devorajs-docs-docs.vercel.app/deployment).

This example hasn't been deployed; it's built and checked in CI (`../check.mjs`).
