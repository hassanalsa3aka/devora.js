# Splitting apps/backend into their own repos

`devora split`/`sync`/`status` (architecture-v2.md §5) let you pull an app or `packages/backend`
out of this repo into its own, independently-clonable Git repo, while still building/deploying it
from here. This is real Git underneath — a submodule and a handful of `fetch`/`merge`/`push`
commands — not a new devora-invented sync protocol. If you already know how Git submodules work,
you already know most of what this does.

## Two use cases this serves

- **A solo dev wanting cleaner repo boundaries.** Maybe `packages/backend` has grown into something
  you'd like versioned and tagged on its own, independent of every app's release cadence.
- **A real team where different people own different pieces independently** — one person on
  `packages/backend`, one on `apps/admin`, one on the marketing site — each cloning and working in
  just their own piece, integrating back via explicit sync rather than one shared working tree.

## `devora split <app-name|backend> --repo=<git-url>`

Converts `apps/<name>` (or the literal `backend`, for `packages/backend`) from plain tracked
content in this repo into a **git submodule**. You create the empty remote repo yourself first
(on GitHub, GitLab, wherever) — this tool doesn't create accounts or repos on your behalf, the same
way `devora deploy` requires you to have already run `vercel link`/`netlify link`.

What actually happens, in order:

1. The directory's current content is copied out and pushed to `--repo` as that repo's real
   initial commit — an empty remote has nothing to reference otherwise.
2. The directory is removed from this repo's own tracked files.
3. It's re-added at the same path via `git submodule add <repo> <path>`.

Nothing is committed in this repo automatically — review with `git status`/`git diff --cached` and
commit it yourself, the same "show what would happen, leave the actual commit to you" pattern this
CLI uses everywhere else (`devora new`, `devora remove`). The one thing that *isn't* easily
reversible is the push to `--repo` in step 1 — confirmed explicitly before anything runs.

After this, `apps/<name>` (or `packages/backend`) is a real, independent Git repo. A fresh clone of
the main project needs `git submodule update --init` to actually populate it — that's standard Git
submodule behavior, not something `devora dev`/`build` currently automates for you.

## `devora sync <name> [--from-main | --to-main] [--all]`

A thin wrapper around fetch/merge/push against a split-off piece's own remote — one direction at a
time:

- **`--from-main`**: fetches the split repo's remote and merges its latest `main` into the local
  submodule checkout, then stages the updated reference (the "gitlink") in this repo. Use this to
  pull in changes a teammate pushed directly to the split repo.
- **`--to-main`**: pushes commits you made directly inside the submodule's own checkout up to its
  remote's `main`. Use this after editing files inside `apps/admin`/`packages/backend` and
  committing there (a normal `git commit`, run from inside that directory).

Both directions show a real commit list and ask for confirmation before doing anything (`--yes`
skips the prompt for scripted use). Name one target (`devora sync admin --from-main`), several
(`devora sync admin backend --from-main`), or every split-off piece at once (`devora sync --all
--from-main`).

**A genuine same-line conflict between two contributors is a real Git conflict** — `sync` surfaces
it exactly the way a plain `git merge` would (real conflict markers, `git status` showing
"Unmerged paths"), naming the conflicting file(s) and which side changed what. It does not attempt
to auto-resolve it: fix it inside the submodule's own checkout the normal way (edit, `git add`,
`git commit`), then re-run `sync --to-main` if the resolution needs to go back to the remote.

## `devora status --all`

One view across every split-off app/backend: up to date, local commits not yet pushed, remote
commits not yet pulled, diverged (both), or "gitlink change not yet committed in the main repo"
(you ran `sync`/`split` but haven't committed the result here yet).

## What this doesn't do

- **Auto-resolve conflicts.** A real conflict is real work — this tool's job is surfacing it
  clearly (see `sync` above), not guessing which side is "right."
- **Create remote repos or manage credentials.** You create the empty repo and have push access
  to it before running `split`; this tool never touches your Git hosting account.
- **Replace `git submodule update --init` on a fresh clone.** Standard Git behavior, unchanged.

## Ownership and governance rules that matter more once repos are actually split

Two conventions from architecture-v2.md's backend work (§3.2/§3.3) are worth restating here,
since they matter most exactly when different people own different split-off pieces:

- **API route ownership** (§3.2.1): shared backend logic goes in `packages/backend` — an app-local
  `api/` file is the exception, for something genuinely app-specific. This doesn't change once
  `packages/backend` is split into its own repo; an app's `api/` file still imports from
  `@devorajs/backend` normally. Splitting only changes how that package's *source* is
  tracked/versioned, not where routes are declared — the person who owns `apps/admin` shouldn't
  need write access to `packages/backend`'s repo just to consume a function from it.
- **Middleware governance** (§3.3.1): every use of `fromExpressMiddleware()`/`fromFastifyPlugin()`
  is registered in one place, `packages/backend/middleware.ts`. Once `packages/backend` is its own
  repo owned by a specific person/team, this is *their* file to review — "a new external dependency
  is now in the request pipeline" stays a single, visible change in the one repo whose owner is
  positioned to actually review it, regardless of which app's contributor wanted to use it.
