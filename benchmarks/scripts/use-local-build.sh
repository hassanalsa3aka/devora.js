#!/usr/bin/env bash
# Builds @devorajs/core and @devorajs/cli from this working tree and copies the build output over
# the published 0.3.4 packages installed in the two Devora.js benchmark apps, so the harness
# measures the working tree. `npm ci` inside an app restores the published packages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
(cd "$ROOT" && pnpm --filter @devorajs/core build >/dev/null && pnpm --filter @devorajs/cli build >/dev/null)
for app in devora devora-api; do
  dest="$ROOT/benchmarks/apps/$app/node_modules/@devorajs"
  rsync -a "$ROOT/packages/core/dist/" "$dest/core/dist/"
  cp "$ROOT/packages/cli/dist/index.js" "$dest/cli/dist/index.js"
done
echo "local build copied into benchmarks/apps/{devora,devora-api}"
