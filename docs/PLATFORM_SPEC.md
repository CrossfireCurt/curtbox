# Curtbox — platform specification and design decisions

**Status:** Consolidated November 23, 2026. Covers the shared platform, not the rules of any individual game. See `games/SURVEY_SHOW_SPEC.md` and `games/PRESIDENT_ASSHOLE_SPEC.md`.

## 1. Product and identity

Curtbox is a **self-hosted, browser-based party-game platform**. The home page is a game catalog. Each game uses the common room, identity and presentation system but owns its rules, gameplay state and private/public views. Currently implemented catalog entries:

- **Survey Show** — original percentage/survey party game with regular rounds and three possible finales.
- **President / Asshole** — rising/falling ranks card game with Presidential Decrees and optional adult-oriented drinking rules.

Visual identity: original, understated retro-video-game language; restrained geometric/pixel motifs; GitHub-like dark-neutral controls, explicit labels, 1px borders, calm spacing, visible focus, mobile accessibility. Each game may have a distinct presentation. Survey Show should evoke the *general visual feel* of a television survey contest, not copy a commercial show's trademarks, typography, graphics or sound. President / Asshole should evoke a card table, with distinct public pile and private hands.

No AI commentary, voice synthesis, voice selection, AI announcer, speech pipeline or agent memory. Core gameplay has no cloud or AI dependencies. Optional audio must be original or correctly licensed with provenance, with no browser autoplay assumption.

## 2. Game selection and room flow

1. Visitor selects a game tile.
2. Visitor selects **Create new room** (Host action) or **Join existing room**.
3. Creator receives a generated **unique random case-insensitive four-letter code**, not a manual code input. Creator is automatically a **Host**.
4. Creator configures game-specific settings in Host setup and opens the lobby.
5. Joiners enter a code or follow `/room/ABCD` from a QR. Only after the room is resolved do they choose **Player** or **Host**. A Player enters a persistent personal name; Hosts receive a generated `Host N` name.
6. No Audience role on prejoin and **no combined Host+Player role**. Hosting and playing require separate browser sessions/devices.
7. Direct `/room/ABCD` routes validate existence via `GET /api/rooms/:code`; invalid/expired links show a non-destructive unavailable view. `/join/ABCD` legacy routes redirect to canonical paths.

Roles are immutable for each participant token. Reconnecting with the same token restores the same identity and role. Display names must be unique case-insensitively and duplicate names auto-suffix `2`, `3`, etc. Names are fixed for that participant's room lifetime. A fully departed/rejoined player is a fresh participant record.

## 3. Host vs Player screens

**Host/presenter** sees the TV public lobby, QR join code, public state, game timers, pile/result/reveal animations, scoreboard and shared reactions. The Host **does not** receive private cards, survey draft answers, player-only controls or hidden content.

**Player** sees a focused mobile UI: just their private card hand or survey inputs, allowed actions, notices and local state needed to play. It **does not replicate the large TV presentation**. President / Asshole in particular displays the physical pile on the Host only; a Player can use Play, Pass, Social when valid, ready-up, exchanges, decree/vote actions and acknowledgments.

Host settings belong to the **original creator** and should not transfer automatically. Multiple host displays may connect (currently eight presentation slots), with creator priority and FIFO guest-host requests. Guest hosts configure browser-local audio, never the creator's game rules.

## 4. Controllers and lifecycle

The first registered Player, not the creating Host, is initially **Primary Controller**. It owns game-specific control actions (e.g. Survey Show Start/Cancel/Skip/Return; President / Asshole special End Game when fewer than four remain). Survey Show restores controller ownership to the next eligible connected Player after 30 seconds offline. President / Asshole aims for President → highest-ranked remaining → longest-connected remaining succession, respecting configurable reconnection grace.

Rooms are game-specific. Starting a different game requires a new room/code. The room remains usable across Survey Show matches or President / Asshole hands. Late-joining Players do not enter the current Survey Show match or President / Asshole hand and become eligible for later play.

Player caps: eight for both. Minima: **Survey Show 2**, **President / Asshole 4** at the beginning of a hand. An already active President / Asshole hand may continue with fewer. Every active player must ready up between President / Asshole hands; there is **no pre-hand countdown** after the last player readies.

Room expiry: after approximately 15 minutes with everyone disconnected; creator leaving closes the room immediately. Reconnection uses a browser session token; network disconnect is not an explicit departure. Explicit Leave is immediate. Do not delete score history merely because a participant departs.

## 5. Reactions and avatars

There are 20 emoji avatar placeholders and 22 predefined reaction types (family, standard and adult ratings). A Player reserves a unique avatar during the Survey Show lobby; others cannot select it. Reactions come from Player devices and appear on Host displays with attribution and an optional associated audio effect. Per-player cooldown is three seconds, enforced by the server. Player browser may store four favorite reaction choices based on usage. Some emoji/art assets remain placeholders and should be replaced with original artwork as a separate design pass.

