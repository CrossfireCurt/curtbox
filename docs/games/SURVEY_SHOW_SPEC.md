# Curtbox / Survey Show — gameplay and design specification

**Authoritative working design as of November 23, 2026.** This describes the code shipped in this archive and the established game rules. Older planning copies in `../archive/` are historical: **percentage submissions require an explicit Submit action**, notwithstanding earlier discussions of committing on slider release.

## 1. Concept and game modes

Survey Show is Curtbox's first game. Players make guesses about real, sourced published survey percentages, predict whether another player's guess is too high or low, and compete in a final round. No fabricated survey percentages, invented citations or generic synthetic survey answers. Players use individual phones; the Host operates a separate, large public TV-like stage.

**Players:** 2–8 (not including Hosts). Game catalog: Survey Show. Room lives across matches with the same code, while each match gets a new immutable question snapshot and scoring state. Game ends after two regular rounds and exactly one finale. The creator chooses the finale type in Host settings before a match.

Content ratings: Family, Standard (default), Adults; higher ratings include all lower-rated material. Pace: Fast, Normal, Relaxed.

## 2. Start, player order and regular turns

Primary Controller is the first Player, not the room creator Host. Controller initiates a **15-second countdown** and may cancel it. Lobby should have eight clearly defined seat slots, reserve avatars, emphasize the Controller, show room code and QR for joining, and avoid a pregame leaderboard. Required Players: **minimum two**, maximum eight.

Regular match structure:

| Players | Round 1 | Round 2 | Finale |
|---|---|---|---|
| 2–3 | 2 guesses per player | 2 guesses per player | 1 shared finale |
| 4–8 | 1 guess per player | 1 guess per player | 1 shared finale |

Each regular turn begins with a randomly selected, eligible percentage question. One Player is the guesser, everyone else predicts. Order is randomized fairly. The same question ID cannot repeat within the same match; previously unseen questions within the room are preferred, otherwise least-recently used. Questions are selected just in time from a snapshot of all eligible published questions taken at match start; ongoing matches are never changed by admin updates or deletions.

## 3. Percentage guess and explicit Submit (latest decision)

The guesser selects an integer **0–100** using the slider. Slider movement previews the value (the presenter can follow that draft). The guesser must press **Submit** to record a valid guess. They may adjust and **Submit again** until the deadline; the latest submitted value wins. **No guess is submitted solely by moving/releasing the slider**. The entire guess timer runs, even if the guesser submits early; submitting does not auto-advance.

If the player never pressed Submit, the result is **NO ANSWER**, zero guessing points, and there is **no Higher/Lower prediction phase** for that turn. Do not silently submit 50% or treat merely previewed values as answers.

Once a numeric guess exists at deadline, the other active Players predict. Round one allows **Higher** or **Lower** (1000 points for correct direction). Round two also allows **Much Higher** or **Much Lower** (2000 points when actual differs by at least 15 percentage points in the chosen direction). Choices that are mathematically impossible based on the submitted guess are disabled (for example Higher at 100%). Equality of actual and guessed values awards zero prediction points. Unlike percentage guesses, predictions **immediately commit when tapped**; the phase ends early as soon as all eligible predictors vote, otherwise on its deadline. Unanswered predictions score zero; they are never invented.

### Normal durations (seconds)

| Phase | Fast | Normal | Relaxed |
|---|---:|---:|---:|
| Percentage guess | 20 | 30 | 45 |
| Higher/Lower prediction | 10 | 15 | 25 |
| Top 3 finale | 20 | 30 | 45 |
| Rank finale | 30 | 45 | 60 |
| Percentage Showdown finale | 20 | 30 | 45 |

Server owns all deadlines, phase changes and scoring. Disconnections do not pause phase timers.

## 4. Regular scoring

Let `guess` and `actual` be rounded integers from 0 through 100. The guessing Player earns:

`max(0, 3000 - 100 * abs(guess - actual))`

A perfect guess earns 3000, 10 points away earns 2000, 20 away earns 1000, and 30+ away earns 0. Predictions are **+1000** for the correct higher/lower direction and **+2000** for correct Much Higher/Lower when absolute difference in the selected direction is 15 or more. Any wrong, mathematically impossible or missing prediction scores 0.

**Important reveal/commit rule:** Server calculates turn awards and explanations early but holds them pending until the entire per-player reveal finishes. Only then are the points committed once atomically. Do not increment the leaderboard as each personal reveal animation plays.

## 5. Finale modes

The host chooses **one** of the following between matches. Each Player answers individually, simultaneously, and all submitted choices are server-owned.

**Top 3 Answers**: Pick up to three options from 6–8 sourced options. Each correctly selected top-three rank earns slot values 3000/2000/1000, with equal published percentages splitting the affected rank-slot values fairly. Unselected options do not earn points; partial submissions score only genuinely selected correct items. The answer selection is an ordered touch history on the device but evaluation is **unordered**.

