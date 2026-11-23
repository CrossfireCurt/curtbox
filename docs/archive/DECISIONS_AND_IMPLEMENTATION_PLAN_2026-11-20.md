# Curtbox — decisions, architecture, and implementation plan

**Coding-agent handoff · Revised November 20, 2026**

## 0. Authority and scope

**Curtbox is the platform. Survey Show is one game within Curtbox.** This file supersedes prior Survey Show platform specifications wherever they conflict. The owner explicitly approved implementation. The project is **not** a clone of a commercial game or its copyrighted artwork; inspiration is limited to general game mechanics and visual genres.

**Current revision priorities:** clean GitHub-like inputs and forms, minimalist retro-video-game Curtbox identity, minimalist Family Feud–evocative Survey Show presentation, much simpler joining and personal UI, no combined roles, and explicit but revisable Submit for percentage guesses without ending their timers. Never implement any AI voice or speech pipeline.

## 1. Product language and UI

- Platform name/logo throughout site and docs: **Curtbox**.
- First game name: **Survey Show**. Other games will be listed independently as they are added.
- Platform home starts with a **game-selection screen**, then options **Join existing room** or **Create new room** for the selected game. The catalog should be structurally extensible; only Survey Show is available now.
- **Curtbox visual identity:** minimalist retro video game. Restrained nostalgic color and geometric/pixel motifs, not a cluttered arcade UI.
- **Forms/controls:** GitHub-like. Clear explicit labels, consistent dark-neutral backgrounds, one-pixel borders, calm spacing, visible focus rings, simple validation text, recognizable buttons and dropdowns. Prioritize clarity, mobile usability, and accessibility over visual decoration.
- **Survey Show presentation:** original, minimalist, inspired by the *general visual language* of family-style survey game shows (navy board, warm illuminated percentage tiles, clear contestant names and scoreboard, dramatic but simple answer reveal). **Do not copy Family Feud trademarks, logo, typography, music, or artwork.**
- Hosts and players have **different interfaces**, not a split view. A player sees only their personal game/control interface, while a host only sees the public presentation. The player interface is a compact personal controller: avatar choice, relevant gameplay inputs (with question/context as needed), reaction shortcuts, and Primary Controller actions. It must NOT show the game title, room code, their own display name, score/points, or any player roster/leaderboard. All those belong to the shared Host presentation. The only player header control is Leave; do not duplicate the host scoreboard or room metadata.
- No AI announcer, TTS, voice selection, roast settings, spoken commentary, captions, audio ducking, or agent memory. **Remove those features and dependencies completely.** Music, reaction sounds, and visual reveal cues may remain.

## 2. Navigation, rooms, and role assignment

**Room creation**

1. Choose a game in Curtbox catalog (currently Survey Show).
2. Choose **Create new room** (host-only action).
3. Do **not** ask the creator whether they are also playing. Creating a room always establishes a Host-only session, with no Host+Player role or additional player checkbox. A person who also wants to play may separately join as a Player from another device/browser session, using the room code.
4. Server generates a **unique, random, case-insensitive four-letter room code**. The creator does **not** choose or enter a code.
5. Creator enters **Host setup**: choose game settings, optionally enable browser sound, see room code and join link. Host proceeds to **Open lobby**.
6. Host screen shows the Survey Show public lobby (and later presentation), with QR code overlay available on demand.

**Direct room URLs and QR codes**

- Canonical shareable/deep link is **`/room/{FOUR_LETTER_CODE}`**, e.g. `/room/IBUY`. Any visitor opening this URL should be taken to that specific existing room, not the game library.
- A browser with a valid saved session for that room resumes its previous Host or Player session automatically. A new visitor gets room validation/details and must then choose Host or Player (and a name for Player) before actually joining.
- Missing or expired rooms display a dedicated Room unavailable state; never silently join a different previously visited room, and never create rooms just because a link was opened.
- `/join/{CODE}` legacy QR links must keep working and normalize to `/room/{CODE}`. Case differences and an accidentally copied trailing comma are supported. New QR codes use `/room/{CODE}`.
- The Express SPA fallback serves frontend HTML on `/room/{CODE}` and proxies must forward these paths.

**Joining**

