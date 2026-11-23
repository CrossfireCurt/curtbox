<!-- Latest repository authority update: 2026-11-23. Read docs/DEVELOPMENT_WORKFLOW.md and docs/ROADMAP.md alongside game specifications. -->
# Curtbox — instructions for coding agents

Read this file first. This repository is a multi-game, self-hosted party-game application. **Curtbox** is the platform; **Survey Show** and **President / Asshole** are separate games. The Nov 23 2026 work adds President / Asshole to the existing Survey Show archive without breaking the first game.

## Authoritative references

- `docs/PLATFORM_SPEC.md` — shared visual identity, rooms, roles, privacy, persistence, security and architecture.
- `docs/games/SURVEY_SHOW_SPEC.md` — Survey Show current rules, controls, prompts, scoring and presentation.
- `docs/games/PRESIDENT_ASSHOLE_SPEC.md` — President / Asshole final known rules and decree specifications.
- `docs/ARCHITECTURE_AND_AGENT_HANDOFF.md` — state machines, event API, files, technical debt and integration checklist.
- `docs/DECISION_LOG.md` — how to resolve historical contradictions and what remains unverified.
- `docs/archive/DECISIONS_AND_IMPLEMENTATION_PLAN_2026-11-20.md` — historical Survey Show planning artifact only.

## Non-negotiable conventions

1. Never merge public Host presentation and private Player controls. Hosts cannot inspect players' hidden cards or unrevealed survey answers. Each Player phone shows only the private controls/context needed to play; President / Asshole's actual pile is Host-only.
2. Server is the authority. Persist every room mutation to Postgres in a row-locked transaction and broadcast personalized `room:view` snapshots after commit. No client-trust shortcuts for card ownership, scoring, countdowns, votes, card exchange, player roles or decrees.
3. Role is fixed per browser session: Host or Player, never a combined role. A host who also wants to play joins from a separate device/session.
4. Rooms use random four-letter uppercase codes, joined through `/room/ABCD`, plus browser-stored reconnect token.
5. No AI announcer, TTS pipeline, cloud dependency during active gameplay, copyrighted branding/artwork/music or guessed survey data. UI: minimalist retro Curtbox shell and Github-like controls.
6. Preserve Survey Show behavior when modifying shared room/controller/API code. Survey Show's **percentage slider is a preview; only Submit counts**, Submit can be revised, and its timer does not end early. This supersedes the historical Nov 20 handoff.
7. President / Asshole **Term Limits lasts exactly N complete hands, expiring before hand H+N** when first effective before hand H. Repealing or self-expiring Term Limits does **not** cancel countdowns already assigned to other decrees. New decrees afterward are permanent until new Term Limits applies. This rule was finalized on November 23.
8. Keep testable game rules in `server/src/president.ts` and core Survey Show logic in `server/src/core.ts`. `server/src/index.ts` should handle transport, identity and persistence, not reproduce card rules.

## State of the delivered source (2026-11-23)

- President / Asshole game tile, room creation, settings, ready-up, dealing, turns, passing, clearing, Social, exchanges, vote/decree flow, timers, drinking prompts, rankings and separate TV/mobile presentations are **implemented in source**.
- 30 President / Asshole rules-engine, 15 Survey Show core and 20 client static/route tests passed (65 total) using the dependency-light test runner.
- **Not verified here:** full `npm install`, `npm run check`, `npm test` with normal npm dependencies, Vite + server production builds, browser Socket.IO tests, Postgres persistence with a running database, Docker startup or production security. The environment had no working npm dependency installation; do not claim deployable status.
- Known areas requiring deeper QA and some UX refinement are listed in `docs/ARCHITECTURE_AND_AGENT_HANDOFF.md` and `docs/DECISION_LOG.md`.

## Build regression note — November 23, 2026

The first released archive failed a real Mac `npm run build` at `client/src/PresidentAsshole.tsx` with `TS18048` (vote possibly undefined inside `.map`). This revision captures `const vote = game?.vote` and uses only that narrowed constant in the Democracy render. Also fixed the Kenney audio downloader accepting HTML as ZIP without trying alternate OpenGameArt source; this is isolated in `scripts/audio-archive.mjs` with 3 regression tests. **The complete npm/Vite/Docker pipeline has not been rerun successfully in this authoring environment (npm registry inaccessible).** Do not claim production build success. See `docs/BUILD_TROUBLESHOOTING.md`.

## First tasks for a new coding agent

1. In a networked Node 22 environment, run `npm install && npm run check && npm test && npm run build`. Fix any errors (particularly typing and runtime integration) before additional features.
2. Run `docker compose up --build -d` with `.env` from `.env.example` and validate 4-player President / Asshole sessions using one host browser and four phones; simultaneously regression-test Survey Show.
3. Add Socket.IO/Postgres/browser E2E tests that create a room, join four players, ready, play a hand, exchange next hand, enact Term Limits, vote through Democracy, reconnect, timeout, and finish.
4. Refine any documented implementation gaps without inventing new gameplay rules; check the latest user decisions first.

