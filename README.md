# Curtbox

**Self-hosted browser party games.** Curtbox has a common room/join/Host-presenter system and two selectable games: **Survey Show** and **President / Asshole**. The repo is a React 19 / Vite client, Node.js 22 / Express / Socket.IO server and PostgreSQL 16 persistent room store.

> **Development handoff (November 23, 2026):** President / Asshole is integrated as a first-pass game in source, with 30 passing PA rules tests (including bots); across both games and client static checks, 65 dependency-light checks pass. A complete npm/TypeScript/Vite build, Docker/PostgreSQL startup and multi-device browser E2E test have **not** been verified in this authoring environment. Resolve those steps before production use. The original Survey Show code remains present and requires regression testing.

## Start here for architecture and decisions

- [`AGENTS.md`](AGENTS.md): read-first instructions for another AI coding agent.
- [`docs/PLATFORM_SPEC.md`](docs/PLATFORM_SPEC.md): shared room architecture, roles, visual style, security and hosting.
- [`docs/games/SURVEY_SHOW_SPEC.md`](docs/games/SURVEY_SHOW_SPEC.md): full Survey Show rules, question sourcing, scoring and current explicit Submit behavior.
- [`docs/games/PRESIDENT_ASSHOLE_SPEC.md`](docs/games/PRESIDENT_ASSHOLE_SPEC.md): full President / Asshole gameplay, Card Exchange, Decrees, Democracy and Term Limits.
- [`docs/ARCHITECTURE_AND_AGENT_HANDOFF.md`](docs/ARCHITECTURE_AND_AGENT_HANDOFF.md): file map, Socket.IO contracts, state machines, tests, current limitations, critical next steps.
- [`docs/DECISION_LOG.md`](docs/DECISION_LOG.md): what is final, what older ideas were superseded, what still needs verification.
- [`docs/GITHUB_RELEASE_AND_DOCKER.md`](docs/GITHUB_RELEASE_AND_DOCKER.md): GitHub publication, CI/CD, versioned GHCR images, update/rollback guide.
- [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md): GitHub Codespaces / VS Code setup, AI coding workflow, PR-based iteration without ZIP handoffs.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): Open feature queue and GitHub issues.

Older November 20 Survey Show planning documents remain in [`docs/archive/`](docs/archive/). They are historical, not the authoritative current implementation. In particular **Survey Show's percentage slider is a preview; a separate Submit button records the answer and the full timer runs**.

## Playing

1. Open Curtbox and select **Survey Show** or **President / Asshole**.
2. Select **Create new room** on the Host device. Curtbox assigns a random four-letter code. The Host configures the selected game and opens the lobby.
3. Players use `/room/ABCD`, scan the Host's QR code, or enter the room code in Curtbox, then select **Player** and enter their name. A person who also hosts must use a separate browser/device as Player.
4. **Survey Show** starts when Primary Controller initiates a 15-second countdown with >=2 Players. **President / Asshole** starts immediately when all human Players have readied and >=4 combined human/bot seats (including at least one human) are present, no countdown. Newcomers to a card hand wait until the following hand.
5. Host sees the public game presentation. Players see personal controls on their phones. President / Asshole private card hands never appear on Host; its physical pile appears on Host, not Player phones.

### Survey Show

Two regular rounds and a selected finale: Top 3, Rank Answers, or Percentage Showdown. Percentage guesses are explicit Submit and revisable until the countdown expires; guessing without Submit scores no answer. Server provides factual sourced questions, predictions, scoring and stepwise public reveals. See the game spec above for formulas and UX.

### President / Asshole

