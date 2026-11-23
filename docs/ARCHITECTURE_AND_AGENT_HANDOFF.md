# Curtbox — engineering architecture, implementation inventory and agent handoff

**Revised November 23, 2026.** This is the practical companion to `PLATFORM_SPEC.md` and the two game specs in `games/`. It describes the modified source archive as delivered, not a hypothetical future architecture.

## 1. What is shipped in this source package

Curtbox has two independently selectable games in one React + Socket.IO/Express + PostgreSQL application:

**Survey Show:** existing mature prototype, staged guessing, predictions, three finales, score/reveal sequencing, source-backed question bank, admin console, reactions/audio and room-based Host/Player separation. It has not been rewritten; existing core game code is preserved.

**President / Asshole:** new separate game module and UI, lobby and automatic all-ready deal, 52-card distribution, ranking and succession, turn-based single/pair/triple/four-of-a-kind plays, existing 2/equal/four-kind/Double Trouble clearing logic (ordinary equal-rank clearing is superseded by the approved skip rule, issue #3), optional Social, explicit pass and automatic timeout action, Card Exchange levels, Presidential Decrees, Democracy vote, Term Limits exact-hand expiration, drinking notices, host room settings, per-socket private hands, public card-table presentation, cumulative Presidency/streak scoring, joins/leaves and configurable grace. This is an **integrated first development pass**, not a production-certified or browser-tested release.

**Status summary:** 30 President / Asshole and 15 Survey Show pure-engine tests, plus 20 client static/route checks, passed using the dependency-light runner (65 total). Production `npm install`, `npm run check`, `npm test` with tsx, `npm run build`, Docker/Postgres startup and multi-device browser E2E **could not be completed in this authoring environment because the npm dependency installation was unavailable**. Do not claim those steps passed.

**Post-release corrective revision (November 23, 2026):** A user-run `npm run build` caught TS18048 in `client/src/PresidentAsshole.tsx` vote presentation. The Democracy UI now captures an immutable `vote` variable and uses that reference in the mapped buttons. The optional Kenney audio downloader previously treated HTTP-200 HTML as a successful archive request; archive validation and mirror retries now live in `scripts/audio-archive.mjs`. Three network-free regression tests cover this. The standalone end-to-end production build remains unverified in this environment, which cannot reach npm. See `docs/BUILD_TROUBLESHOOTING.md`.

## 2. File map

```
curtbox/
  AGENTS.md                    # read-first coding-agent directions
  README.md                    # installation, status, links to docs
  shared/types.ts              # shared Curtbox and Survey Show types; RoomState now contains pa/paSettings
  shared/president.ts          # President / Asshole contract, settings, decree keys, public snapshots
  server/src/index.ts          # Express/Socket.IO, transactional DB, room routes, event authorization, timers
  server/src/core.ts           # Survey Show rules/rooms, its personalized view and status machine
  server/src/president.ts      # President / Asshole authoritative pure-ish state machine
  server/src/seed.ts           # Survey Show published seed questions
  server/src/cultureSeed.ts
  server/src/expandedCultureSeed.ts
  server/tests/core.test.ts    # existing Survey Show tests
  server/tests/president.test.ts # 18 new President / Asshole tests
  client/src/App.tsx           # common catalog/role/room flow; routes to game-specific presentations
  client/src/PresidentAsshole.tsx # new Host/Player game interface and host rule editor
  client/src/styles.css        # existing styles plus new pa-* styling
  client/src/audio.ts          # Survey Show phase soundtrack + reaction playback
  scripts/fetch-audio.mjs      # Optional downloader; mirrors checked for valid ZIP
  scripts/audio-archive.mjs    # Download verification/retry helper
  scripts/test-audio-archive.mjs # Network-free audio regression tests
  docs/BUILD_TROUBLESHOOTING.md
  docs/PLATFORM_SPEC.md
  docs/games/SURVEY_SHOW_SPEC.md
  docs/games/PRESIDENT_ASSHOLE_SPEC.md
  docs/ARCHITECTURE_AND_AGENT_HANDOFF.md
  docs/DECISION_LOG.md
  docs/archive/DECISIONS_AND_IMPLEMENTATION_PLAN_2026-11-20.md
```

## 3. Platform state and transactions

`RoomState` in `shared/types.ts` includes a game discriminator `gameId: 'survey-show' | 'president-asshole'`, shared `status`, settings/participants/controller, optional Survey Show `game`, and optional President / Asshole `paSettings` and `pa`. The complete room is stored in Postgres as JSONB and updated in a **serializable-by-row-lock** transaction:

1. Client sends Socket.IO intent with acknowledgment callback.
2. `server/src/index.ts` identifies participant from `socket.data.roomCode` and `socket.data.participantId` (never trust a client-provided participant ID).
3. `mutate(code, fn)` obtains `SELECT data FROM rooms WHERE code=$1 FOR UPDATE` inside `BEGIN`.
4. Module rules validate stage, role, turn, deadline, cards or proposals. Transition mutates room state only if action is valid; otherwise transaction rolls back.
5. Server updates JSONB, commits, then calls `syncRoom(code)`.
6. Server builds **individual** `room:view` for every socket: `makeView(room, me)` for Survey Show/base, supplemented by `publicPA(room, me)` for President / Asshole.

**Warning:** Never serialize `room.pa` directly to any client: it includes **every Player's hand**, original card-exchange allocations, full votes and other private data. `publicPA` excludes hidden hands and the pile from Player views and excludes all private hand cards from Host views. Expand the privacy tests whenever adding fields.

For Survey Show, `makeView` reveals guesses, predictions, actual/source only during designated phases. Scores commit after reveals, not during them.

## 4. Socket.IO API

Shared:

- `room:create` payload `{gameId: 'survey-show'|'president-asshole'}`; role must be Host; generated room code, token, id in acknowledgment.
- `room:join` payload `{code, role, name?, token?}`; reconnect is automatic if token matches.
- `room:openLobby` — creating Host only.
- `room:requestPresentation` — queue guest Host display.
- `room:avatar` — Player avatar selection (Survey Show lobby).
- `room:leave` — immediate departure; creating Host closes the room.
- `room:react` — validated and rate-limited reaction.
- `room:view` — server emission of personalized snapshot; `room:closed` — room closed/expired.
- `GET /api/rooms/:code` — room game/status/player count used by direct link flow.

Survey Show-specific:

- `room:settings` — rating, pace, finale, creator only and before match.
- `room:start`, `room:cancel` — 15-second countdown controlled by Primary Controller.
- `game:guess` — percentage slider preview only.
- `game:guessSubmit` — explicit revisable valid percentage guess.
- `game:predict` — one-tap prediction.
- `game:finale` — ordered/selected finale choices/preview.
- `game:finaleSubmit` — explicit percentage submission for Showdown.
- `game:skip` and `game:lobby` — Controller-only reveal skip / return.

President / Asshole-specific:

- `president:settings` — creator setup only; partial `PASettings`.
- `president:ready` — `{ready:boolean}` Player ready/unready.
- `president:play` — `{cards: PACard[], social?: boolean}`; server checks ownership, rank count, turn and Social window.
- `president:pass` — current Player; automatic timeout pass runs on server, not through this event.
- `president:exchange` — `{cards:PACard[]}` by higher-ranked partner, from original dealt hand only.
- `president:decree` — `{action:PADecreeAction}`, or `{nominees:PADecreeAction[]}`, or `{}` to skip.
- `president:vote` — `{index:number}` vote or President tie-break.
- `president:ack` — dismiss local drinking prompt.
- `president:end` — Primary Controller ends table between hands if fewer than four active Players remain.

All actions return an acknowledgment `{ok:boolean,error?:string,...}`; ignore client-authoritative clocks. The browser uses its estimated server offset only to display remaining time.

## 5. President / Asshole state machine (details)

`PAState` lives in `RoomState.pa`:

| Stage | Entered by | Valid actions | Exit |
|---|---|---|---|
| `ready` | room initialized, or hand/decree finished | Players toggle ready; optional Controller End Game | >=4 joined online and all ready, then pre-hand expirations/deal |
| `exchange` | a new hand with ranked exchange obligations | ranked upper returns original cards | all responses or timeout fallback |
| `play` | deal/exchange completed | legal Play, Pass, eligible Social; automatic lead/pass | all but one rank determined |
| `decree` | winning President's consecutive streak reached threshold | enact/repeal/modification, Democracy proposals, Skip | one decision, timeout, or President forfeiture |
| `vote` | Democracy multi-option proposal | each eligible Player votes; President resolves ties | winner enacted or tied winner randomly resolved if President gone/timeout |
| `ended` | Controller chooses End Game below four | no game actions | create another room |

`PAState.handNumber` counts fully dealt hands; `PADecree.expiresBefore` denotes the first hand for which the decree **is inactive**. After hand 5, a 3-round decree starting hand 6 gets `expiresBefore=9`. `beginHand` calls `processExpiration` **before dealing**. Term Limits repeal or self-expiration does not clear any other decree's `expiresBefore` field.

**Card strings:** `4C` = four of clubs, `10H` = ten of hearts, `AS` = ace of spades. `RANKS=['3','4','5','6','7','8','9','10','J','Q','K','A','2']` and suits `[C,D,H,S]`. Suits have no ranking. `hands` is `Record<id, PACard[]>`. `pile` is public only to Hosts; `lastPlay` tracks the most recent successful card group for Play/Pass/Social; `finished` records first-to-last finishing order; `active` represents hand participants even if some have finished. `serial` and `lastClear` support clear cues and collision ordering. `decrees` is a keyed array with optional level/value and expiration. `vote` holds chosen nominees and private votes. `drinking[id]` stores local pending notices.

**Timers:** server tick scans persisted rooms and advances due action deadlines; it also handles disconnected grace expiration. Room snapshots, not React timers, own transitions. Test delayed ticks and process restarts to avoid skipped phases, duplicate decrees or score increments.

## 6. Design and code decisions not to undo

- Survey Show and President / Asshole have separate gameplay components and state, with only shared room identity, persistence, catalog and transport. A future refactor can extract a formal game plugin interface; **don't** intermingle rules in one game core.
- Pile exists exclusively on public Host display for President / Asshole. Player gets private hand and optional Social selection requirement, not actual pile arrays.
- No host+player combined role, no Player interface with full TV stage, no AI voice features.
- Card Exchange counts one decree slot, never two; levels advance only one notch.
- Existing Term Limits expiry assignments continue after Term Limits itself ends; future decrees permanent unless re-enacted.
- Democracy never makes more than one change per opportunity.
- Lowering Max Active Decrees never forces immediate repeals.
- Explicit Submit governs Survey Show percentage submissions and full-timer progression; stale older handoff says otherwise.

## 7. Running and verification

Requires Node.js 22+, npm, PostgreSQL 16. `.env.example` defines required env variables. Production setup example:

```bash
npm install
cp .env.example .env
npm run password-hash -- 'YOUR-UNIQUE-ADMIN-PASSWORD'
# Set ADMIN_PASSWORD_HASH, SESSION_SECRET (openssl rand -hex 32), POSTGRES_PASSWORD in .env
npm run check
npm test
npm run build
docker compose up --build -d
```

**2026-11-23 authoring run:** `npm install` did not complete due inaccessible dependency registry; `npm test` failed immediately because `tsx` was unavailable; `npm run check` failed immediately because `@types/node` wasn't in the local project. These are dependency-environment failures, not evidence that compilation succeeded. The engine-only isolated type-check against a globally available `@types/node` passed. TypeScript transpilation syntax checks on the new server/frontend modules were clean. Eighteen President / Asshole and fifteen Survey Show pure-engine tests plus twenty client static checks passed after TypeScript→JS transpilation using a globally installed TypeScript module; client static/route tests were run under Node with `--experimental-strip-types`. Run `npm run test:pure` to reproduce all **53** dependency-light checks. This is **not a complete build or end-to-end test**.

### Reproduce available local tests

```sh
npm run test:pure                # 15 Survey Show + 30 President / Asshole + 20 client checks (65)
npm run test:president:pure      # 30 President / Asshole rules-only checks
```

These do not start a browser, Socket.IO server or Postgres. Full `npm test`, `npm run check`, `npm run build`, and Docker integration remain necessary.

### Essential browser/Postgres acceptance path

1. Start a fresh room for **Survey Show**; ensure current explicit percentage Submit/full timer and all regular/finale scoring still work. Test reconnect and QR, separate host/player, reactions and admin.
2. Create a **President / Asshole** room; from four phone/browser sessions join the generated code, use Host rule settings, open lobby, ready each. Confirm exactly 52 unique cards assigned privately and host can see no private cards. Confirm first hand 4♣ mandatory.
3. Play singles/pairs/triples/four-kind, 2, same-rank, passes, clear ownership and next lead. Test out-of-turn Social concurrently from two browser sessions, and confirm only one succeeds transactionally.
4. Complete hand, verify President/VP/Secretary/Janitor or Asshole roles, scores, streak and readiness for next hand. Enable L1/L2 Card Exchange, verify two-way swaps and fallback when timer expires; ensure neither upper partner can return newly received lower's cards.
5. Earn decree opportunity by consecutive presidencies. Turn on Reverse Deal/Reverse Play and demonstrate independence. Enact Democracy; test tie resolution, abstention, President departure. Set Max Active below active count; verify no forced repeal and no new additions.
6. Enact Term Limits with N=3 after hand 5, verify active through hands 6/7/8 and expired before hand 9. Repeal Term Limits before that boundary; verify existing other countdowns still run, while new decrees have no expiry. Test self-expiration enabled and disabled.
7. Set Asshole mode; verify manual Pass = Drink, automatic timeout pass does not drink, 2 = Drink one prompt per other active Player, Require Acknowledgment blocks affected only, timeout doesn't pause the table.
8. Join a new Player midhand, leave/reconnect, grace-expire one Player, test 3-Player remainder and 4-Player minimum for the next deal. End Game with Primary when under four.
9. Restart Docker/Node during `exchange`, `play`, `decree` and `vote` deadlines; confirm persisted state and deterministic resumed actions. Test multiple presenters and client reconnection.

## 8. Technical debt / review checklist

**Must address before production:**

- Run complete TypeScript checks and fix compile errors in real dependency environment.
- Run real Socket.IO/Postgres multi-client browser E2E. Tests currently cover the pure PA engine, not transaction integration or React controls.
- Add detailed duplicate-event/idempotency, simultaneous Social (transaction order), late vote, timeout, disconnect, startup catch-up and deck conservation tests.
- Review room authorization boundaries: ensure Survey Show-specific actions cannot be called on President / Asshole rooms and vice versa; validate game IDs everywhere.
- Add transactional tests for `room:join`, reconnect token handling, participant removal and controller succession; explicit migrations may eventually replace JSONB prototype.
- Accessibility: keyboard/touch card selection, screen-reader labeling, focus management, color contrast, turn/clear animation with reduced motion, narrow devices and font scaling.
- Improve TV card pile presentation: stronger clear animations, rank captions, clearly highlighted winner, more persistent join QR in lobby, clear reveal of finishing order, leaderboard shared placement rendering.
- Build robust utility for pauses/deadlines under reconnection, with host-configurable timers and safe server restart catch-up.
- Clarify the fate of historically proposed additional decrees (Dictatorship / Executive Order / Presidential Authority / Ranked Authority / Board Meeting) with original finalized decisions before implementing them.
- Survey Show production security, licensing/provenance, realistic browser media permissions and full question audit remain unfinished.

**Do not silently invent remaining decisions:** If the code differs from the specs in `games/`, record the mismatch, add a test, then fix. If the historical rule is missing or ambiguous, label it `Needs verification` and avoid implementing unreviewed decrees.

## November 23 follow-up: President / Asshole bots (integrated, testing caveats)

Implementation entry points:

- `shared/president.ts`: `PASettings.botCount` (0–7), `PABot`, `PAState.bots`, `botActionKey`, `botActionAt`, `PAPublic.seats[].bot`.
- `server/src/president.ts`: `configurePA` adds/removes stable virtual bots; `current()` merges human room Participants with virtual bot descriptors; `maybeStart` requires ≥4 seats including ≥1 human and waits only for human readiness. `botTask`, `botDuePA`, `botPlay`, `botDecreeChoices`, and `advancePA` run bot turns, Social, votes, tie breaks and decrees through the same public game rules.
- `server/src/core.ts`: rejects new human join if human+bot cap of 8 would be exceeded, excludes collisions with bot display names.
- `server/src/index.ts`: room info reports combined counts; 350ms server tick schedules and advances bot actions inside serialized Postgres room transactions.
- `client/src/PresidentAsshole.tsx`: host `botCount` setting, public `BOT` label, automatic-ready explanation.
- `server/tests/president.test.ts`: engine tests for bot seats, full hand, controller exclusion, gameplay, exchanges, Social and voting.

State ownership / security: bots are persisted virtual seats only, **not Socket.IO clients and not `room.participants`**. Never let a bot hold a token, creator role, presentation authority, Primary Controller role, or drinking acknowledgment gate. Public views must not disclose bot private hands. Room lifetime is driven by real connected participants; bots should not keep an abandoned room online. If bot difficulty or personalization is added, use an explicit, host-controlled setting and preserve the pure rules engine.

**Validation limitations:** Complete build (`npm run check`, `npm run build`) and Docker/Postgres/real phone-browser E2E remain unverified here because dependencies are not installed and npm registry is unavailable. Dependency-light engine and static checks are green. A previous TS18048 issue was fixed separately; do not assume absence of additional full-build errors. Test a 1-human+3-bot room, 4 humans + 4 bots, a full multi-hand session, a bot President, a bot with mandatory exchange, room restart during a bot turn, and human leave/reconnect during active play.

**Queued user requests:** 1) GitHub CI/release/GHCR and Docker pull/update configuration is now added in source, though remote GitHub and Docker testing remain; 2) collaborative ongoing iteration using Virtual Code or equivalent to avoid repeated ZIP rebuilds; 3) Android TV host/presenter APK with configurable Curtbox server URL; 4) disconnected-player icon in public presenter views on every game, absent for bots. Do not claim (2)–(4) have been implemented.


