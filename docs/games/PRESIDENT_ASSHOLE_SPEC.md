# Curtbox / President / Asshole — game rules and design specification

**Consolidated November 23, 2026.** Latest user decisions take precedence over older descriptions. This specification distinguishes the established design from implementation assumptions and outstanding historical details. Current code: `shared/president.ts`, `server/src/president.ts`, `client/src/PresidentAsshole.tsx`.

## 1. Concept and configuration

Second Curtbox game. **4–8 Players**, separate Host/presenter. One ordinary 52-card deck, no jokers. All 52 cards dealt, including when the number of Players does not divide 52 evenly. Standard rank order, lowest to highest: `3 4 5 6 7 8 9 10 J Q K A 2`. Suits do not have value or hierarchy. Each hand creates President, Vice President, Citizens, Secretary and bottom position **Janitor** (President/family mode) or **Asshole** (drinking-enabled mode). Four players have no Citizens; eight have four.

Host setup options, as implemented:

- `mode`: `president` family-friendly or `asshole` drinking-enabled. Mode controls role wording and Pass = Drink default.
- `turnSeconds`, `exchangeSeconds`, `decreeSeconds`, `voteSeconds`, `graceSeconds`: independently host-configurable timers (1–300 seconds).
- `consecutiveForDecree`: consecutive presidencies needed before earning decree opportunities (1–20).
- `openingCard`: first-hand required card, default **4♣**.
- `social`: whether out-of-turn Social interruption is enabled, default **off**.
- `termDuration`: Term Limits hand duration, default **3** complete hands, adjustable by host (1–100).
- `termSelfExpires`: whether Term Limits can itself expire, default **off**. President cannot override either Term Limits host option.
- `botCount`: number of autonomous computer opponents, default **0**, adjustable by the room creator during setup/lobby before a hand is played; range **0–7**, with no more than eight total human and bot seats. At least one real human Player is required to start a hand.

A Player uses their phone to see only their hand, turn status and Play/Pass/Social where eligible. The **actual pile**, a face-up overlapping layout, is shown on the Host screen, not on Players' phones. Pile-clear cues are non-blocking and distinct from normal turns. Host shows seats, score, ranks, active decrees and timer, and does not receive private cards.

## 1a. Computer opponents (bots) — implemented November 23, 2026

**Host option:** `botCount` in the President / Asshole host settings. This is an explicit optional mode, **off by default**. A host can select 0–7 bots. A human player + bots may fill the minimum four seats; one human and three bots can start. The maximum remains eight **combined** seats. Bots have fixed IDs (`pa-bot-1` ... `pa-bot-7`) and public names (`Bot 1`, etc., automatically adjusted if a human already uses that name). Changing the count while the room is still in initial setup or lobby adds/removes seats without creating browser accounts. Changes are refused after gameplay begins. Every human must explicitly ready up for a new hand; bots are permanently auto-ready. Bots alone cannot start a hand.

**Behavior:** Bots are persisted under `room.pa.bots`, not `room.participants`. They cannot authenticate, connect via Socket.IO, hold reconnect tokens, become Primary Controller or change host settings. Their normal seat, hand, presidency, streak, rank, and decree state is otherwise identical to human players. Public presentation lists them with `BOT` by their name. Other players cannot see their private cards.

The server chooses bot actions; there is no cloud AI or browser-side game simulation. Bots obey the *same* server-side move validators as human players, make legal single/pair/triple/four-kind plays, respect opening cards and pile clears, can pass, can participate in Social if enabled, select legal return cards for ranked exchange, enact/repeal decrees when President, vote in Democracy, and break Democracy ties if President. Simple deterministic strategy currently favors low legal combinations or shedding larger groups, keeping 2s until needed; bots nominate/enact a rule from the available decree catalog and vote for the first nominated option. This is not an advertised difficulty system and should be improved later without changing the rules engine.

**Timing and persistence:** Bot decisions are queued as `botActionKey`/`botActionAt` in the authoritative room state, then processed in the existing ~350ms server tick within a room-locking database transaction. One automated action is committed per transaction with a short delay (~450–850ms) to keep presenter animations visible; server-owned phase/turn deadlines remain the final fallback. Bot timers survive process restart because they are persisted with the room. Do not move decisions into a client or let a disconnected bot block ready-up. Bots do not receive drinking prompts or acknowledgment gates, but bot plays of 2s can still trigger drinking prompts for other human players when that decree is enabled.