Player-facing content ratings for Survey Show: Family-Friendly, Standard (default), Adults Only. Higher ratings include lower-rated content; do not display adult-labeled reactions in family rooms. President / Asshole has its own family-friendly President and drinking-enabled Asshole modes, with separate host rules. Do not use the Survey Show question rating as an implicit President / Asshole game mode.

## 6. Architecture and persistence

- **Frontend:** React 19, TypeScript, Vite.
- **Backend:** Node 22, TypeScript, Express, Socket.IO.
- **Database:** PostgreSQL 16; entire room stored in `rooms(code TEXT PRIMARY KEY, data JSONB, updated_at)`. Survey questions use immutable `questions(id,version,status,data JSONB)` versions and `seed_registry` to avoid re-seeding deleted content.
- **Hosting:** Docker Compose, self-hosted; reverse proxy terminates HTTPS with WebSocket upgrades (e.g., Nginx Proxy Manager).
- **Scale target:** Initially one application instance, ~1–10 concurrent rooms, not a cluster. No Redis/Kubernetes required for initial build.

Transport: create/join rooms and send intent via Socket.IO. The server checks the authenticated participant associated with the socket, runs a serialized `SELECT ... FOR UPDATE` room transaction, saves state, commits, and broadcasts per-socket **personalized** `room:view` snapshots. Deadlines are absolute Unix epoch milliseconds from the server. The client clock is a display aid only. Reboots must restore persisted rooms and progress elapsed deadlines.

Never send a Player's private hand to another Player or Host. Do not send unrevealed Survey Show answer data to clients. Avoid client-side score, timer or decree authority. Duplicate and raced events must be handled transactionally or rejected.

## 7. Admin, security and deployment

Single administrator login uses Argon2id password hash, signed HttpOnly SameSite session cookie, CSRF protection for admin writes, login rate limiting, secure transport and no frontend admin secret. Admin can create/edit/publish/disable/delete survey questions in versioned storage. Admin content edits must never mutate existing in-progress matches.

Configure `.env` from `.env.example` (Postgres credentials, SESSION_SECRET, ADMIN_PASSWORD_HASH); Docker Compose uses loopback port 3000 by default. Avoid exposing an unaudited development build to the public Internet. A production security/accessibility review remains outstanding.

## 8. Design principles and regression constraints

- Preserve already finalized gameplay behavior when changing shared code.
- No need for a separate Player view inside the Host page: the apps are deliberately distinct.
- Minimize decorations on phone controls. Prioritize meaningful touch targets, visible turn/phase state, accessibility, and responsive card handling.
- Prefer an original, extensible multi-game architecture over cloning a copyrighted game's expression.
- Document any divergence between specification and code; do not silently fill in an unverified historical decision.

## Computer-controlled player architecture (President / Asshole)

Bot seats are **game-level virtual participants**, not authenticated platform `Participant` records. Room creator configures count for President / Asshole; host and player session identity, presentation authority, reconnect credentials, and Survey Show must remain unchanged. Bot seat IDs, public names, scheduling keys and action timestamps live in the persisted President / Asshole state. The global human player-cap check accounts for configured bot seats. Bot state participates in authoritative game actions, snapshots and scores but never in controller succession, reconnect, connected-device counts, room lifetime, host permissions, or real participant token issuance.

This release does **not** add bots to Survey Show. Future games may adopt a similar virtual-player pattern only after game-specific design. Do not automatically grant controller/host privileges to bots. Keep bot hand contents private as for ordinary Player seats.


## GitHub CI/CD and production Docker image delivery (added 2026-11-23)

Curtbox is intended to be source-controlled on GitHub and built by GitHub Actions. `.github/workflows/ci.yml` validates pushes/PRs and publishes `ghcr.io/<owner>/<repo>:main` after successful main-branch checks. `.github/workflows/release.yml` validates tags `vX.Y.Z`, packages compiled frontend/server assets plus `SHA256SUMS.txt`, creates a GitHub Release and publishes versioned GHCR images; stable releases also publish `:latest`. The image is currently linux/amd64 only. This CI/CD configuration exists in source but GitHub workflows have not yet been run.

Production deployments select `CURTBOX_IMAGE=ghcr.io/<owner>/<repo>:vX.Y.Z` in `.env` and use `compose.ghcr.yml` plus `scripts/update-from-ghcr.sh` to pull and recreate the app rather than building locally. The PostgreSQL `party_db` volume must persist across upgrades. Retain the same Compose project name, database credentials and session secret. Do not perform `down -v`. For full commands, package security and operator steps, see `GITHUB_RELEASE_AND_DOCKER.md`.


## Presenter disconnect indicators (implemented on feature branch Nov 23, 2026)

The server already exposes an authoritative `online` boolean in public Survey Show participant records and President / Asshole `PAPublic.seats`. The shared `client/src/ConnectionName.tsx` renders a **Wi-Fi off** warning beside disconnected human player names throughout both **public Host presentations**. Bots are explicitly excluded. Warning is visible on TV and exposed by the accessible label "Disconnected". Reconnection removes the icon on the next server broadcast; departure/seat removal follows existing game rules. No timers or state changes are introduced on the client. Test reconnect and multiple-device disconnects using live Socket.IO before production deployment.