## GitHub Actions, release and GHCR Docker rollout (source added 2026-11-23)

- `.github/workflows/ci.yml`: Node 22 checks on pushes/PRs; built-app workflow artifact; successful `main` publishes an amd64 GHCR image tagged `:main`.
- `.github/workflows/release.yml`: release tag `vX.Y.Z` tests/builds again, packages `curtbox-vX.Y.Z-app.tar.gz` + SHA256SUMS, pushes `:vX.Y.Z` (and `:latest` on stable tags), then creates a GitHub Release. No automatic version bump.
- `scripts/package-release.sh`: bundle compiled Node/React app with docs, manifests and checksums without secrets. `Dockerfile` uses `npm ci` if a lockfile exists.
- `compose.ghcr.yml` / `scripts/update-from-ghcr.sh`: replaces local Docker `build` with registry `image`, reuses the original app/db service names and `party_db` volume; `CURTBOX_IMAGE` is provided in the deployment machine's `.env`.
- `docs/GITHUB_RELEASE_AND_DOCKER.md`: complete one-time `gh repo create`, publishing, private package authentication, version tagging, database backup, upgrade/rollback.

**Important verification gap:** GitHub Actions and Docker have not been exercised against GitHub or GHCR. The original source had no `package-lock.json` and npm registry remains inaccessible locally. User must generate+commit `package-lock.json` on a networked machine. Validate a pushed main image, a release image, the bundled tarball and a real Compose deployment before relying on the distribution. Pinned SHA actions may be adopted later for stricter supply chain security. Current published image target is linux/amd64.