**Verified by dependency-light tests:** host bot count and 8-seat cap; 1 human + 3 bots first hand; no-human start prevention; bot turns, exchange, Social, decree actions, Democracy votes and ties; a complete simulated hand without client sockets; bot inability to become Primary Controller. A real multi-device/Docker acceptance run still needs to be completed.

## 2. Hand flow and participant lifecycle

Players may join while a hand is in progress but **do not receive cards until the following hand**. Newcomers are unranked until they complete a hand; they inherit no authority or ranked exchange. A completed hand records the finishing order and reassigns all next-hand roles. First Player to run out becomes President, second Vice President, second-to-last Secretary, last remaining Player becomes Janitor/Asshole automatically. The hand ends when all but one have finished; don't force the last Player to play all remaining cards.

All active Players must **explicitly ready up** between hands. The next hand begins immediately once all present eligible Players are ready, and only if at least four are present. No artificial start countdown. The hand already underway may continue with fewer than four. A disconnected Player temporarily retains seat/cards and may reconnect within host-configured grace. Explicit Leave is immediate; timed grace expiry removes the inactive Player from the ongoing hand. Full departures do not erase earned lifetime scores from the in-room leaderboard.

The initial seat order is join order. Default play and dealing direction are clockwise. **Royal Seating Arrangement / Rank-Based Seating** decree changes seat order to President, VP, Citizens, Secretary, Asshole/Janitor before each new hand. Repealing it *freezes current seating order*; it does not revert to original join order. **Reverse the Table** and **Reverse the Deal** independently reverse gameplay turn order vs distribution order.

### Dealing

First hand: randomly select starting dealer, distribute the shuffled 52 cards one by one in active dealing direction. Holder of the configured opening card (default **4♣**) leads and must include it in their opening combination.

Later hands: start dealing with previous hand's Janitor/Asshole when still present; otherwise lowest-ranked remaining Player, otherwise random. That previous low-ranked Player leads and may lead any legal combination. Unranked newcomers do not usurp that opening lead. When **Unequal Burden** is active, distribute base `floor(52 / playerCount)` cards to every Player and the remainder to the **lowest-ranked Players first**; unranked newcomers have the lowest priority rank for this purpose, with joining time deciding order.

## 3. Legal card plays and pile mechanics

Normal combinations: **one, two, three, or four cards of a single rank**. A normal response must match the last successful play's combination size and have a higher rank, **except a same-rank, same-size response is also legal and skips the next active player in play direction without clearing the pile**. The skipped player receives a **Skipped** animation on the presentation and their phone. **A successful Social is the exception: it clears the pile**, not a skip. The special auto-clear rules below (2s, four-of-a-kind, Double Trouble) remain independent and take precedence over an ordinary equal-rank skip.