1. Choose the game; choose **Join existing room**.
2. Enter the existing four-letter code (QR opens equivalent direct link).
3. **Only after identifying a room**, choose **Host** or **Player**. Do not show an Audience role on the prejoin screen.
4. **Player**: enter a fixed personal display name and join directly as a player; no additional hosting question.
5. **Host**: use a short local presentation setup (audio/browser playback), then proceed to that room's lobby or current live presentation. A joining host cannot change the original creator's game settings.
6. No combined Host+Player role anywhere. Host controls belong to the presentation role only; Player has personal controls only. A person can participate in both capacities using two devices/sessions.

- First **Player** registered in a room becomes **Primary Controller**, regardless of which host created it. The original host creator is not a player and is not Primary Controller.
- Primary Controller controls Start (15-second countdown), Cancel Countdown, Skip cinematic results, and Return to Lobby. On 30 seconds disconnected, transfer to the next connected player; original controller does not automatically reclaim.
- Original creating host retains exclusive game settings control between matches and closing the room. Its privileges do not transfer; temporary host presentation authority may be transferred after 30 seconds offline if needed.
- Fixed personal names for room lifetime. Case-insensitive duplicate names auto-suffix with 2, 3, etc. Host-only role uses automatic Host N names and does not need a name input.
- Role is fixed for a room participant. Changing Host/Player requires a separate session/device, not role switching in active room.
- Late-joining players can observe their personal room view but are not inserted into a running match; they join next match roster.
- Up to 8 players, minimum 2 for Survey Show. First-game presentation cap: 8 host slots, creator gets priority; optional host requests wait in a first-in/first-out queue. 30-second temporary presentation slot reservation, waiting host request expires on disconnect.
- Hosts do not see the Player input panel, and Player-only screens do not render the full TV presentation.
- **Player lobby simplicity:** Show only the avatar picker and, for the first player/Primary Controller, a plain **Start game** button. Keep the button visible but disabled/greyed out until at least two players are present; do NOT display the explanatory “Need at least 2 players to start” text or current player count on the Player screen. Put that explanation and the player roster/count on the Host presentation instead. Non-controllers do not see a Start game button. Player header has only Leave.
- **Results:** The public Host presentation alone shows rankings, scores, winners and highlight stats. Players see a brief “see host screen” state and only their authorized Skip Reveal / Return to Lobby controls. No leaderboard on Player view.
- Room code appears on presentation; host can display QR overlay without pausing. Room returns to same code between matches; new game => new room.
- All rooms, controllers, players, game clocks, and question snapshots persist in PostgreSQL. Automatic reconnect uses a stored browser session token. Room expires after 15 minutes with everyone offline, including downtime where possible. Creator choosing Leave Room closes room immediately.

## 3. Survey Show game rules

### Rounds and pacing

- Two regular rounds plus one finale. 2–3 players: two turns each **per regular round**. 4–8 players: one turn each per regular round. Randomize order fairly; no duplicate question within a match.
- Configured pace changes deadlines (in seconds):

| Phase | Fast | Normal | Relaxed |
|---|---:|---:|---:|
| Regular percentage guess | 20 | 30 | 45 |
| Higher/Lower prediction | 10 | 15 | 25 |
| Top 3 finale | 20 | 30 | 45 |
| Rank finale | 30 | 45 | 60 |
| Percentage Showdown | 20 | 30 | 45 |