## Bots update (November 23, 2026)

President / Asshole has an optional host-configurable number of virtual bot opponents (0–7). Bots are stored in `room.pa.bots`, **never** `room.participants`. Read `docs/games/PRESIDENT_ASSHOLE_SPEC.md` Section 1a and the bots addendum in `docs/ARCHITECTURE_AND_AGENT_HANDOFF.md` before editing. Maintain a total of at most 8 humans+bots, require ≥1 human, auto-ready bots and never grant bot tokens or Primary Controller rights. Automated actions are persisted, serialized server-side and pass through the same game validators. Preserve Survey Show unchanged. Re-run `npm run test:president:pure` and `npm run test:pure` after changing any shared logic.

**User-requested work queue update:** GitHub CI/release/GHCR workflow configuration is now included in source (remote deployment requires user GitHub setup). Remaining: collaborative Virtual Code workflow; configurable-server Android TV host APK; presenter disconnect icons on both games. Do not claim the remaining features are part of this release.


## GitHub + GHCR pipelines (November 23, 2026)

The repository includes `.github/workflows/ci.yml` (checks and `:main` image) and `.github/workflows/release.yml` (tag builds, app tarball/checksums, GHCR `:vX.Y.Z` and stable `:latest`); `compose.ghcr.yml` is the no-build deployment file, and `scripts/update-from-ghcr.sh` updates Docker in place. **No GitHub remote/release has been created or tested in the authoring environment.** It lacks npm registry access, so there was no full npm/Vite/Docker production run. Read `docs/GITHUB_RELEASE_AND_DOCKER.md` before changing release or deployment behavior.

IMPORTANT: Original ZIP lacks `package-lock.json`. Have the owner run `npm install` on their networked machine, validate build, and commit the lockfile; CI and Docker switch to `npm ci` automatically. Keep `.env` and database dumps out of Git. Do not change Compose project name or remove the `party_db` named volume when switching from `docker-compose.yml` to `compose.ghcr.yml`. Tags represent releases; main branches publish a development image only after checks pass. Do not pretend the CI config has actually passed in GitHub before it runs there.

**Remaining queued requests, not implemented:** smoother ongoing source collaboration (Virtual Code or another tool), Android TV host APK with configurable server URL, disconnected-player warning icons in both host presentations (never shown for bots).

## Connected GitHub collaboration and accepted rule correction (November 23, 2026)