> **Implementation status:** The server engine and both presenter/phone skip animations now implement this rule (PR for issue #3). Engine tests cover ordinary same-rank skips, consecutive skips, reversed direction, a finishing player, Social, and special clears. Physical multiplayer UX still requires testing.

Special automatic pile clears:

- One to four **2s** played together clear immediately.
- **Four-of-a-kind** clears immediately, regardless of whether Social is enabled.
- Two **3s** clear immediately when **Double Trouble** decree is active.
- A successful eligible **Social** clears immediately when Social is enabled.

Special clears override ordinary comparison restrictions. Cleared pile cards leave play for that hand. The clearing Player gets the next lead unless they emptied their hand; then the next still-active Player in the current play direction leads. Do not give a finished player another turn.

**Passing:** A manual Pass skips only the current turn. Passing does not permanently exclude that Player from the current pile. When every active Player other than the latest pile owner has passed since that last successful play, the pile clears and the latest owner leads again, skipping them if already finished. A Player cannot pass with an empty pile: they must lead (or the server must resolve a timed-out empty-pile lead deterministically; see implementation note).

### Optional Social

Social is an out-of-turn, speed-based completion of the four cards of the **same rank represented by the latest successful play**. Valid counts are 1+3, 2+2, or 3+1, with the current/latest playing Player and completing Player distinct. The completing Player preselects their required owned cards. The Social button **appears only with a valid selection**, not after an arbitrary click. The first valid Social event the server receives wins; no artificial pause or wait window. Passing does not close the opening; a new successful card play closes the prior Social opening. A 2, four-of-a-kind or other immediate-clear play cannot be interrupted after its atomic server commit. An ordinary equal-rank play is **not** itself an automatic clear; it skips the next active player. A successful Social still clears and leads as above.

The backend is the only authority for ownership, combination legality, clearing, Social collision resolution, turn/decree timestamps and finishing order.

## 4. Ranked Card Exchange

Exchange initially **disabled**. It is a single active decree with three possible states:

| State | President ↔ Janitor/Asshole | VP ↔ Secretary |
|---|---|---|
| Disabled | None | None |
| Level 1 | 1 card each | None |
| Level 2 | 2 cards each | 1 card each |

Presidential decree actions can advance or reduce the level **only one step per opportunity** (`disabled ⇄ L1 ⇄ L2`). It consumes **one active decree slot** even at L2. Ranked pair members must both be present; if President or Asshole left, **do not silently pair a different ranked Player instead**. Newcomers do not participate until ranked.

Lower-ranked partner automatically contributes their **highest card(s)**. The President and VP manually choose the required cards to return using **only cards from their original dealt hand**, not the newly received cards. When their host-configured exchange timer expires, the server returns the **lowest eligible original dealt cards**. Equal-rank selection ties are randomized because suits have no ranking. Each pair can independently complete. The frontend must display original-card selections and reject too many/too few or foreign cards. All transfer actions are atomic.

## 5. Presidential succession, scoring and opportunities

Each Presidency gives **one point**; cumulative Presidencies are the primary leaderboard score. Longest consecutive Presidency streak breaks leaderboard ties. Identical points and streaks share placement. Losing Presidency resets the current streak, but does not erase the longest streak.

The host chooses how many **consecutive** Presidencies unlock decree power. Upon reaching this threshold, that President receives a new decree opportunity on each further consecutive victory. Each opportunity permits **one** change (enact, repeal, or one-level modification), or Skip; no saved opportunities. If the President leaves before selection begins, they forfeit the opportunity. Host-configured selection timers apply; timeout means no change. During Democracy, the change is selected by vote instead of individual fiat, not multiplied into multiple simultaneous changes.

## 6. Presidential Decree catalog

| Key | Display name | Effect |
|---|---|---|
| `unequal_burden` | Unequal Burden | Allocate odd leftover cards low-rank first |
| `rank_seating` | Royal Seating Arrangement | Sort seats by last-hand rank before next deal |
| `reverse_deal` | Reverse the Deal | Reverse only the dealing direction |
| `reverse_play` | Reverse the Table | Reverse only the gameplay turn direction |
| `double_trouble` | Double Trouble | Exactly two 3s together automatically clear |
| `card_exchange` | Card Exchange | Disabled ⇄ L1 ⇄ L2, one level per opportunity |
| `democracy` | Democracy | The President proposes changes for voting |
| `term_limits` | Term Limits | Apply host-defined N-complete-hand expiration |
| `max_active` | Maximum Active Decrees | Restrict active decree count to a President-selected 1–10 |
| `drink_twos` | 2 = Drink | Prompt all other active Players when one or more 2s are played |
| `require_ack` | Require Acknowledgment | Block affected Player controls until prompts acknowledged |

**Historical names:** Lifetime Appointments and Maximum Active Decrees refer to evolving versions of the same constraint concept; do not add both by accident. Some earlier brainstorming included Dictatorship, Executive Order, Presidential Authority, Ranked Authority and Board Meeting. Their final effects/status could not be independently verified from the available archival source, so they are **not implemented as invented decrees** pending historical verification.

### Maximum Active Decrees

The limit is chosen from 1–10 by the acting President; the limit decree **counts itself**. Card Exchange at L1 or L2 counts only once. Lowering the limit below the number of currently active decrees **does not automatically repeal any**. It blocks *adding* another decree until room is free, but allows repeals and changes that do not increase the number of slots. A later President may modify the limit during a future eligible opportunity.

## 7. Democracy vote behavior

When Democracy is in effect, a President may nominate **two or three eligible decree changes**, including enactment, repeal, or permitted level modifications. If only a single eligible change exists, it is enacted directly without a vote. Voters select only among the nominations. Voting concludes when every eligible Player casts a vote or the host-configured deadline passes. Missing votes abstain.

- Clear plurality wins.
- Any tie for first is broken by the President choosing among tied nominees.
- If everyone abstains, President chooses among nominated changes.
- If President leaves **before** beginning the voting phase, the opportunity is forfeited.
- If President leaves **after** voting starts, the vote continues. If the tie then cannot be broken by President, select randomly among tied nominees.
- A voting timeout after a tie-break prompt is likewise resolved randomly, not stuck indefinitely.

One decree opportunity still produces at most one decree change. Normal max-slot limits still apply to nominations and enactments.

## 8. Term Limits — EXACT finalized behavior

Term Limits is an optional decree. Host configures duration **N complete hands** and whether Term Limits is subject to its own expiration. President can enact/repeal it, but cannot change N or self-expiration.

If a decree becomes effective before hand **H** with expiration duration **N**, it remains active for hands `H`, `H+1`, ... `H+N-1` and expires **before hand `H+N`** starts. Formula `expiresBeforeHand = effectiveHand + N`. Example: N=3, effective before hand 6 → active for hands 6, 7, 8 → **expires before hand 9**.

When Term Limits is enacted, this policy applies to **all other currently active decrees retroactively**, not only future decrees. Their countdowns are assigned/reassigned to the new policy. Term Limits itself receives an expiration only if host enabled self-expiration. When Term Limits is **repealed or expires**, all expiration countdowns **already attached to other decrees remain in effect** and continue running; those decrees expire at their previously scheduled hand. **New** decrees enacted after Term Limits ends have no expiration, and persist until individually repealed or a future Term Limits enactment retroactively assigns dates. Re-enacting Term Limits applies the new window retroactively, including to old active decrees with existing expiration dates.

In game implementation, Presidential decisions are made after a hand completes, with changes effective for the next hand. Example: a decree enacted after hand 5 has effective hand 6; if N=3 it has `expiresBefore=9`. Expiration is processed during **pre-hand processing before dealing**, so no expiring decree can influence the next deal/play.

**Superseded:** Term Limits being always self-exempt, or repealing Term Limits canceling existing countdowns, are both obsolete. Host-configurable self-expiration and persistent existing countdowns are final.

## 9. Drinking rules

**Asshole mode** enables manual **Pass = Drink** by default. Only the Player who deliberately taps Pass receives the notification. Automatic/timeout passes do **not** trigger it. Pass = Drink is not a Presidential decree.

**2 = Drink** is an optional decree and **not active initially**. When any Player plays one or more 2s together, every other **active** Player receives **one** prompt for that play, not one per 2. The Player who played the 2s is exempt.

Prompts are nonblocking unless **Require Acknowledgment** is active. With Require Acknowledgment, all controls on an affected Player's phone (card selection, Play, Pass, Social and other game actions) are disabled until the Player acknowledges. Other Players continue; there is **no global gameplay pause**. If their turn times out while they are blocked, the server automatically passes (and this **does not** generate Pass = Drink). The notification remains until acknowledged. The host sets the relevant timer durations, not the President. Drinking-related decrees should only be available in Asshole mode.

## 10. Presenter/player UX and joining

Presenter: full-screen card-table surface with up to eight seats, face-up overlapping pile, distinct clear cue, hands remaining, turn indicator, countdown, public rankings, active decrees, room code and on-demand QR. Every connected Host gets the same public state. No private hand cards are transmitted to Host.

Player phone: small persistent Leave button; during hand show private cards sorted by rank, selectable cards, only valid Play/Pass/Social actions and time-to-turn; **never render the actual pile**. During exchanges, show eligible original return cards and timer. During decree phase, only current President sees enact/repeal/proposal controls, others see waiting state. During Democracy, voters see nominations and own voting confirmation. Between hands show readiness, not redundant TV scoreboard. Pending drinking prompts appear locally with Acknowledge.

Player names/ranks survive reconnections. Explicit Leave forfeits current hand/card obligations but keeps points previously earned. After a completed hand, returned Player ranks are used for seating/exchange. Unranked newcomers start next hand without exchange obligations. On disconnect, preserve cards during grace; after grace or Leave remove cards and allow the hand to continue. If only one active Player remains, the hand completes with that Player in last place. Next hand still needs four. Only Primary Controller may choose End Game between hands when active count has fallen below four. Creating Host can always close the room.

## 11. Server state model and Socket.IO actions

Shared types: `shared/president.ts` (`PASettings`, `PAState`, `PAPublic`, `PADecree`, `PADecreeAction`). In the JSONB Room state, `paSettings` is host configuration and `pa` is full authoritative game state. Each per-socket `room:view` includes **sanitized** `pa` (`PAPublic`) and `paSettings`. Never send `PAState` directly to a client.

Socket actions with Socket.IO acknowledgment (`ok/error`):

| Action | Sender | Payload |
|---|---|---|
| `president:settings` | Creator Host, setup/lobby | Partial host settings |
| `president:ready` | Player, ready phase | `{ready: boolean}` |
| `president:play` | Player, play phase | `{cards: string[], social?: boolean}` |
| `president:pass` | Current Player | none |
| `president:exchange` | Ranked upper partner | `{cards: string[]}` original cards |
| `president:decree` | Current President | `{action: {kind,key,value?}}` or `{nominees: [...]}`; `{}` skips |
| `president:vote` | Voting Player or tie-breaking President | `{index: number}` |
| `president:ack` | Notified Player | none |
| `president:end` | Primary Controller, ready and Player count below four | none |

Persistent `PAStage`: `ready → exchange? → play → decree? → vote? → ready`, with `ended` for an early session conclusion. Timers are absolute server-clock milliseconds; server tick advances stages and resolves timeouts. Socket events are serialized by the existing PostgreSQL room lock and per-recipient snapshots.

## 12. Implementation assumptions and still-unverified details

**Implemented assumptions (not represented as new user decisions):** If a turn expires with an empty pile, the server auto-leads the lowest available card (or mandatory 4♣ in the first hand) rather than freezing the hand. Deadline ties resolve by transaction arrival order. Once a decree has an expiration date, increasing Card Exchange level or modifying Max Active keeps its original expiration, rather than extending it. Players who have left midhand do not receive a finishing placement for that incomplete hand.

**Unverified historical catalogue:** Earlier Dictatorship/Executive Order/Presidential Authority/Ranked Authority/Board Meeting ideas have not been restored because their final specification could not be recovered; verify them before adding. Exact presentation styling/animations, animations for equal-rank vs Social vs 2 clears, accessibility polish, nuanced disconnected fairness and full security integration still need browser/E2E tests.

**Important technical limitation at handoff:** 18 President / Asshole rules-engine tests pass; 15 Survey Show core and 20 client static checks also pass; full npm check/build/Docker and real multiplayer E2E remain **unverified** in the authoring environment. See `../ARCHITECTURE_AND_AGENT_HANDOFF.md`.


## Queued UI and sound refinements (November 23, 2026)

This is a requirement queue, **not a description of deployed behavior**. Implement with client/server regression tests and keep public Host vs private Player responsibilities separate:

- [#6](https://github.com/CrossfireCurt/curtbox/issues/6): Player Play/Social selections may include multiple **same-rank** cards, never mixed ranks. Card Exchange still permits mixed ranks.
- [#11](https://github.com/CrossfireCurt/curtbox/issues/11): Subtle card-placement sounds, **turn active** cue on current player's browser, low-time ticking before expiration, **Skipped** cue on the skipped player's phone, cheering after successful Social, **glass clink only on each affected player's browser** when instructed to drink, and a **whoosh on the presenter when a pile clears**. Respect mute, user-gesture audio unlock, idempotency, and authoritative timestamps. A Social produces a clear, not a skip; an ordinary equal-rank skip is **not** a pile clear.
- [#12](https://github.com/CrossfireCurt/curtbox/issues/12): Show the authoritative time remaining **inside the active player's square** on the public presentation (in addition to, or instead of, the global stage clock as appropriate).
- [#13](https://github.com/CrossfireCurt/curtbox/issues/13): On the public **current pile**, show **Single, Pair, Triple, Four-of-a-kind** according to the latest accepted combination, not the accumulated pile size; reset when cleared.
- [#14](https://github.com/CrossfireCurt/curtbox/issues/14): Keep valid preselected cards while waiting and when the player's turn activates; don't clear selection on `game.currentPlayerId` changes. Reset only on appropriate ownership, hand or phase transitions and successful submission.

Coordinate #11's skipped cue with [#3](https://github.com/CrossfireCurt/curtbox/issues/3), which changes ordinary equal-rank plays to skips but leaves Social as a clear. Coordinate #13 with presentation legibility [#4](https://github.com/CrossfireCurt/curtbox/issues/4) and cleared pile history [#5](https://github.com/CrossfireCurt/curtbox/issues/5).

## Readable pile, last-play combination and cleared-pile history (issues #4, #5, #13)

**Update (#31):** The public presenter restores a **single compact overlapping pile** rather than separate per-play panels. Cards are staggered so the exposed top-left corner visibly identifies their **rank and suit**; the newest accepted combination has a subtle gold edge and is lifted slightly. A long pile displays the newest six cards and a small count of older buried cards, with the entire latest combination guaranteed to be shown. The small heading incorporates the latest play's combination size, e.g. **CURRENT PILE – PAIRS (2)**; when cleared it reads **CURRENT PILE – EMPTY**. The large yellow Current Combination banner and horizontal scrolling grouped plays have been removed. This supersedes the earlier grouped-play presentation in issues #4/#13; pile history remains independent.

The **Pile History** sidebar shows the most recent cleared piles in the current hand in reverse chronological order. Each record says e.g. `Curt cleared`, gives a clear reason and shows all cards involved. Clear causes include Social, special cards, everyone passing, a player leaving and hand completion. The engine stores at most **eight cleared piles per hand** in persisted authoritative state; the next hand resets the history. This keeps old rooms bounded. For compatibility, a legacy room with an existing ungrouped pile reconstructs the latest known play while treating earlier ungrouped cards as a single group.

The public `PAPublic.pilePlays` and `PAPublic.pileHistory` fields are **Host-only**; no private cards or pile renderings are sent to players' phones. Regression tests cover normal accumulated pairs, special clears, Social, owner attribution, size bounds, per-hand reset and privacy. Physical TV readability remains a manual QA item.

## Card selection and preselection (issues #6 and #14)

A Player may preselect cards while waiting. When their turn begins, that **valid selection is preserved**; changing `currentPlayerId` must not reset it. During **Play/Social**, selected cards must all share a rank. Tapping a card of another rank **switches** the selection to that card; tapping a selected card removes it. The actual card rank is checked by the same client helper used for all Play/Social selections. Selection also filters out cards no longer in the player's private hand (to avoid accidental stale submissions).

The player-local selection resets on a **new hand**, **stage change**, or **identity change**, and after a successful play or exchange submission; unsuccessful server calls preserve selections for correction. **Ranked Card Exchange** intentionally permits returning original cards of different ranks and uses `myExchange.original` as the available list. The server continues to validate card ownership, rank, allowed action and valid plays regardless of what the client sends. See `client/src/presidentSelection.ts` and `client/tests/president-selection.test.mjs`.

## Bot turn/Social reaction latency (issue #7)

Normal bot turns now wait a randomized **1.8–3.6 seconds**; out-of-turn bot Social reactions wait a longer randomized **2.4–4.8 seconds**, giving the next human player a chance to play or complete a Social first. If another accepted play replaces the pending Social opportunity, the old bot action is invalidated and cannot fire. For very short host turn timers the bot's normal-turn wait is capped to leave approximately 450 ms for the authoritative timeout handler.

The RNG is injectable for deterministic engine tests and sampled only when scheduling a new task. The selected server deadline is persisted as `botActionAt`; reconnects, snapshots and restarts do not re-roll it. Bot actions still run through the same server validations and locked transaction as human actions. Playtest these windows with real phones and TV before refining ranges.

## Named-rank ready screen and player statistics (issue #8)

The **Ready for another hand** view on both the public presenter and player phones shows each finisher with their **named rank** (President, Vice President, Citizen, Secretary, Janitor/Asshole according to the selected mode and player count), *not* numeric place. Entries for participants who have since left remain in the completed hand results, with a "Left table" label. Players who joined too late to finish the hand are shown separately as **Unranked — Joining next hand**. Bots are clearly marked.

Each result shows **last-hand** Cards played, Piles cleared, Socials, 2s played and Passes, and **all-time** Presidencies and Best streak. The counters are persisted in authoritative room state as optional `PAState.handStats` (reset on each deal) and `PAState.playerStats` (cumulative); absent legacy counters default to zero for compatibility. A card play, pile archive, Social success, 2 played or accepted Pass updates both. A pile clear is counted once for the player who actually cleared the pile, including on end-of-hand archiving. The board/phone consumes sanitized public counters without receiving hidden cards. New hand resets per-hand counters, not cumulative totals.

Tests cover counted events, hand rollover, player history after departure, bots and public snapshot privacy. Physical phone and TV visual checks remain recommended.

## President / Asshole sound design (#11) and seat countdown (#12)

The **host/presenter** renders low-volume, original synthesized card placement sounds on accepted plays; a sweep/whoosh on cleared piles; a synthesized applause/cheer for a successful Social (combined with a delayed whoosh); and an optional skip cue. **Affected players' phones** receive only their own **your turn** cue, a single ticking click for each of the final five whole seconds of their own turn, a **Skipped** cue if they personally were skipped, and a glass-clinking sound if that specific player is instructed to drink. Never play private drink or ticking cues on unrelated devices. A successful Social is a clear, **not** a skip. The authoritative `lastPlayed`, `lastClear`, `lastSkip`, and per-player `myDrinkEvent` IDs/timestamps prevent duplicate cues on repeated snapshots, reconnect or render. Sounds expire after a short event window. All synthesis uses browser Web Audio, without external assets or rights-sensitive samples. A visible **Sounds on/off** button stores a per-browser preference and pointer/keyboard interaction unlocks audio where browser autoplay policies require it. Sound is optional; gameplay works muted or without Web Audio.

The current player's presenter `pa-seat` now contains a visible **⏱ live countdown**, using the server `turnEndsAt` and calibrated client offset (no separate client-authoritative clock). In the last five seconds it receives a clearly marked low-time style; nonactive seats display no turn timer. See `client/tests/president-sound.test.mjs` and `server/tests/president.test.ts` for routing, replay and privacy tests. Actual audio/timer usability on browsers, Android TV, and Fire TV remains a hardware QA task.


## Revised Social rule — cumulative top-rank run (issue #24)
A Social may complete the top **consecutive** matching cards even when they came from several earlier plays, e.g. a 4, a matching 4 (ordinary skip), then the two remaining 4s by another player. Valid 1+3, 2+2, 3+1, and 1+1+2 completions; an off-turn completion still needs host-enabled Social interruptions and a different previous player. Completing a four-of-kind **always** counts as Social, including four cards played on turn while interruptions are disabled. It overrides normal pile-size restrictions, clears the pile, grants the new lead, records stats/history/cheer, and archives the clear before ending a hand. The Play button becomes Social! rather than adding a separate button. In Asshole/drinking mode, every human seated at the table (including the completer and finished humans) receives one persistent drink prompt with private glass-clink cue; bots do not, and an active 2=Drink decree never double-prompts on the same Social. Older Social rules in this document are superseded by this section.


## Circular presenter, rank symbols and legal-card gating (issue #25)
The presenter positions four to eight player squares along an ellipse around the central live pile. **After the #31 visual revision**, the current combination is appended to the small Current Pile heading (e.g., PAIRS (2)) and cards are compactly staggered with exposed rank/suit corners rather than separated into big play panels. Bot seats show 🤖 rather than BOT text. Each finished player remains in their seat, gains a bright green border, and replaces their card count with current-hand rank emoji and name: 🇺🇸 President, 👨‍💼 Vice President, 🧑 Citizen, 🖥️ Secretary (desk), 💩 Asshole or family-mode 🧹 Janitor. The player's phone shows their current expected rank immediately upon finishing, based on this hand's position (never the previous hand).

The server provides current-hand `handPlayerCount`, seat `finishedPosition` and private `myFinishPosition`. A private `playRule` states the comparison rank, group count, opening-card rule and Double Trouble flag, without revealing hidden hands or public pile cards. The client disables card ranks which cannot contribute to a legal combination (including partial pairs, 2s, four-of-kind special clears, double 3s and completing Socials) and refuses incomplete selections. If an active player has no legal combination, only Pass is shown; waiting players may retain valid preselection. Card Exchange still permits mixed-rank returns. See `client/src/presidentCardLegality.ts` tests and the UI/static regression checks. Physical TV and phone visual checks remain required.

## Between-hand presenter results takeover (#28)

When the server enters `ready` **after at least one completed hand**, the host/presenter temporarily **replaces the entire circular table and sidebar** with a full-size "Last hand" results display, using the existing shared `HandResults` component. Each participant has their named rank, rank icon, hand stats, lifetime streak/presidency info, and appropriate bot/departure/unranked indications. A readiness summary shows how many seats are ready. The results are displayed for the entire between-hand Ready phase, **not dismissed by a client timer**. When the server advances to exchange, play, decree or vote, the live table automatically returns. The pre-first-hand lobby remains a table because there are no finished hand ranks. The final ended stage also retains last-hand results. Players' phone Ready screens and authoritative server ready decisions are unchanged.

## Presenter audio volume — separate music and effects (#29 follow-up)

The President/Asshole presenter shows **Music volume** and **Sound effects volume** as separate labeled 0–100% sliders, each next to its independent on/off control. Soundtrack volume is saved in `curtbox.pa.musicVolume` (default 20% and music initially off), while card, turn, tick, skip, Social, drink and clear effects share independent `curtbox.pa.effectsVolume` (default 65%). The effects slider controls the Web Audio master GainNode, immediately changing the output of all gameplay cues; the soundtrack slider directly changes the playing HTMLAudioElement's volume without restarting music. Each setting persists per browser and does not affect the other category. Player phones have an Effects volume slider but do not play background music. Browser/TV autoplay requirements still apply.


## Public presenter player-square design (#33)
The circular presenter uses **larger names** with the previous-hand rank icon or current finishing rank icon **immediately to the right of each name** (🇺🇸 / 👨‍💼 / 🧑 / 🖥️ / 💩 / 🧹); the written rank subtitle is removed. Bot 🤖 and disconnected-human indicators remain. The active-seat countdown uses the server deadline and appears **large, borderless in the seat's upper-right corner**, changing color near expiry. Instead of visible "3 cards" text, a player with three cards shows **three staggered face-down card backs** with a readable card-back design. Hands up to sixteen cards display every back; rarer larger hands use a compact overflow indicator, while the exact count remains accessible via an aria-label. Finished players retain their green-bordered square and show a Finished status with their current rank emoji beside the name, without a card stack. The circular 4–8 seat arrangement and gameplay are unchanged; real TV visual QA remains outstanding.

## Hand stats refresh, accessible music and horizontal history (#35)

The public **Last Hand** view displays one header per player containing both their **named rank/icon and name**, plus only positive-count stats: **Clears**, **🍻 Socials**, **⏭️ Skips issued** (equal-rank skips *caused by* that player, not times skipped), **Passes**, and **🇺🇸 Presidencies**. Cards played, 2s played, and best streak are removed from the UI, but the underlying historical counters remain available in state. Values of zero, missing/legacy counters, and any entire empty stat line are hidden. Server-issued skip counters update both current-hand and cumulative stats and migrate older records safely. A phone's ready/end-hand results show **only that player's** entry (or their own Unranked entry); the public presenter shows all players.

The presentation's oversized main stage title is removed, leaving a small hand/mode label and timer. The full-screen end-hand results no longer repeats a giant Last Hand title. The Presenter **Pile History** panel moves below the circle/table and shows only the **last two** cleared piles, in chronological left-to-right order (newest on the right), preserving `X cleared`, reason and card values. Server-retained pile history remains unchanged.

The **Settings** button is available to presenter hosts during play and opens one dialog containing both **Music** and **Sound Effects** toggle/volume settings, plus game-rule settings (editable only by the creator during the lobby, otherwise read-only summary). Effects on player phones are under a compact Settings disclosure. Music now has a **built-in original Web Audio fallback**: optional downloaded `/audio/music/*.ogg` files are intentionally gitignored and may be absent from Docker images; if the requested media file is missing, the presenter plays a quiet procedural music loop instead. A direct presenter gesture starts fallback promptly; generated loops respect music enablement and music volume and never play on phones. If music files exist, they take precedence once playback succeeds. The synthesized music is original, not third-party audio.

## Presenter seat header alignment (#37)
The rank emoji is **to the left of the player name**, with optional bot 🤖 after the name. The active countdown is **right-aligned on the same header row** as the rank/name and uses **exactly the same responsive font size** as the name. The timer remains unboxed, and the name truncates if needed on narrow 4–8-player layouts instead of overlapping the timer. The card-back stack remains below the header. This supersedes the previous absolute-position upper-right timer treatment.

## Presenter seat font inheritance and vertical positioning (#39)
The name and countdown must look the **same size**, not only have identical CSS rules on their immediate containers. An older `.pa-seat span` style explicitly forced the inner `ConnectionName` spans to 12px, so those spans now inherit the size from `pa-seat-player-name` to match the timer at all breakpoints. Player-seat content is now aligned toward the **top of the square**, reclaiming the previous dead space above the name; the face-down cards remain directly below the common header. Rank emoji remains left of name, timer right, and finished border/card privacy unchanged.