- Server owns deadlines/phase transitions. The client uses the server timestamp for display only. Disconnections do not pause anything.
- **Percentage answers require an explicit Submit action.** Slider movement sends a live preview, not an answer. The active guesser may press **Submit** at any time, adjust the slider, and press Submit again before the deadline; the most recently submitted value is the answer. The countdown ALWAYS runs in full. Apply this same explicit submission behavior to Percentage Showdown. Higher/Lower prediction buttons still count as an immediate choice, and Top 3/Rank selections remain tap-based with partial choices supported on timeout.
- **Percentage guessing ALWAYS uses the full countdown**, even if the active player already moved the slider; the player can revise the guess until zero. **All finale input modes also use their full countdown.** Only the regular Higher/Lower prediction phase advances early, when ALL eligible other players have picked a direction. If anyone does not pick, continue to its deadline.
- **Unanswered on timeout stays unanswered**. Slider movement alone, even to a nondefault number, does NOT count as a submitted percentage. Do not auto-submit slider 50%, assign a default guess, grant points for unsubmitted input, or fabricate predictions. A missed guess receives zero guessing points; no prediction phase is possible without a numeric guess. For timed-out multiple-choice finales, only genuinely chosen items should be considered, under the finale scoring rules.
- A percentage is submitted ONLY by pressing Submit; submitting or changing it never shortens the timer. A later drag changes the preview but leaves the previously submitted value intact until another Submit. If the player never submits, show NO ANSWER. Directional prediction buttons are submitted on tap. Avoid giving an accidental default selection on initial page render.
- Active question, round, time remaining and public result shown on host board. Player has a focused personal control surface for their own action, not a duplicated host stage.
- **Animated, server-paced reveal**: after the 3-second prediction anticipation phase (or immediately after a missed-guess deadline), show the actual answer first (current implementation: 4.3 seconds); next show the **percentage-picker first**, juxtaposing their submitted guess with the actual result on an animated **0–100% scale**. Visually identify the scoring tolerance zones; delay the point award/formula animation until after the comparison has appeared. Continue through the **other players in left-to-right reveal order**, highlighting Higher/Lower/Much Higher/Much Lower winning regions on the same scale and exposing each player’s server-derived verdict, point formula, and earned points. Each player has a server-paced 4.3-second reveal step; **do not change any player score during these individual reveals**. When the last player is revealed, atomically apply all scores, animate on-screen leaderboard counters and +point bursts (currently 5.3 seconds), then move to the next turn. Percent Showdown uses the same ruler including closest-guess bonus; Top3 and Rank reveal actual sorted answers plus each player’s calculation. All reveal steps and commits are persisted. Timelines and steps must survive restart/reconnect; never award twice. No AI announcer.

### Regular scoring

- Percentage estimate (0–100 integer), actual rounded to nearest integer, score `max(0, 3000 − 100 × |guess − actual|)`.
- Other players choose Higher or Lower for 1000 points if direction matches, zero otherwise. Exact equality => prediction scores zero.
- Round two also offers Much Higher or Much Lower, scoring 2000 if actual differs by at least 15 points in the predicted direction. Disable mathematically impossible options.

### Finale options (creator chooses between matches)

1. **Top 3 Answers:** Select 3 of 6–8 verifiable survey options, unordered. Points for correctly selected actual top-3 slots 3000/2000/1000, with tied percentages splitting the affected slot values evenly. On timeout a partial selection can score only genuinely selected correct options, not auto-completed choices.
2. **Rank Answers:** Order 5 options. Each correctly ordered pair gives 600 points; 10 pairs => 6000 maximum. Ties accept either ordering. Unchosen options do not generate credit.
3. **Percentage Showdown:** Everyone guesses same percentage. Base `max(0, round(4000 − (4000 / 30) × |guess − actual|))`; closest guess(es) divide a 2000-point bonus (deterministic remainder).

### Results and next match

- Highest score wins; tied highest scores => **co-winners** with equal first place, no tiebreaker.
- Dramatically reveal lower standings first, winners afterward, then compact fun highlights: closest guess, biggest miss, comeback where applicable.
- Primary Controller can **Skip Reveal** to immediately show the complete leaderboard + highlights on all devices, but Return to Lobby is a different action.
- Completed results remain **indefinitely** until Primary Controller selects Return to Lobby. Scores reset for new match, while match history remains until room expiry.
- Players intentionally leaving mid-match retain accrued score in history and skip future turns; if all active players leave, match ends from current scores.

## 4. Questions, evidence, and admin

