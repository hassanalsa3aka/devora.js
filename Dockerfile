# syntax=docker/dockerfile:1
#
# Builds and runs exactly one devora app per image (ARG APP_NAME, required) —
# matches this project's own one-process-per-app model (architecture-v1.md
# §13, adapter-node); see docker-compose.yml for running all three together.
#
# "Fat but correct" on purpose: a full monorepo `pnpm install` in both
# stages, not a hand-pruned/multi-package-json-COPY-list install. This
# project's own history (this exact session) repeatedly found real bugs from
# exactly the opposite instinct — assuming a platform's tooling or a
# hand-maintained file list would correctly trace/include every needed
# dependency (see ROADMAP.md #4's react/react-dom vendoring bug for Vercel/
# Netlify). Docker doesn't have that constraint at all — a real `pnpm
# install` here resolves `react`/`react-dom`/etc. normally, no vendoring
# workaround needed — so there's no reason to reintroduce that risk for a
# smaller image. Revisit only if image size becomes an actual problem.
#
# One base image for build AND runtime (no slim/alpine swap) — deliberately,
# per ROADMAP.md #6's already-documented native-addon risk (a real crash
# hit trying a native DB driver under Vite's SSR module graph); alpine's musl
# libc is a common source of exactly that class of native-addon breakage,
# not worth the smaller image for an unproven benefit here.

FROM node:20-slim AS build
WORKDIR /repo
# Pinned here, in the image only — NOT via root package.json's
# "packageManager" field, which was deliberately removed project-wide for
# Yarn/corepack compatibility (see README.md's cross-package-manager notes).
# Without a pin, corepack grabs whatever pnpm is latest at build time; a real
# build against pnpm 12.3.4 failed with ERR_PNPM_IGNORED_BUILDS (a newer
# default-deny on install scripts, e.g. esbuild's, that 9.9.0 — what this
# project has actually been developed and verified against everywhere else
# — doesn't have) confirmed this isn't hypothetical.
RUN corepack enable && corepack prepare pnpm@9.9.0 --activate

COPY . .
RUN pnpm install --frozen-lockfile

ARG APP_NAME
RUN test -n "$APP_NAME" || (echo "Pass --build-arg APP_NAME=<marketing|dashboard|admin>" >&2 && exit 1)
# devora build itself forces NODE_ENV=production internally regardless of
# what's set here (packages/cli/src/commands/build.ts — a real bug found via
# an actual Vercel deploy, see ROADMAP.md #4) — not relied on here, just not
# fighting it either.
RUN node packages/cli/dist/index.js build --app=${APP_NAME}

FROM node:20-slim AS runtime
WORKDIR /repo
ARG APP_NAME
ENV APP_NAME=${APP_NAME}
ENV NODE_ENV=production

COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/package.json /repo/pnpm-workspace.yaml ./
COPY --from=build /repo/devora.config.ts ./
COPY --from=build /repo/assets ./assets
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/apps/${APP_NAME} ./apps/${APP_NAME}

# Fixed internal port — docker-compose.yml maps a distinct *host* port per
# service instead of varying this; a real bare-VPS deployment (no per-app
# container isolation) is what portScheme.ts's shared sequential-port scheme
# is actually for, see packages/cli/src/build/portScheme.ts.
EXPOSE 4173
CMD ["sh", "-c", "node packages/cli/dist/index.js start --app=${APP_NAME} --port=4173"]
