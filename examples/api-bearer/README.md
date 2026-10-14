# Example: api-bearer

A backend-only Devora.js API for a mobile (or any non-browser) client. No pages, no React.

- `POST /api/session` `{ "username": "..." }` → `{ "token": "..." }` (demo: no password check)
- `DELETE /api/session` with `Authorization: Bearer <token>` → revokes it, everywhere, at once
- `GET /api/me` → the session's data, or a JSON 401
- `GET`/`POST /api/todos` → the caller's todos (in memory, per user)
- `GET /api/health`, and `GET /` → a small JSON status

`apps/api/app.config.ts` shows two settings meant for this kind of API:

- `csrf: false` — Bearer clients keep no cookies, so the CSRF cookie is never issued.
- `cors` — a browser app on `http://localhost:5173` may call the API; any other origin gets no
  CORS headers.

## Run it

```bash
npm ci
npm run dev    # http://localhost:10000
```

```bash
API=http://localhost:10000
TOKEN=$(curl -s -X POST -H 'content-type: application/json' -d '{"username":"ana"}' \
  $API/api/session | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Buy milk"}' $API/api/todos
curl -s -H "Authorization: Bearer $TOKEN" $API/api/todos
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" $API/api/session
curl -s -H "Authorization: Bearer $TOKEN" $API/api/me     # {"message":"Authentication required"}
```

On the client, keep the token in secure storage (the iOS Keychain, Android's EncryptedSharedPreferences).

## Before deploying

`devora.config.ts` sets `sessions: { store: "memory" }`; serverless platforms run many instances,
so point it at a store backed by your database or Redis, and keep todos there too. Set
`DEVORA_SESSION_SECRET`. See [Deployment](https://devorajs-docs-docs.vercel.app/deployment).

This example hasn't been deployed; it's built and checked in CI (`../check.mjs`).
