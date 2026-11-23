# Curtbox

### Install real game music and effects

Curtbox now **bundles 22 distinct, playable Ogg reaction effects** so emotes are audible immediately after a host enables browser audio. These bundled clips are original **synthesized sound designs and locally synthesized spoken reactions**, not field recordings. For production-quality real recordings, the linked CC0 Freesound catalog can replace any clip. Background music and additional licensed jingles still require an optional download:

```sh
npm run audio:fetch     # needs internet + unzip; run before npm run build
npm run build
```

See [`docs/AUDIO_ASSET_SOURCES.md`](docs/AUDIO_ASSET_SOURCES.md) for music sources and [`docs/REACTION_AUDIO_CATALOG.md`](docs/REACTION_AUDIO_CATALOG.md) for replacement recorded emote effects. If music downloading fails, Curtbox still builds with the 22 bundled reaction audio clips. The host must unlock audio with a button or an interaction because browsers can restrict autoplay. An explicit **Enable sound** button appears until audio is unlocked.

### Big-screen lobby

The Host lobby is designed for TVs: eight large player slots in a 4 × 2 layout, an emphasized first-player/controller slot, player-join animation, and an always-visible room QR code and large room code. Empty seats are displayed until players join. The pregame lobby does not show a scoreboard; scores appear during gameplay.


**Curtbox** is a self-hosted, browser-based party-game platform. **Survey Show** is its first game: guess real published survey percentages, predict higher or lower, and compete in the finale. Hosts run the public TV presentation; players use their own phones.

> This is an evolving prototype. The core game logic has been unit tested; full browser/Docker integration still needs to be verified in a networked development environment.

## How to use it

1. Open Curtbox and select **Survey Show** from the game library.
2. Choose **Create new room** to host. Curtbox generates a random four-letter room code and the host configures the game before opening the lobby. Room creation never asks whether the host is also playing.
3. Other devices can open **`http://localhost:3000/room/ABCD`** (substituting the actual room code) directly, or choose **Join existing room** and enter the code. Curtbox checks the room, then asks whether to join as **Host** or **Player**. The Host goes through presentation setup; the Player enters a display name and joins directly. Existing participants with a valid browser session rejoin automatically.
4. The first **player** to join is Primary Controller and starts the game after at least two players join.
5. **Percentage guesses require an explicit Submit button** (both regular turns and Percentage Showdown). Moving the slider only previews a value; it does not submit. Submit can be clicked any time before the deadline and again to revise the confirmed answer. The percentage timer always runs to zero; only Higher/Lower prediction choices can end a phase early. If no Submit occurred, the percentage answer is **NO ANSWER** and earns zero points.
6. After results are revealed, Primary Controller returns everyone to the lobby for another match.


## Direct room links

- **Canonical room URL:** `/room/ABCD` (case-insensitive; always normalized to uppercase). Example: `http://localhost:3000/room/IBUY`.
- Loading a direct room URL skips Curtbox's home/game-selection and room-code entry screens. If the browser already has a saved session for that room, it reconnects with the existing role and session. Otherwise the app verifies room existence using `GET /api/rooms/:code`, shows the room's game and status, and asks for **Host** or **Player**; joining still requires a role and player name when applicable.
- Unknown or expired codes display a **Room unavailable** screen rather than creating a new room or dropping visitors into a different one.
- QR codes now link to `/room/ABCD`. Old `/join/ABCD` links are accepted and normalized to the canonical route.
- A trailing comma copied from prose (such as `/room/IBUY,`) is tolerated and removed from the displayed URL.
- The server already serves its single-page application for unknown non-API paths; make sure a reverse proxy forwards `/room/*`, `/api/*`, and `/socket.io/*` to Curtbox rather than returning its own 404.

## Visual style

- **Curtbox:** minimalist retro-video-game feel with GitHub-like forms and controls.
- **Survey Show:** clean, original, Family Feud–evocative survey board, large readable percentages, simple scoreboard, dramatic timed results without copying third-party artwork or logos.
- **No announcer:** only instrumental music, game effects and reactions. Audio controls are host-local.
- **Survey prompts:** short, direct, and Guesspionage-like rather than “according to a poll” research phrasing; survey publishers and citations remain in the answer reveal.
- **Seed migrations:** unchanged published culture questions receive revised v2 wording automatically on upgrade. Admin-edited/disabled or deleted questions are preserved. Active matches keep their immutable versions.

