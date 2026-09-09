# Contributing to Devora.js

Devora.js is early (pre-1.0) and built by one person so far — feedback, bug reports, and small
fixes are genuinely welcome. Bigger features are worth opening an issue to discuss first, since
the framework's scope is deliberately kept tight (see architecture-v1.md §11 for what's
explicitly out of scope).

## Running it locally

```bash
git clone https://github.com/hassanalsa3aka/devora.js.git
cd devora.js
pnpm install
pnpm exec devora dev --app=dashboard
```

npm and Yarn also work — see `VERIFICATION.md` for what's actually tested under each. Node
`>=20` required.

## Filing a useful issue

- Check `README.md`'s "Current limitations" and `ROADMAP.md`'s status section first — dynamic
  routes, streaming SSR, and `devora deploy`'s authenticated-deploy path are known gaps, not
  bugs.
- Include: which app/render mode you were using, the exact command, and what you expected vs.
  what happened. A minimal repro (even just `devora new test-app --auth none` plus one added
  file) is the fastest way to get a real fix.

## What's welcome right now

- Bug reports against anything in `README.md`'s "Key features" list.
- Tests — see `VERIFICATION.md` for exactly what's uncovered today.
- Small, focused fixes with a clear before/after.

## What to discuss first (open an issue before a PR)

- Anything touching `packages/core`'s public API shape.
- New render modes, new adapters, or anything in architecture-v1.md §11's "not building yet"
  list.

## Versioning

Pre-1.0 (`0.1.x` across every package). Breaking changes can happen between minor versions
until 1.0 — check `CHANGELOG.md` before upgrading, and pin an exact version if you need
stability.