- Seed bank in `server/src/cultureSeed.ts` and `server/src/expandedCultureSeed.ts`, exported through `server/src/seed.ts`: currently **302 curated culture/human-behavior percentage questions (172 original + 130 expanded) plus Top 3 and Rank finale sets**, with cited source records in `docs/SURVEY_SOURCES.md` and editorial rules in `docs/QUESTION_STYLE_GUIDE.md`. An earlier larger, dry demographic/tech bank was retired because it was not entertaining. More carefully curated questions remain an expansion goal.
- Questions use **natural, direct, Guesspionage-inspired percentage wording** (usually 8–18 words; hard 6–25 limit), faithful to the original measure, population, geography, relevant timeframe and denominator. Never pad with “According to…,” poll-provider names, publication details, or “in a survey.” Source metadata stays accessible at answer reveal. Shortness must not distort meaning.
- No strict age cutoff. If year materially changes result interpretation, state the year in the playable question.
- Credible local/regional/demographic studies allowed with the defined surveyed population explicitly identified. No universal sample-size threshold; assess methodology and corroboration together.
- A reputable primary source is preferred; when unavailable, two independent reputable sources with matching details may support publication. Incomplete methodology acceptable when sufficiently corroborated; record absent details as *Not reported*. Conflicting/ambiguous results are not automatically published.
- Content ratings: Family-Friendly, Standard (default), Adults Only. More permissive ratings include lower-rated items. All data must be real, verified; never invent percentages/rankings.
- `/admin` provides single-admin authentication and create/edit/version/publish/disable/enable/permanently delete with explicit confirmation. No participant question reporting UI. Deletion cannot mutate already-running games.
- **Immutable match-start snapshot** of published eligible question versions; admin edits/publishing/deleting never change the active match. Pick questions just in time from that snapshot.
- Question selection is random, **ignores topic and estimated difficulty**; no repeat IDs in same match; prioritize questions unseen in this room, otherwise least-recently-used across matches. No required topical balancing.
- During answer reveals, every relevant screen shows compact source publisher and year. The **Player personal interface only** can expand detailed original wording, population, methodology and citations; expansion disappears when the reveal ends. No past-question browser.
- Admin-triggered AI research/discovery worker may be added later, independent of game runtime and subject to rigorous corroboration. Do not auto-publish unverifiable facts.

## 5. Avatars and reactions

- Shared catalog of at least 16 original, unique colorful cartoon player avatars (currently 20 emoji placeholders). First choice reserves avatar across lobby and countdown; choices lock at countdown end; unchosen avatars assigned from unclaimed set. Players may change avatars between matches.
- Hosts have no player avatar. Avatar animations, when added, appear on public host presentation only and are short event reactions, not continuous idle motion.
- Players can send 22 pre-set attributed emoji reactions, filtered by room rating, in every phase. Hosts show animated reactions and play reaction effects; player control screens only offer reaction buttons.
- 1 accepted reaction per sender every 3 seconds, server enforced. Four quick-access favorites are chosen from that browser's most-used accepted reactions; full reaction panel stays open until dismissed.
- Host reaction sounds play sequentially: one active, max three waiting; if a queued sound has not started within two seconds it is discarded, but the visual reaction still appears. Prototype synthesized sounds exist; complete effects library is a later task.

## 6. Audio

- **No announcer, speech generator, speech synthesis, or AI commentator.** Audio consists only of music and game/reaction sound effects.
- Music and sound effects are bundled with each game version; no uploadable audio assets from the admin panel. Hybrid sourcing: original signature themes and stingers plus properly licensed supplemental instrumental tracks/effects with provenance.
- Phase-specific retro instrumental music for lobby, guessing, predictions, reveals, scoring, finale and results; smooth transitions.
- Host displays synchronize music against the shared game-phase timeline; late/reconnecting hosts seek to the appropriate offset. Each host has independent browser-local mute, music volume, and SFX volume.
- Player-only devices do not play the public soundtrack. Optional small personal UI feedback sounds can be included independently in a later pass.

## 7. Architecture and real-time contract

- Stack: React 19 / TypeScript / Vite, Node.js 22 / TypeScript / Express / Socket.IO, PostgreSQL 16; Docker Compose behind HTTPS-enabled Nginx Proxy Manager (WebSocket support on).
- Single application replica initially; target roughly 1–10 concurrent rooms. No distributed queues/Redis/Kubernetes initially. No cloud data/AI dependency during active play.
- Postgres `rooms(code, data JSONB, updated_at)` persists entire state, `questions(id,version,status,data JSONB)` stores published immutable versions, `seed_registry` prevents deleted seed IDs from reappearing on restart.
- Room events: `room:create` (host only, random code), `room:join` (code+role+optional token), `room:openLobby` (creator completes setup), `room:settings` (creator between matches), `room:avatar`, `room:requestPresentation`, `room:react`, `room:start`/`room:cancel` (Primary Controller), `room:leave`.
- Game events: `game:guess` and numeric `game:finale` save slider previews only; `game:guessSubmit` and `game:finaleSubmit` save explicitly confirmed numeric answers, also without advancing their timers; `game:predict` immediately saves a choice and can advance when all eligible predictors respond. The server must reject late inputs by advancing expired phases *before* evaluating each received input. `game:skip`, `game:lobby` are controller-only. Server emits personalized `room:view` snapshots, `room:reaction` and `room:closed`.
- All room mutations run in serialized Postgres transactions. Restore rooms/deadlines after reboot and prevent duplicate scoring. Do not expose unseen survey answers to client until reveal.
- Admin security: Argon2id password, HttpOnly signed session cookie, CSRF token, login rate limiting, reverse proxy HTTPS, no client-side admin secret.