## Project structure

- `client/src/App.tsx`: Curtbox home, game selection, room creation/join, host setup/display, player controls, admin.
- `client/src/styles.css`: minimalist platform and Survey Show styling.
- `client/src/audio.ts`: local Ogg playback, phase music, synchronized audio cues, reaction queue, and browser-audio unlocking.
- `server/src/core.ts`: room and scoring logic, server-owned phase timers.
- `server/src/index.ts`: Express/Socket.IO, PostgreSQL transaction persistence, admin HTTP endpoints.
- `server/src/seed.ts`, `server/src/cultureSeed.ts`, `server/src/expandedCultureSeed.ts`: **302 curated culture-and-behavior survey percentage questions**, plus 2 finale question sets.
- `server/tests/core.test.ts`: core room/scoring/timeout tests.
- `docs/DECISIONS_AND_IMPLEMENTATION_PLAN.md`: detailed standalone implementation contract for other coding agents.
- `docs/SURVEY_SOURCES.md`: initial and expanded sourced question set information.

## Running locally / in Docker

Requires Node.js 22+, npm, PostgreSQL 16 (Docker includes PostgreSQL).

```sh
npm install
cp .env.example .env
npm run password-hash -- 'a-long-unique-admin-password'
# Put the generated Argon2id hash in ADMIN_PASSWORD_HASH in .env, enclosed in single quotes.
# Set SESSION_SECRET using: openssl rand -hex 32
# Set POSTGRES_PASSWORD to a strong unique password.
docker compose up --build -d
```

The app listens on `http://localhost:3000`. With Nginx Proxy Manager, forward HTTPS and WebSockets to the application. The Compose file binds port 3000 to loopback for a reverse proxy on the same machine. Update the bind address deliberately if the reverse proxy is elsewhere.

**Project directory and fresh database:** The extracted source folder is named `curtbox/`. Docker Compose normally uses that directory name as its project name, so moving from an old `retro-survey-show/` folder normally creates a separate Postgres volume and therefore a **fresh question database**. This is intentional for this package; you confirmed an empty database is acceptable. The previous Compose volume is not automatically deleted. Preserve your `.env` credentials when creating `curtbox/.env` (or generate new valid credentials) before running Docker. If running both old and new Compose projects on the same host, stop the old stack first to avoid competing for port 3000.

```sh
npm run check
npm test
npm run build
```

## Current status / limitations

- Core unit tests can be run with a dependency-free TypeScript transpilation harness; that is **not** a full `npm test`, frontend compilation, PostgreSQL integration or Docker smoke test.
- Dependency installation was unavailable from this authoring environment's npm registry. Run the build/test commands above in your networked development environment.
- The current catalog contains Survey Show only; the architecture is meant to support additional games.
- GitHub-like admin question **forms** are planned; current `/admin` question editor is JSON-based, authenticated and versioned.
- Packaged 22 original synthesized reaction effects are playable immediately; replacing these with well-auditioned CC0 recordings and adding richer original artwork remain future quality improvements.
- The code has not undergone a production security audit. Use HTTPS, strong secrets and private admin access.

## 2026-11 content + build corrections

- Added `server/src/expandedCultureSeed.ts`, with 130 additional culture/human-behavior percentage prompts drawn from YouGov primary-publisher reports. Combined seed: **302 percentage questions + 2 existing finale question sets**.
- Fixed React's `useRef` declaration in `client/src/App.tsx` to provide an explicit `undefined` initial value, addressing `TS2554` in the user's Docker frontend build.
- Source archive now extracts to **`curtbox/`**, not `retro-survey-show/`. A fresh Compose project/database is expected.
- The included seed question text and URLs were validated for structure. Several reports were independently spot-checked on their primary publishers' websites. **A complete line-by-line editorial fact audit of all 302 answers has not been performed**; source metadata is available for follow-up verification.
- A complete Docker build was not possible in the authoring environment because package registry access timed out; run `npm run build` or `docker compose up --build -d` in your own environment.

