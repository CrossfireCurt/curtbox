# Curtbox — GitHub, Codespaces, VS Code and AI agent collaboration

**Status:** The canonical source is [CrossfireCurt/curtbox](https://github.com/CrossfireCurt/curtbox). Working together no longer requires generating or downloading replacement source ZIPs. `main` deploys a validated `:main` image through GitHub Actions; tagged releases have a separate workflow.

## Recommended workflow

Use **GitHub Codespaces** for an instant, repeatable online VS Code environment, or local **VS Code + Dev Containers**. If by “Virtual Code” you meant **Visual Studio Code**, this is that workflow; if you meant an AI editor such as Cursor, it can still clone the same GitHub repository and follow `AGENTS.md`.

1. In the repository, click **Code → Codespaces → Create codespace on main**. GitHub provisions a remote development workspace. You may also open the codespace in the VS Code desktop app.
2. The checked-in `.devcontainer/devcontainer.json` creates **Node 22**, an isolated **PostgreSQL 16** service, installs locked npm dependencies with `npm ci`, and generates development credentials in `.devcontainer/local.env` (ignored by Git). Database password is deliberately **development-only** and the database has **no published port**.
3. Open a terminal and run `bash .devcontainer/start.sh`. Curtbox uses `http://localhost:3000` internally and Vite uses `http://localhost:5173`. Open forwarded **port 5173** from the Codespaces Ports tab. Keep forwarded ports **Private**, not public.
4. You can host from one browser and join as players through other browser sessions using the forwarded URL. Test reconnect, private cards and Socket.IO behavior. For public/mobile testing of forwarded Ports, Codespaces access/auth may require an authenticated browser: use a trusted staging server instead of making development ports public.
5. Run `npm run check && npm test && npm run test:pure && npm run test:audio && npm run build` before opening a PR. If a test requires host-only browser behavior, add a browser test instead of treating a pure-engine test as full validation.

### Accessing development admin credentials

The bootstrap creates a random local admin password in `.devcontainer/admin-password.local.txt`. The hashed value and session secret are in `.devcontainer/local.env`. These are generated in your devcontainer, **never committed or used for production**. Existing `.env` is not sourced, so local development cannot accidentally pick up a deployment's database or application credentials. Dev DB is `postgres://party:curtbox-dev-only@db:5432/party`; it is accessible only inside the Compose development network. The named development database volume is separate from production's `party_db`.

### Local VS Code instead of Codespaces

Clone `https://github.com/CrossfireCurt/curtbox.git`, install the **Dev Containers** extension and Docker Desktop / Docker Engine, then select **Dev Containers: Reopen in Container**. The same `.devcontainer` setup and commands apply. Alternatively, use native Node 22 + Postgres 16 as documented in `README.md`, but then you must configure your own environment.

## How future ChatGPT / coding-agent iterations work

- **GitHub is the source of truth.** Never begin by rebuilding an old ZIP, copying over `main`, or using prior chat summaries instead of the current repository.
- Read `AGENTS.md`, the relevant game/platform spec, and `docs/ROADMAP.md` plus the linked GitHub issue before changing game code.
- For each feature, create a branch named `feat/<issue>-short-description` (or `fix/<issue>-...`), make atomic commits, and open a PR targeting `main`.
- A coding agent connected to this GitHub repository can inspect files, create commits and PRs, and inspect Actions checks directly. In an editor, use an AI coding extension that can read the workspace and tests. If the user asks ChatGPT to modify the repository, use the GitHub connector and submit a PR or explicit branch changes.
- Have CI validate the PR. Review game-rule and privacy changes, then merge. A successful push to `main` publishes `ghcr.io/crossfirecurt/curtbox:main`. **No ZIP download** is required.
- **Delete the merged PR branch.** `.github/workflows/cleanup-merged-branches.yml` runs after merges/`main` pushes and removes only same-repository unprotected branches with a **merged PR whose final head SHA exactly matches the still-current branch HEAD**. It never touches `main`, fork branches, branches referenced by open PRs or branches advanced after a merge. `workflow_dispatch` can rerun the cleanup for previously merged branches. GitHub Settings → General → Pull Requests → **Automatically delete head branches** is an optional additional built-in safeguard.
- For a versioned, stable release, create `vX.Y.Z` from validated `main`. GitHub Actions creates a GitHub Release and GHCR image with that version. Your deployment uses `compose.ghcr.yml` and `scripts/update-from-ghcr.sh` to pull without rebuilding.
- Keep `docs/games/*`, `docs/DECISION_LOG.md`, `docs/ROADMAP.md` and `AGENTS.md` updated when behavior or requirements change. Do not claim a GitHub issue is done solely because its rule was added to Markdown.

## Collaboration guardrails

- **Never commit** `.env`, `.devcontainer/local.env`, `.devcontainer/admin-password.local.txt`, tokens, session secrets, production DB dumps, or real production admin passwords.
- Keep separate Host and Player roles; President / Asshole hidden card hands and Survey Show unrevealed answers stay private.
- Game rules and timers are authoritative on the server. Persist changes within existing room-locked Postgres transactions.
- Treat PR CI as a build check, **not** as proof that Android TV, multi-browser Socket.IO or real Docker hosting was tested.
- Existing production database volumes must remain untouched by Codespaces; do not run production update scripts inside a Codespace.
- If a feature requires more context, start from its issue; preserve unresolved decisions rather than quietly inventing rules.

## Queued work

Next implementation: [Android TV presenter APK](https://github.com/CrossfireCurt/curtbox/issues/1). Follow with [disconnect icons](https://github.com/CrossfireCurt/curtbox/issues/2), then the six game issues (#3–#8) unless the user reprioritizes. The **approved equal-rank correction** is: normal equal-rank play **skips** the next player; a successful **Social clears**. **That is not yet implemented in code** (issue #3).