**Remaining user's queued work (not part of this batch):** collaborative Virtual Code workflow, Android TV host APK, presenter disconnect warning icon on both games (not for bots).

## Connected GitHub development handoff (2026-11-23)

The repository is hosted at `https://github.com/CrossfireCurt/curtbox`. GitHub Actions passed on `main` with a published `:main` image; older sections written before the first push are retained as historical context. New `.devcontainer/` configuration enables repeatable Node 22 + PostgreSQL 16 development from Codespaces or local VS Code. Read `docs/DEVELOPMENT_WORKFLOW.md` and `docs/ROADMAP.md` first. The next feature is Android TV (#1), followed by disconnect indicators (#2) and tracked card-game UI/behavior corrections (#3–#8). **No new runtime game rules are implemented in this workflow-only change.** Ordinary equal-rank clearing in current code must change to a skip, with Social still clearing (issue #3).


## Incoming presenter/phone UX queue — Nov 23, 2026

Issue details and acceptance criteria are linked in `docs/ROADMAP.md`: #11 separate card/turn-start/ticking/skip audio, #12 turn countdown in the active public seat, #13 pile combination label, #14 preserve preselected cards when turn ownership changes. Existing #6 covers only allowing same-rank cards in Play/Social selections; exchange returns may mix ranks. These tasks are pending and must not be conflated with past functionality. Source audit: `client/src/PresidentAsshole.tsx` resets selected cards by watching `game.currentPlayerId` and has a header turn clock but no in-seat one; `client/src/audio.ts` handles other game's Host-centric cues. Keep effects scoped to the correct participant and dedupe across `room:view` broadcasts/reconnects.


## Connection status presentation change (issue #2)
The public presenter surfaces now render a shared `ConnectionName` component based on `RoomView.participants[].online` (Survey Show) and `PAPublic.seats[].online` (President / Asshole). Virtual bots explicitly never receive a warning. This is UI-only; server disconnect/grace/reconnect state is unchanged. Regression tests: `client/tests/connection-indicators.test.mjs`. Test physical TV presentation and live reconnect flows before production.

## Equal-rank skip implementation (issue #3)

Ordinary same-rank/same-size legal plays **retain the pile** and skip exactly one next active seat in the current play direction. The new `PAState.lastSkip = {by,skipped,at,serial}` event is persisted and sent via `PAPublic.lastSkip` to presenter/affected phone; UI shows a short **Skipped** animation without exposing private cards. Completed Social and independent special clears retain prior clear behavior. Skip events reset on a fresh hand. Server tests exercise reverse direction, chained skips, finished players, Social and special clears. Client static checks cover both surfaces and reduced-motion CSS. Run `npm test && npm run test:pure && npm run build` before merging; manual multiplayer QA is separate. Issue #11 will add an audible skip cue later.

## Pile visibility and history (#4, #5, #13)
The President / Asshole server records each accepted play as `PAPilePlay` in `g.pilePlays` (chronological). Clearing archives the entire pile as `PAClearedPile` (cards, plays, clearer, reason, serial, timestamp); keep only the newest eight records in `g.pileHistory`. A terminating hand also archives any residual live pile. Both arrays reset per hand. The public host gets `pilePlays` and `pileHistory`, but players get neither. Old rooms without `pilePlays` use the latest `lastPlay` to recover a displayable latest combo. Presenter `PresidentAsshole.tsx` renders unstacked cards in play groups, latest on the left, and a sidebar "Player cleared" history. The pile type label comes from the latest play group, not `g.pile.length`. See engine and static tests; test 1080p/long piles manually.

## Waiting-to-play selection UX (#6, #14)
The pure `client/src/presidentSelection.ts` helper switches a Play/Social selection to a new rank when tapped, avoiding multi-rank submission; it permits mixed-rank exchange returns. The component calls `availableCardSelection` before rendering/sending; phase, hand, and participant changes clear selection but turn ownership changes do not. This ensures a preselected pair survives another player's turn and becomes playable when this client is active. On a successful game action selection clears, but it remains for corrections after server errors. Static and executable helper tests are in `client/tests/president-selection.test.mjs`.

## Randomized bot turn and Social wait (issue #7)
`botDelayPA(kind,random)` samples once per new bot action key: normal play 1800–3600 ms, Social 2400–4800 ms. `advancePA(r,now,random)` stores the deadline under `g.botActionAt` for persistence and never resamples while a task is pending. Short host turn timers cap the normal delay before the turn expiry. The Social key embeds `lastPlay.serial` and is replaced if another player acts. Existing per-room locking and validators remain authoritative.

## Results and counters (#8), merge policy
Current/last-hand `g.handStats` and lifetime `g.playerStats` are keyed by participant ID in the persisted room. Both update on valid actions and pile clears; only hand counters reset on the next deal. `PAPublic` includes sanitized public stats and existing presidencies/streaks, never hidden hand cards. Shared React `HandResults` renders named finish ranks and stats on both phone and board, preserving a departed player's finished result and labeling unranked newcomers. **Use regular GitHub merge commits** to preserve ancestry; after successful merges, allow the Action to delete the merged branch. Existing squash history is not rewritten.

## Sound event routing and in-seat timer (#11, #12)
President / Asshole uses host-only `PAPublic.lastPlayed` (timestamp/card play ID), `lastClear`, `lastSkip`, and per-affected-phone `myDrinkEvent` serialized by the server. Synthesis is original browser Web Audio, toggled in presenter/player UI; pointer/key interactions unlock audio. `presidentSoundCues` is a pure recipient/time classifier for card, turn, tick, skip, Social, drink, clear; `newPresidentSoundCues` deduplicates repeated snapshots, including reconnect. Ticking occurs only on a phone where that player has the turn and only in the final five seconds. Successful Social triggers presenter cheering and pile whoosh, not skip. The public `pa-seat-timer` is derived from the existing authoritative turn deadline. Always add tests for event recipient privacy and avoid synthetic samples requiring external downloads.

## Player rule preview and radial presenter (#25)
Server-only authoritative card validation remains intact. Public state exposes no phone pile cards but contains an allowed play count/rank/opener/Double Trouble rule in player-only `playRule` and current-hand finish position. The pure `presidentCardLegality` helper disables ranks unable to produce legal plays and prevents invalid selected groups from sending. Off-turn Socials are supported with top-run `socialRequirement` and existing `canSocial` permissions. Renderer positions `pa-seat` along an ellipse around `pa-table-center`; central pile type is large and high-contrast. Finished seats show green borders and rank emoji, as does the affected phone. Verify on hardware and preserve separate Host/Player privacy.

## Full-screen end-hand results and audio controls (issues #28, #29)

The Host `PresidentAsshole` view uses `resultsTakeover` when `game.stage` is ready/ended and `handRanks.length > 0`; it substitutes `pa-results-screen` for `pa-stage-columns` and reuses server-backed `HandResults` with no duplicated rank calculations. New game stage automatically restores the circular presenter; phone ready screens remain independent. Survey Show `useGameAudio` now takes `musicEnabled` and `effectsEnabled` separately and gates each respective subsystem; old `curtbox.audioOn=false` initializes two new persisted flags as disabled. President / Asshole `usePresidentSounds` remains private-effect-only where applicable, while `usePresidentMusic` is Host-only and uses the existing self-hosted soundtrack files with independent preferences. Don't introduce music on phones without explicit requirements. See `client/tests/audio-category-controls.test.mjs` and `client/tests/president-results-presentation.test.mjs`.

## President music/SFX volume internals (#29 follow-up)

`usePresidentSounds` retains a Web Audio `GainNode` channel for all synthesized cues; `volume`/`setVolume` updates that gain directly, stored under `curtbox.pa.effectsVolume`. `usePresidentMusic` updates `HTMLAudioElement.volume` in place with its independent `curtbox.pa.musicVolume`. Both hooks expose `enabled`, `toggle`, `volume`, and `setVolume`. The host shows both separate labeled 0–100% sliders and on/off buttons; phones show only effect control. `client/src/presidentVolume.ts` clamps slider inputs and handles corrupt/missing stored values; `client/tests/president-volume.test.mjs` and `client/tests/audio-category-controls.test.mjs` cover regressions.

## Presenter live pile revised by issue #31
The display now uses `presentPile(pile,pilePlays)` to compute a small **CURRENT PILE – PAIRS (2)** label and a bounded, overlapping last-six-card fan. Actual chronological pile cards and play grouping remain persisted on the server for rules/history; the presenter only changes rendering. Latest play cards must remain visible even for long piles and receive gold edging; exposed rank and suit indices remain legible, and a small badge counts buried older cards. No separate Current Combination block or Latest/Earlier Play panels. Cleared Pile History sidebar, circular table, private player hands, game rules and audio are unchanged. Existing static tests that expected grouped play panels were updated to the new requirement.

## #33 radial presenter player-seat contents
`PresidentAsshole.tsx` keeps the elliptical seat coordinates and server-sourced current/previous rank resolution. In each seat, player name and rank emoji now share a row, finished rank taking priority; the countdown is absolutely positioned upper-right without a bordered button appearance. The graphical face-down card count is rendered by `FaceDownCardStack` from pure `cardBackStackLayout` (`client/src/presidentSeatCards.ts`), with max sixteen layers and an accessible numerical label. Finished seats keep their green outline and suppress the card stack. CSS overrides appended after legacy styles; unit/static tests cover 3-card case, long hands, time position, accessibility, and other seat contracts.