## Direct-link regression tests

Run `node --experimental-strip-types --test client/tests/room-route.test.mjs` on Node.js 22+ to test URL parsing and normalization without starting a database.

## Minimal player controller (2026-11-20 revision)

- The **Player** view deliberately does not repeat the game title, room code, display name, points, player roster, or results leaderboard. Those are presented on the Host screen. A small Leave control is the only persistent header action.
- In the lobby, choose an avatar. The room's first Player (Primary Controller) has a **Start game** button, disabled/greyed out until at least two Players are present; no “Need at least 2 players” helper text or player count appears on the Player screen. The Host lobby presents the player count and minimum-player message.
- During gameplay, Player screens show only the relevant personal inputs and context/reactions. At match end, Player screens defer leaderboard/highlights to the Host presentation while retaining Primary Controller's Skip Reveal and Return to Lobby controls.
- This is a **client-only presentation change**; no database reset or server migration is required.

### Curated reaction sound effects (22)

For non-generic emote sounds (e.g., real crickets, sad cornet, buzzer, goat bleat, record scratch, burp, and explicit Adults Only spoken reactions), see [docs/REACTION_AUDIO_CATALOG.md](docs/REACTION_AUDIO_CATALOG.md). Each emote is mapped to an individually sourced CC0 Freesound recording. Download the original recordings under `assets/reaction-raw/` using the stable reaction IDs as filenames, install ffmpeg if needed (`brew install ffmpeg` on macOS), then run:

```sh
npm run audio:reactions -- --check  # optional: check which source recordings are present
npm run audio:reactions
npm run build
docker compose up --build -d
```

The archive **includes 22 original synthesized Ogg files** (not the third-party Freesound recordings); they are ready to play without running either download command. `audio:fetch` installs optional music and jingles without overwriting existing reaction assets; `audio:reactions` installs the individually downloaded, license-checked *real* Freesound clips over the synthesized stand-ins. Third-party original recordings still require manual downloading and listening. The original catalog contains their sources and licensing notes. A reproducible fallback audio generator is in `scripts/generate-reaction-fallbacks.py` (Python with numpy/scipy, ffmpeg and espeak), but running it is not required to play Curtbox.

### Survey Show reveal and timing (current)

- **Picking or dragging a percentage is only a live preview, not a submission.**
  The active player uses an explicit **Submit** button to record the current value.
  They can adjust the slider and **Submit again** until the countdown expires.
  No percentage phase ends early, even after a submission. At the deadline, the
  most recently **submitted** value counts, or **NO ANSWER** if there was no Submit
  (even if the slider was moved). The Percentage Showdown finale uses the same
  behavior. Other finale modes retain partial selections and their full timers.
- **Higher/Lower predictions are different:** other players choose a direction,
  and the phase ends immediately if every eligible predictor has chosen one.
  Otherwise it ends when its own timer expires.
- **Presenter answer reveals are visual and sequential:** show the actual result first, then the original percentage-picker’s answer against the real answer on an animated 0–100% percentage scale. The first player’s points are calculated and shown after their comparison. Next, show **each other player’s Higher/Lower prediction one at a time, from left to right** in the reveal order, highlighting the winning region of the same ruler and explaining the points earned. The ruler indicates accuracy bands (exact 3,000; 10 away 2,000; 20 away 1,000; 30+ away 0) or directional payout thresholds (Higher/Lower 1,000, Much Higher/Lower 2,000 with 15+ point change). Every participant has a displayed server-generated breakdown and formula; no arithmetic guessed by the browser. **Total scores do not change during these steps.** Only after the last reveal does the server atomically commit points and animate the scoreboard counters. For the Percentage Showdown finale, use the same percentage ruler and show the closest bonus. For Top 3/Rank finales, show the survey’s actual ordered answers and a per-player score breakdown.
- Each reveal step and scoring deadline is stored with the room in PostgreSQL;
  every connected presenter sees the same step, reconnects can catch up, and
  point commits happen only once. Reveal phases are not player-skippable.