**Rank Answers**: Place five given options in descending published-percentage order. Each correctly ordered pair earns **600 points**; ten pairs means 6000 maximum. Tied published values accept either ordering. Pairs involving an unselected option earn no credit; partial rankings may score valid ordered pairs.

**Percentage Showdown**: Every Player guesses the same actual percentage using the same explicit **Submit, revise, full-timer** behavior as regular percentage guesses. Base points:

`max(0, round(4000 - (4000 / 30) * abs(guess - actual)))`

Closest submitted guesser(s) split a total **2000-point bonus** with deterministic remainder handling. Players without a submitted answer do not qualify for a guessed percentage or closest bonus.

## 6. Reveal and results presentation

All Host/presenter screens share the server's authoritative step and timestamps, including reconnect/resume. The reveal first displays the actual percentage/answer. For regular turns, display the guesser's choice against truth on an animated **0–100% accuracy ruler**, then reveal the individual Higher/Lower votes **one by one**, left-to-right, with a server-generated point breakdown and relevant highlighted ruler range. Award points only **after the last reveal**. Animate the total scoreboard counters after commit.

For finales, show the actual ranked answers or percentage result and server-generated per-player explanations, then commit finale points once. Result sequence reveals lower standings before winners, with optional fun highlights (best/closest guess, biggest miss, comeback). Highest cumulative score wins; ties at the highest score produce **co-winners**, without secondary tiebreakers.

The Primary Controller can Skip the post-match results cinematic to show the complete leaderboard, and can Return to Lobby separately. Do not combine Skip and Return. The remaining room/game history persists across matches where relevant.

### Presenter vs Player UI

Host sees large navy survey board, warm illuminated percentage/answer tiles, player identities, score changes, highlights, QR code and simple dramatic reveals. The Player sees **focused personal inputs only**. Their phone does not duplicate the entire Host board, participant roster or TV leaderboard. During the personal game phase it may display prompt, valid controls, turn feedback, personal answer state and permitted source details. In particular, the Player lobby shows avatar choice and Controller Start, but no redundant title/room code/roster/points.

No AI voice or spoken announcer. Original or licensed phase music, effects and reaction sounds may play on Host only, with host-local sound unlock, separate music/effects volumes and synchronized cue position.

## 7. Survey content and admin

Published questions must be **real verifiable surveys**. Prefer the primary publisher's methodology, wording, population, timeframe and source URL. Two independent reputable matching sources may support data where the primary is missing, with limitations recorded. Direct, concise, playful 6–25-word prompts are preferred (often 8–18); don't pad with "According to ..." or publisher boilerplate. Include essential timeframe, geography or surveyed population when omitting it would distort the percentage.

A source record contains publisher, year, URL, original wording, and available sample size/population/field dates/geography/methodology; missing source details should be disclosed rather than invented. Player-only expandable source details may appear during reveal; there is no past-question browser or question-report UI.

Admin supports authenticate, create draft, edit as new immutable version, publish, disable, enable and permanently delete with explicit confirmation. Published version snapshots must remain stable during a match. The current seed bank includes **302 culture/behavior percentage questions** plus 2 finale question sets in bundled source; not every record has undergone independent editorial audit.

## 8. Avatars, reactions and sound

Twenty emoji avatars are current placeholders for a future original art pack; uniqueness is enforced in room. Twenty-two reaction labels/emojis, filtered by rating, can be sent by Players in every phase, with a 3-second sender cooldown. Host sees animated attributed reactions and plays individually synthesized bundled Ogg effects (22 clips); production-quality replacement effects may be sourced under CC0 as documented in `../REACTION_AUDIO_CATALOG.md`. Host audio must be enabled through an explicit browser interaction.

## 9. Implementation mapping and caveats

- `server/src/core.ts`: Survey Show game lifecycle, validation, score math, private/public snapshots and reveals.
- `server/src/seed.ts`, `cultureSeed.ts`, `expandedCultureSeed.ts`: survey content and versioning.
- `client/src/App.tsx`: room navigation, Host board, Player controls and admin UI.
- `client/src/audio.ts`: host-only phase music and SFX.
- `server/tests/core.test.ts` and `client/tests/`: gameplay and limited UI regression tests.

**Source-of-truth distinction:** The old `../archive/DECISIONS_AND_IMPLEMENTATION_PLAN_2026-11-20.md` advocates immediate selection and earlier reveal settings; the November 23 source and README implement explicit Submit/full timer and sequential delayed commit. For this package, the latter is authoritative. Remaining advanced-browser, Docker, provenance, accessibility and integration tests are tracked in `../ARCHITECTURE_AND_AGENT_HANDOFF.md`.