## 8. Current implementation status (do not overclaim)

**Present in source:** Curtbox-branded entry/catalog; Survey Show game selection; join-code then role flow; random-code host creation; creator game settings and setup; separate Host-only and Player-only interfaces; dedicated host setup for guest hosts; 15-second countdown; 2 regular rounds, 3 finales; no-answer timer semantics; explicit, revisable percentage submission; immediate directional prediction selection; server-side scoring; QR; avatars/reactions; PostgreSQL room persistence; admin; 302 curated culture/behavior percentage question seeds plus 2 finale sets; preliminary synchronized synthesized instrumental cues.

**Validation completed here:** Server game-engine and client behavior tests pass using dependency-free TypeScript transpilation (server identity/controller, seed quality/volume, scoring, no-default-on-timeout, selection auto-advance, complete match, snapshot persistence, cinematic skip). This is **not** equivalent to full npm/Vite/Docker integration testing.

**NOT yet verified or complete:** Full `npm install`, `npm run check`, production Vite+server build, Docker/PostgreSQL start, browser/socket multi-device E2E, media licensing/authored pack, real artwork, robust audio reaction queue, admin typed editing forms, AI-assisted survey sourcing, comprehensive accessibility/security audit, full multi-game plugin architecture. Docker npm package resolution is not available in the current authoring environment. Have a coding agent run the full build, then fix any compile or runtime issues found.

## 9. Next development milestones

1. **Make this revision deployable:** install deps in networked environment, `npm run build`, `npm test`, `docker compose up --build -d`; test creation (host only), join code and role after join, guest-host presentation setup, 2-player to 8-player room start, reconnect/controller handoff, timeout with unanswered input, all finales, rematch, real TV + mobile presentation separation. Add real browser tests.
2. **Finish UX:** mobile testing, precise slider pointer/keyboard semantics (throttled live updates plus guaranteed final release), finalized timed player-by-player reveal cues, improved admin GitHub-like forms, clear loading/disabled states, overflow and keyboard navigation, accessible focus/contrast. Keep Curtbox minimalist and Survey Show survey-board-inspired, avoiding copyrighted branding.
3. **Reliability/security:** explicit schema migrations, idempotency, network-lag/duplicate-message tests, role permission enforcement, room expiry with reboots, conflict tests for 8 players and multiple host displays; production reverse proxy and secrets audit.
4. **Content/art/audio:** expand and diversify the curated survey seed bank toward hundreds of genuinely fun questions, background admin discovery with provenance, original illustrative avatars, licensed/original music + effects, faithful SFX queue, synced multiplayer cues; no speech/voice system.
5. **Expand platform:** extract stable per-game modules and add more games under Curtbox game selector, keeping shared room/auth/presentation framework.

## 10. High-value acceptance tests

- Home says Curtbox; Survey Show is a game tile. Host creates room with **no code input** and receives a unique random code.
- A player joining goes **code → choose Player → name → room**. A host joining goes **code → choose Host → local host setup → public lobby**. No combined host/player role or audience option at prejoin.
- The creator host is distinct from Primary Controller; the **first player** controls Start/Skip/Return.
- Host display never shows player-only input controls. Player interface never duplicates host TV presentation.
- Dragging/releasing the percentage slider only updates a public preview. The player must press Submit to confirm a guess; they may revise and resubmit until the deadline, and even submission never ends the full countdown. No Submit at timeout => no guess and zero points, regardless of slider movement. Predictions are one-tap answers and auto-advance when **all other** eligible players have selected. Only after the sequential answer-and-points reveals does the score commit.
- Primary Controller Skip Reveal displays complete rankings and highlights on all displays; results remain until Return to Lobby.
- Questions can be loaded/reused by match without modifying an ongoing match after admin update/delete; citations show only during intended reveal.
- No voice/commentator components, settings, runtime or dependencies exist.