4–8 combined human/bot Players (bots optional, host-configurable 0–7), one full 52-card deck, single/pair/triple/four-kind play, existing 2/four-kind clears and optional Social. ordinary equal-rank plays skip the next player with synchronized animations, while a successful Social clears (see [issue #3](https://github.com/CrossfireCurt/curtbox/issues/3)), rank succession, host-configurable timers and readiness. Presidential Decrees cover seating, dealing, play direction, Card Exchange, Democracy, Term Limits and optional drinking. If Term Limits gives a decree N rounds, it lasts exactly N complete hands and expires *before* the next hand; retroactive countdowns persist after Term Limits ends. Full rules and caveats are in the game spec.

## Install and run

Requires **Node.js 22+**, npm and PostgreSQL 16 (included in Docker Compose). In a normal networked environment:

```sh
npm install
cp .env.example .env
npm run password-hash -- 'your-secure-admin-password'
# Paste the generated hash into ADMIN_PASSWORD_HASH in .env.
# Use `openssl rand -hex 32` to generate SESSION_SECRET.
# Set POSTGRES_PASSWORD to a strong password.
npm run check
npm test
npm run build
docker compose up --build -d
```

Application listens on `http://localhost:3000`. Configure HTTPS and WebSockets in a reverse proxy; direct `/room/ABCD`, `/api/*` and `/socket.io/*` routes must be forwarded. Compose's port binding is loopback by default for a local reverse proxy. Do not expose unaudited versions to the public Internet.

### Dependency-light tests

If npm dependencies cannot be installed but TypeScript is installed locally or globally, run:

```sh
npm run test:pure                 # Both game engines + client static/route tests (65 total)
npm run test:president:pure       # President / Asshole engine alone (30 tests)
npm run test:audio                # Audio ZIP fallback regression tests (3 tests; unzip + zip required)
```

This transpiles pure TypeScript modules in a temporary directory, then runs Node tests without a server or database. **They do not replace** a full npm check/build or browser/database integration tests.

## Directory summary

| Path | Purpose |
|---|---|
| `shared/types.ts` | Shared platform and Survey Show types, `RoomState`/`RoomView` and game union |
| `shared/president.ts` | President / Asshole types, settings and decree catalog |
| `server/src/core.ts` | Survey Show state machine and room logic |
| `server/src/president.ts` | President / Asshole server-authoritative engine |
| `server/src/index.ts` | Express, Socket.IO, Postgres transactions, room events, admin |
| `client/src/App.tsx` | Shared catalog, join/create and Survey Show UI; game routing |
| `client/src/PresidentAsshole.tsx` | President / Asshole Host/Player UI and settings editor |
| `client/src/styles.css` | Curtbox + both games' styles |
| `server/tests/` | Survey Show and President / Asshole core unit tests |
| `docs/` | Authoritative per-game/platform specs and implementation handoff |

## Build troubleshooting (November 23, 2026)

The first President / Asshole source release produced `TS18048: game.vote is possibly undefined` in `client/src/PresidentAsshole.tsx` on `npm run build`. This revision uses a narrowed immutable `vote` variable in the Democracy UI, including the proposal callback. `scripts/fetch-audio.mjs` also now checks each ZIP before accepting it, so an HTTP-200 HTML error from Kenney falls through to the verified OpenGameArt alternative. See `docs/BUILD_TROUBLESHOOTING.md`. A full app build and Docker startup **still require verification on a machine with npm dependencies**, as this authoring environment has no registry access.

## Known limitations

- Complete frontend/backend build and real Socket.IO/Postgres multi-device test must be done in a dependency-enabled environment.
- President / Asshole has an integrated functional first pass; verify controller/grace and voting edge cases on multiple actual devices.
- Historical decree ideas **Dictatorship, Executive Order, Presidential Authority, Ranked Authority, Board Meeting** are not reintroduced without confirming their final design.
- Survey Show question bank includes 302 curated percentage prompts and 2 finale sets, but line-by-line editorial audit of every source is unfinished.
- Current visual reactions and some sound effects are synthesized/placeholder-quality; original production artwork, accessible polish and comprehensive security testing remain future work.

See `docs/ARCHITECTURE_AND_AGENT_HANDOFF.md` for a prioritized acceptance test list and full current-state transparency.

## Computer opponents (President / Asshole)

In **Create Room → President / Asshole → Host setup**, set **Computer opponents (bots, 0–7)**. Default is zero. Bots show as `Bot 1`, `Bot 2`, etc., on the public presentation, automatically ready and make legal moves server-side. The room supports up to eight combined seats, so three bots + one human player can start immediately once the human readies; a host/presenter by itself is not a human Player. Host settings are locked after game play begins. Bots can earn Presidency, enact decrees, exchange cards, vote in Democracy and use Social when enabled. Bot opponents are not available in Survey Show yet.

Run `npm run test:president:pure` for bot and card-engine regression coverage. For known caveats and postponed work, see `docs/ARCHITECTURE_AND_AGENT_HANDOFF.md`.


## GitHub Actions and Docker image deployment (November 23, 2026)

This source now contains **GitHub Actions CI** and a **tag-based release pipeline**, plus a pull-only Docker Compose deployment. On pushes and PRs, CI runs type checks, tests and a production build; a passing main push publishes `ghcr.io/<owner>/<repo>:main`. Pushing `vX.Y.Z` tags runs a release pipeline that publishes a compiled tarball/checksums as GitHub Release assets and a `ghcr.io/<owner>/<repo>:vX.Y.Z` image (stable releases also update `:latest`). This is **source/configuration work only** until pushed and tested in your GitHub repo.

To update the running Docker image from the GHCR release **without building**:

1. Preserve your existing `.env`, add `CURTBOX_IMAGE=ghcr.io/<owner>/<repo>:vX.Y.Z`. Authenticate on the deployment machine if the package is private.
2. Run `bash scripts/update-from-ghcr.sh` from the Curtbox directory. This pulls the image and runs `docker compose -f compose.ghcr.yml up -d --no-build`; the named PostgreSQL volume is retained.
3. To roll back, set `CURTBOX_IMAGE` to an earlier tag and rerun the update script. Back up the database before first switching Compose configurations.

**One-time repository setup, lockfile generation, GitHub permissions, release commands, and database-volume precautions:** read [`docs/GITHUB_RELEASE_AND_DOCKER.md`](docs/GITHUB_RELEASE_AND_DOCKER.md) in full.

## Collaborating without ZIP downloads

Source of truth is [CrossfireCurt/curtbox](https://github.com/CrossfireCurt/curtbox). Open the repo in **GitHub Codespaces** (Code → Codespaces → Create codespace), or clone in VS Code and **Reopen in Container**. The `.devcontainer` setup supplies Node 22, PostgreSQL 16 and a generated local-only admin password; run `bash .devcontainer/start.sh` and open the forwarded private port 5173. Follow [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md). For AI changes, prefer feature branches + PRs + GitHub Actions checks, not replacing source archives.

## Android TV presenter

The optional **Curtbox TV** Android application is in `android-tv/`. It lets Google TV / Android TV and compatible Fire TV devices connect to a host-configured Curtbox server URL, create rooms and display the public presentation. It uses the existing hosted React UI; no game server is bundled in the APK. TV remote D-pad navigation is enabled only inside the TV WebView client. See [`docs/ANDROID_TV.md`](docs/ANDROID_TV.md) for sideloading and build instructions. An [Android TV APK GitHub Actions workflow](https://github.com/CrossfireCurt/curtbox/actions/workflows/android-tv.yml) publishes debug APK artifacts for testing; a version tag also attaches a debug APK. Physical-device QA is still required.

### President / Asshole pile display
The public presentation now shows a **compact, readable card fan** with exposed rank/suit corners, latest-card highlighting, a combined heading (e.g. **CURRENT PILE – PAIRS (2)**), and a bounded **Pile History** sidebar identifying who cleared each pile. These display-only fields are never exposed to player phones. Full details: `docs/games/PRESIDENT_ASSHOLE_SPEC.md`.

### Presentation and audio preferences

Between President / Asshole hands, the public presenter displays a full-screen **Last hand** rankings/statistics view until players start the next hand; the circular table then returns. **Music and sound effects can be muted independently**: Survey Show's host Audio panel has separate toggles and sliders, and President / Asshole's presenter has separate Music and Effects buttons. The phone only controls its own gameplay sound effects; background music never plays on the phone.

The President / Asshole presenter provides separate **Music volume** and **Sound effects volume** sliders (0–100%) alongside independent on/off buttons; player phones have an Effects volume slider. Settings persist on the individual device.

For President / Asshole, the **Settings** button now contains presenter music/effects sliders plus game settings. Music no longer requires downloading optional Ogg files: a locally generated soundtrack plays when media files are unavailable. Between-hand results show only nonzero Clears, 🍻 Socials, ⏭️ skips issued, Passes and 🇺🇸 Presidencies, with each phone displaying only its owner's row. The TV shows the newest two cleared piles in a horizontal history bar below the card table.

President / Asshole phone: all drinks show a large fading 🍻 over your cards, skips show a fading ⏭️, and no notification acknowledgment is required. A Social clear briefly shows the 🍻 overlay over the actual pre-clear pile on the TV before the cards disappear. After a hand, your phone says “You're the <rank>!” with your stats, then “Ready for another hand?” immediately before Ready up; the public presenter still shows everyone's results.
