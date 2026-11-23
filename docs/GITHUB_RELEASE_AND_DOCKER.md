# Curtbox: GitHub repository, CI/CD and Docker release guide

**Status (November 23, 2026): source has been published to [CrossfireCurt/curtbox](https://github.com/CrossfireCurt/curtbox). The first GitHub Actions CI run passed, including tests, production build, compiled artifact upload, and the `ghcr.io/crossfirecurt/curtbox:main` Docker-image push. A versioned release has not been tagged yet.** The instructions below describe ongoing development and release/deployment; the repository-creation step is already complete.

## 1. Clone the published repository / initial bootstrap (already completed)

For ongoing development, clone `https://github.com/CrossfireCurt/curtbox.git`; the repository already exists. The initial `git init` / `gh repo create` commands below are preserved for historical bootstrapping reference and must **not** be rerun against this repository. Prerequisites: Git, a GitHub account, GitHub CLI `gh` (recommended), and Node.js 22. **Do not commit `.env`, passwords, database dumps, downloaded private media, or local `node_modules`.** `.gitignore` excludes these.

From the directory containing `package.json`, `Dockerfile`, `.github/` and `AGENTS.md`:

```bash
# Make a reproducible dependency lockfile on your machine.
npm install
npm run check
npm test
npm run test:pure
npm run test:audio
npm run build
# package-lock.json should now exist; commit it. CI/Docker auto-use npm ci when present.

git init                          # skip if repo already initialized
git add .
git commit -m 'Curtbox: Survey Show, President Asshole, bots and GitHub CI/CD'
git branch -M main
gh auth login                     # opens GitHub login if not already connected
gh repo create curtbox --private --source=. --remote=origin --push
```

If the repository already exists, add it as origin (or use the existing origin) and push `main` instead of calling `gh repo create`. If `git init` reports an existing repository, don't replace its history. If you prefer to create the repository in GitHub's website, create an empty repository **without** a README/license and add its HTTPS/SSH URL using `git remote add origin <URL>`, then `git push -u origin main`.

A real `package-lock.json` was recovered from the successful first GitHub Actions build and committed. CI and Docker now use `npm ci` for reproducible dependency resolution. Update the lockfile alongside package manifest changes.

> Note: If you've modified the downloaded source since the ZIP release, compare/diff before replacing your working tree. Prefer applying a Git patch or merging changes instead of overwriting your local work.

## 2. Enable GitHub Actions and package publishing

Open **repository → Actions**. If prompted, enable workflows. Open **Settings → Actions → General** and allow the required GitHub and Docker actions; standard GitHub-hosted `ubuntu-latest` runners are used. No custom npm or Docker registry password is needed for CI. The publish jobs use the ephemeral GitHub Actions `GITHUB_TOKEN` with `packages: write`; the release job requests `contents: write`.

On the first `main` push, `.github/workflows/ci.yml` runs `npm run check`, `npm test`, `npm run test:pure`, `npm run test:audio`, and `npm run build`. A successful run also:

- uploads the compiled application as a 14-day workflow artifact;
- pushes `ghcr.io/<owner>/<repo>:main` (development image).

Workflows are intentionally not triggered to *publish* Docker images from pull requests. PRs run verification/build only. To make merges safer, enable branch protection or a ruleset for `main` and require the **Typecheck, tests and production build** check after the first successful CI run. The image builds for **linux/amd64** (typical x86-64 Linux hosts); ARM64 builds are not yet configured.

The GHCR package may initially be private, even if your repository is public. Find it under your GitHub profile/org **Packages**, then choose package settings / visibility as needed. Keeping it private is fine; pulling then requires authentication. If `GITHUB_TOKEN` cannot publish into a previously created package, confirm the package's repository association and **Actions access** permissions. See official GitHub package documentation.

## 3. Make a versioned release

After `main` CI is green, create and push a semantic version tag:

```bash
git switch main
git pull --ff-only
git tag -a v0.1.0 -m 'Curtbox v0.1.0'
git push origin v0.1.0
```

`.github/workflows/release.yml` runs tests and the production build again, then pushes `ghcr.io/<owner>/<repo>:v0.1.0` and, for stable tags, `:latest`. It publishes a GitHub Release with `curtbox-v0.1.0-app.tar.gz` and `SHA256SUMS.txt`, plus GitHub's automatically generated source archives. Version tags with a suffix like `v0.1.1-rc.1` receive a prerelease and **do not** change `:latest`.

The compiled app tarball contains compiled Node/React files, package manifests, documentation, and Compose files. It does **not** contain `node_modules` or `.env`: use `npm ci --omit=dev` after extracting it if running it directly without Docker. **Docker users should use the GHCR image instead.**

The workflow doesn't automatically generate Git tags or bump versions; you intentionally publish each version. This prevents accidental releases. Use an incremented tag for every new release; avoid moving or replacing an already-published version tag.

## 4. First-time Docker deployment using a GitHub image

Use the **same Curtbox directory, `.env`, and Compose project name** as your existing local-build installation; this preserves the existing named PostgreSQL volume (`curtbox_party_db` when your project directory is named `curtbox`). The new `compose.ghcr.yml` replaces `build: .` with `image:` and otherwise retains the original database and app configuration. It binds app port 3000 to loopback so your reverse proxy remains the public entry point.

In `.env`, keep existing `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, and `POSTGRES_PASSWORD`, and add (lowercase owner/repo):

```dotenv
CURTBOX_IMAGE=ghcr.io/YOUR_OWNER/curtbox:v0.1.0
```

For a private GHCR package, authenticate once on the **machine hosting Docker** using a GitHub personal access token (classic) with `read:packages`. Do not put the token into `.env`, Compose, or Git. For example:

```bash
# Create a GitHub classic PAT separately and keep it in a password manager.
# Supply it securely, without leaving the token in your shell history.
docker login ghcr.io -u YOUR_GITHUB_USER
# Docker prompts for password: paste your read:packages token.
```

For a public GHCR package, anonymous pulls generally work. If you're already logged in using expired credentials, `docker logout ghcr.io` can resolve a public-image pull failure.

**Before switching from locally built Compose**, back up the database and confirm the current Compose project name:

```bash
docker compose -f docker-compose.yml ps
# Run while the existing db service is healthy; save backup OUTSIDE source control.
docker compose -f docker-compose.yml exec -T db pg_dump -U party -d party > curtbox-db-backup.sql
```

Then switch to the image-based deployment:

```bash
docker compose -f compose.ghcr.yml config --quiet
bash scripts/update-from-ghcr.sh
```

Both files use `app`, `db`, and `party_db` with the same default project name when run from the same directory. **Do not use `docker compose down -v`** (it deletes the database volume). If you previously used `-p`, `COMPOSE_PROJECT_NAME`, or `name:`, set the same project name for both commands before switching. If you relocate the directory, set `COMPOSE_PROJECT_NAME` to the prior project name.

## 5. Updating from your machine (no source rebuild)

You can update using only Docker, `compose.ghcr.yml`, and `.env` on the Docker host:

```bash
# Pull the configured tag and recreate if there is a new image.
bash scripts/update-from-ghcr.sh
```

Choose a release **explicitly** by changing `CURTBOX_IMAGE` in `.env` from `:v0.1.0` to a newer `:v0.2.0`, then run the script again. If you prefer automatic adoption of the latest stable release when you run the command, use `:latest` instead. To test the latest successful `main` build, use `:main` (less stable than a release tag). `docker compose pull app` fetches the selected image; `docker compose up -d --no-build` recreates it while retaining Postgres data. No `git pull`, `npm install`, or Docker build is required for a container update.

For rollback, restore a previous version tag in `.env` and rerun the script. Rollbacks to an older app image may require a database backup restore if schema migrations become incompatible; preserving the volume alone does not guarantee schema rollback.

Check logs and status:

```bash
docker compose -f compose.ghcr.yml ps
docker compose -f compose.ghcr.yml logs --tail=100 app
```

Avoid configuring unattended automatic image updates until you're comfortable with database migration/rollback practices. Curtbox still requires real browser/PostgreSQL integration and security validation before a production deployment exposed to the Internet.

## 6. Pipeline map

| File | Responsibility |
|---|---|
| `.github/workflows/ci.yml` | PR/main checks, build artifact, published `:main` after passing checks |
| `.github/workflows/release.yml` | Tag-triggered checks, compiled release artifact, GHCR `:vX.Y.Z` and stable `:latest`, GitHub Release |
| `scripts/package-release.sh` | Compile-bundle tarball and SHA256 digest |
| `compose.ghcr.yml` | Pull-only Docker Compose service using GHCR |
| `scripts/update-from-ghcr.sh` | Pull and restart without rebuilding; retains DB volume |
| `Dockerfile` | Reproducible `npm ci` when lockfile is committed; fallback `npm install` |

## 7. Security and next milestones

- Keep `.env` and production database dumps out of Git; GitHub Actions does not receive production credentials.
- Grant only `read:packages` to deployment hosts, never `write:packages` unless actually needed.
- Use tags / branch-protection rules; consider pinning third-party GitHub Actions to immutable commit SHAs when hardening supply chain security.
- Consider adding ARM64 image builds if hosting on ARM hardware; current images target `linux/amd64`.
- Future queued tasks: collaborative coding workflow (Virtual Code or alternative), configurable Curtbox-server Android TV host APK, and presenter-side disconnected-player indicators. **These are not implemented by this CI/CD release.**