### Most recent build/package updates
- Project folder/package root is `curtbox/` (not `retro-survey-show/`). This may produce a fresh Docker Compose PostgreSQL volume; user explicitly approved the fresh database.
- React `useRef` TypeScript frontend compilation fix: `useRef<Session|undefined>(undefined)` in `client/src/App.tsx`.
- Curated bank now contains 302 percentage questions (130 new in the separate expanded module). Initial 172 remain untouched in ID and version.
- Full Docker build and full content editorial audit remain open acceptance checks, separate from core test/seed structural validation.


## 2026-11-20: TV lobby and locally hosted CC0 audio update

The Survey Show Host lobby now uses eight large player seats in a 4×2 grid, always-visible QR code/large four-letter room code, a highlighted first-player controller, animated player arrivals, and clear waiting/ready status. Empty placeholders are visible. The lobby deliberately has no score strip; the host presentation remains the only source for scoreboard and join information. The Player-only interface remains minimal.

The soundtrack system supports **actual self-hosted recordings** rather than only oscillator melodies. A deliberate `npm run audio:fetch` step downloads CC0 licensed music and effects, with source/creator/license documentation in `docs/AUDIO_ASSET_SOURCES.md`. Music crossfades between phases, seeks by server timeline when possible, and each Host has individual volume/mute. Short Kenney game jingles supplement effects. This environment could verify license and track catalog pages but could not obtain the actual recorded bytes; the source ZIP therefore does **not** contain third-party audio, and gameplay still has audio fallbacks. Sound-specific reaction matching remains a future polish task. No AI announcer.

### Curated emote audio sourcing (2026-11-20 addition)

The game still has 22 content-rated reactions. The current archive now **bundles 22 individually generated, playable Ogg clips** (synthesized effects with locally synthesized speech, including content-rated explicit clips); they make the soundboard audible even if external downloads never succeed. They are **not** Freesound field recordings and have not been professionally auditioned. An optional reproducible original-audio generator is `scripts/generate-reaction-fallbacks.py` (Python/numpy/scipy/espeak/ffmpeg), though prebuilt files are included. The host audio context unlocks on first user interaction and a visible Enable sound button is provided until unlocked. A separate curated list of 22 real CC0 Freesound clips is available in `docs/REACTION_AUDIO_CATALOG.md` and `docs/REACTION_AUDIO_CATALOG.json` (one distinct intended recording for every reaction, including the explicit Adults Only lines). These replace the semantic mismatch of generic UI sounds. The **real Freesound originals** are not in the archive; download originals to `assets/reaction-raw/<id>.<ext>` and use `npm run audio:reactions` (ffmpeg required) to convert/normalize/trim for the host soundboard. Existing reaction queue and rating policies remain unchanged. The reaction installer may replace synthesized clips with better recorded samples; `audio:fetch` preserves existing clips. `npm run audio:fetch` now protects installed curated reaction files instead of overwriting them with generic effects. Before release, audition/crop the actual clips and verify the authors/licenses; this environment only verified public asset pages.

## 2026-11-20 — Scoring presentation and audible emotes

The Host presentation now uses a responsive 0–100% scoring ruler with an actual-result marker, player-guess marker, colored accuracy bands or winning Higher/Lower region, and visible point thresholds. A server-supplied `revealRoster` keeps all player cards in fixed, left-to-right order without leaking unrevealed choices; `revealEntries` exposes only the already-revealed answers. Reveal starts with the actual percentage, then the initial picker’s guess/points, then each predictor’s choice/points sequentially. The server computes `explanation` with a calculation and itemized parts using the same data as the scoring engine. The UI reveals the comparison first and animates the points/formula after a delay within the player’s stage. Existing immutable score commit after all player reveals remains intact; the scoreboard animates only after commit. For non-percentage Top3/Rank finals, show the ranked answer board and numeric explanation instead of a meaningless percentage ruler.

The source ZIP includes 22 short original synthesized Ogg sound files, mapped one-to-one to the allowed emote IDs. These audible fallback assets must not be falsely represented as real Freesound recordings; the linked CC0 catalog and manual downloader remain available for superior replacements. Hosts can unlock audio by clicking **Enable sound** or interacting with the page. Player-only devices do not play host reaction audio.
