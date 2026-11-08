#!/bin/bash
# Full gate: per-package typecheck, CLI rebuild, full suite, check:docs, package builds + pack check.
cd /home/user/devora.js
out=${1:-${TMPDIR:-/tmp}/devora-gate}
mkdir -p $out
r() { local name=$1; shift; if "$@" >$out/$name.log 2>&1; then echo "PASS $name"; else echo "FAIL $name (exit $?)"; fi; }
for p in @devorajs/core @devorajs/cli @devorajs/adapter-node @devorajs/adapter-vercel @devorajs/adapter-netlify @devorajs/scaffold create-devora; do
  r "tsc-${p//\//_}" pnpm --filter $p exec tsc --noEmit
done
r cli-build pnpm --filter @devorajs/cli build
r test pnpm run test
grep -E "Test Files|Tests " $out/test.log
r check-docs pnpm run check:docs
r pkg-build pnpm --filter @devorajs/core --filter @devorajs/adapter-node --filter @devorajs/adapter-vercel --filter @devorajs/adapter-netlify --filter create-devora run build
r pack-check node scripts/checkPackContents.mjs