- Canonical repo: `CrossfireCurt/curtbox`; work on feature branches and open pull requests rather than exchanging full ZIP archives. GitHub Actions on `main` passed its first real build and published `ghcr.io/crossfirecurt/curtbox:main`. Earlier notes in this file saying remote GitHub/CI has not been tested are **historical** and superseded by this dated paragraph. See `docs/DEVELOPMENT_WORKFLOW.md` for ready-to-use Codespaces / VS Code steps.
- GitHub issues are the durable feature backlog; see `docs/ROADMAP.md` for ordered work and [issues](https://github.com/CrossfireCurt/curtbox/issues).
- **Approved rule correction:** Ordinary equal-rank, matching-size play **skips the next active player** and displays **Skipped** on the public presenter plus skipped player's phone. **A successful Social clears the pile instead.** Special clears (2s, four-of-a-kind, active Double Trouble) remain independent. **Implemented in the issue #3 feature PR** with authoritative persisted `lastSkip`, engine tests and client presenter/phone animation; never silently interpret a Social as a skip. Physical multi-device checks remain.
- Other open issues: #1 Android TV APK, #2 disconnect indicators, #4 pile legibility, #5 pile history, #6 same-rank selection, #7 bot think-time variation, #8 ranked ready screen/stats. None of those features are implemented by the Codespaces setup.

## Android TV host application — implementation handoff

Issue [#1](https://github.com/CrossfireCurt/curtbox/issues/1) is implemented as a TV WebView shell with a **native configurable server address** in `android-tv/`; the web client has TV-only D-pad keyboard/focus handling in `client/src/tvNavigation.ts`, installed from `client/src/App.tsx` for the `CurtboxTV/` user-agent marker. Read `docs/ANDROID_TV.md` for build/deploy, remote controls and remaining hardware testing. Android CI builds a **debug-signed sideload APK** in `.github/workflows/android-tv.yml`; version tags include a debug APK artifact. Debug signatures generated on separate runners are not stable across upgrades. Do not treat this as store-ready signed production Android distribution. Host/Player roles, Postgres and private card rules continue to live solely in the server; the TV app is presenter-only. Preserve both Survey Show and President / Asshole. Run `npm run check`, `npm test`, `npm run build` when altering shared client, plus Android CI build. The next implementation queue item remains disconnected-player icons [#2](https://github.com/CrossfireCurt/curtbox/issues/2).


## Additional accepted work queue (Nov 23, 2026)

Additional outstanding requirements, **not implemented**: [#11](https://github.com/CrossfireCurt/curtbox/issues/11) playing-card SFX and player-specific turn-start / low-time ticking / skipped sounds; [#12](https://github.com/CrossfireCurt/curtbox/issues/12) active player's countdown in the Host presentation seat; [#13](https://github.com/CrossfireCurt/curtbox/issues/13) current pile type label (Single / Pair / Triple / Four-of-a-kind); [#14](https://github.com/CrossfireCurt/curtbox/issues/14) preserving player card preselection when their turn begins. The user repeated [#6](https://github.com/CrossfireCurt/curtbox/issues/6) single-rank-only Play/Social selection; it was updated, not duplicated. Card Exchange must continue to permit multi-rank selections. See `docs/ROADMAP.md` for order and the individual issues for tests and acceptance conditions.

Source audit confirmed the Host currently has a **global** countdown but none inside the active player's `pa-seat`; `PresidentAsshole.tsx` resets selection on `game.currentPlayerId` change. Do not misreport these queued fixes as already deployed.


## Connection indicator implementation (#2)
Both Host presenter views use `client/src/ConnectionName.tsx` for TV-visible disconnected human-player indicators (Survey Show public participant `online`; President / Asshole public seat `online`). Never show the warning for bots. Render without leaking hidden cards or mixing Host/Player surfaces. See `client/tests/connection-indicators.test.mjs`.

## Pile visualization, history and combination label (#4, #5, #13)
`PAState.pilePlays` stores chronological accepted plays in the current pile, `PAState.pileHistory` stores the last eight clear records per hand; both reset on next deal. Each record owns copies of the card values and player ID, and only Host public views receive them. The Host renders latest play first with distinct readable cards and shows history e.g. "Curt cleared". The current combination label is based on latest **play count**, not accumulated pile length. Server unit and `client/tests/pile-presentation.test.mjs` check these features. Preserve privacy and bounded persistence.

## Mandatory branch lifecycle

After CI passes and a PR is merged into `main`, **delete its feature branch**, including documentation and repair branches. The repository's `.github/workflows/cleanup-merged-branches.yml` automates this; check its actual Actions result and verify the branch disappeared. The workflow skips protected/default branches, forks, branches with open PRs, and branches that advanced since a merge. Do not create stale branches or claim cleanup succeeded until the branch list confirms it. A workflow_dispatch run can clean preexisting merged branches.

## Selection implementation (#6, #14)
`client/src/presidentSelection.ts` contains the pure rank-aware card toggle and available-card filtering. Use **single-rank** mode for normal Play/Social and **mixed-rank** mode for Card Exchange. The React component clears selection on hand, stage and participant identity changes, **not current turn-owner changes**; that distinction allows preselection before one's turn. After the server reports success it clears, but failed actions preserve selection. Test with `client/tests/president-selection.test.mjs`, which runs through `npm run test:pure`. Do not move this rule into a server-only shortcut; the server still enforces legality.

## Bot action delays (#7)
`server/src/president.ts` exports `botDelayPA(kind,rng)`, sampling once for a fresh task; play 1800–3600 ms and Social 2400–4800 ms. `advancePA` persists chosen `botActionAt` and reuses it on subsequent ticks. A Social task is keyed to `lastPlay.serial` so a newer play cancels its eligibility. Clamp ordinary plays to host-configured short turn deadlines. Run `server/tests/president.test.ts` and test with live phone Social races before changing the timing windows.

## Git ancestry policy — 2026-11-23 user correction
All subsequent Curtbox pull requests MUST use a **regular merge commit** (GitHub "Create a merge commit", connector `merge_method: "merge"`), not squash or rebase merges. This preserves feature branch commits in `main` ancestry and visibly rejoins colored lines in Git graphs. Never rewrite old squash merges. Wait for green CI, merge, and verify the automatic branch-cleanup Action removed the merged head ref. See `docs/DEVELOPMENT_WORKFLOW.md`.
## Last-hand results (#8)
Server increments persisted `playerStats` and `handStats` on card plays, Socials, 2s, passes and pile archives, including end-of-hand clears. `handStats` resets only on new deal; cumulative `playerStats` persists. Player and host use `HandResults` to display **named**, not numeric, ranks, five last-hand metrics, and cumulative presidencies/streaks. Rank entries persist when a participant departs; newcomers show Unranked. Test `server/tests/president.test.ts` and `client/tests/president-hand-results.test.mjs`.

## President / Asshole audio and presenter seat timer (#11, #12)
The server exposes host-only `lastPlayed`, existing `lastClear` and `lastSkip`, and **only the targeted player** receives `myDrinkEvent` with a persisted serial and timestamp. `client/src/presidentSoundEvents.ts` purely classifies fresh authoritative events by recipient; `client/src/presidentAudio.ts` synthesizes and deduplicates effects using Web Audio, controlled by a visible sound toggle and browser gestures. Do not send drinking events to other phones or count a Social as a skip. The active seat on `PresidentAsshole.tsx` displays a clock derived from `turnEndsAt` and offset. Tests: `client/tests/president-sound.test.mjs`, `server/tests/president.test.ts`. Real device sound behavior still needs validation.

## Revised Social rules (#24)
Use `topRankRun`/`completesFourOfKind` from shared/president.ts for Social eligibility; do not rely on `lastPlay.count`. All four-of-kind completions are Social, including on-turn four cards, even with interrupts disabled. Off-turn requires host Social enabled, live matching run and distinct last actor. Noncompleting equal-rank still skips. Phone uses one Play-to-Social button from `presidentPlayButtonMode`; Asshole mode sends one targeted Social drink notification to every human, never bots. Clear before finalizing the hand so Social history/audio survive. Check dedicated server/client tests.

## Circular game table and private card legality (#25)
PAPublic includes current-hand `handPlayerCount`, `seats[].finishedPosition`, `myFinishPosition` and private `playRule`. Do not confuse current finishing position with previous hand rank. `client/src/presidentCardLegality.ts` computes possible card ranks plus selection validity from server-provided rule state (including group size and Socials), enabling Pass only when no playable ranks exist on turn; preserve waiting preselection and mixed-rank Card Exchange. Presenter seats are spaced around an ellipse, with a large pile combination callout, visible cards, bot 🤖 and green-bordered finished rank icons. Rank icons: 🇺🇸 👨‍💼 🧑 🖥️ 💩 (🧹 Janitor). Test with client pure/UI and server tests, then on real TV at 4–8 seats.

## Presenter Last Hand takeover + independent music/SFX controls (#28, #29)

Public President / Asshole presentation substitutes a full-size `HandResults` screen for the circular table/sidebar during the between-hand Ready stage (and final ended stage) if there are completed `handRanks`. It returns to the table when the server begins the next hand; no client dismissal timer. Survey Show's `useGameAudio` uses independent, persisted music/SFX toggles with existing volume sliders; gating one must never mute the other. Old master mute initializes both new flags off. President / Asshole presenter music is separately enabled/disabled via `usePresidentMusic`, and phone-specific gameplay sounds via `usePresidentSounds`; no phone music. Tests cover UI branches and audio subsystem separation; continue to use regular merge commits with automatic branch deletion.

## Independent President music/effects *volume* (#29 follow-up)

Ensure the presenter exposes both **Music volume** and **Sound effects volume** as separate visible sliders, not just on/off switches. Player phones expose Effects volume only. The effects hook uses an independent Web Audio master `GainNode`, and the music hook uses the background HTMLAudioElement's volume. Both persist browser-local numeric settings and do not alter the other category. Preserve `president-volume.test.mjs` and `audio-category-controls.test.mjs` and require green GitHub CI before merge.

## #31 revised live pile — supersedes earlier grouped-play presentation
The *live* Host pile must render as **one compact overlapped fan**, **not** per-play cards/panels or a horizontally scrolling carousel. `client/src/presentPile.ts` derives the `CURRENT PILE – PAIRS (2)`-style heading from the most recent accepted play and selects the newest up-to-six cards, ensuring latest-combination visibility. Expose rank and suit in each visible card's top-left corner; mark the latest play with a subtle gold edge. Show number of older cards buried. Keep `PAPublic.pileHistory` and its attributed sidebar unchanged. Tests in `client/tests/pile-presentation.test.mjs` cover visual semantics and pure logic. Preserve circular seats and gameplay; run full CI/Android and physical 1080p layout QA.

## Presenter seat visual contract (#33)
Player-square names must remain large, with previous rank (or current finishing rank) emoji to their right rather than word subtitles. The active player's countdown is a larger borderless text clock in the upper-right, still calculated from `turnEndsAt`. Do not reintroduce `N cards` visible labels: `FaceDownCardStack` renders one staggered card back per held card up to sixteen using pure `cardBackStackLayout`; display overflow only for larger hands, and put exact count in accessible aria-label. Preserve green finished seats with the current rank emoji, bot 🤖 and disconnected-human marks; no private card faces are exposed. Run `client/tests/president-seat-presentation.test.mjs` and full CI/Android. Real TV layout QA is required.
