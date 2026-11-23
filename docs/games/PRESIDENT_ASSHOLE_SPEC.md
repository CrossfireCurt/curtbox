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

Normal combinations: **one, two, three, or four cards of a single rank**. A normal response must match the last successful play's number of cards and have a strictly higher rank, except that a same-rank, same-size response is valid and **immediately clears** the pile.

Special automatic pile clears:

- One to four **2s** played together clear immediately.
- **Four-of-a-kind** clears immediately, regardless of whether Social is enabled.
- Two **3s** clear immediately when **Double Trouble** decree is active.
- A successful eligible **Social** clears immediately when Social is enabled.

Special clears override ordinary comparison restrictions. Cleared pile cards leave play for that hand. The clearing Player gets the next lead unless they emptied their hand; then the next still-active Player in the current play direction leads. Do not give a finished player another turn.

**Passing:** A manual Pass skips only the current turn. Passing does not permanently exclude that Player from the current pile. When every active Player other than the latest pile owner has passed since that last successful play, the pile clears and the latest owner leads again, skipping them if already finished. A Player cannot pass with an empty pile: they must lead (or the server must resolve a timed-out empty-pile lead deterministically; see implementation note).

### Optional Social

Social is an out-of-turn, speed-based completion of the four cards of the **same rank represented by the latest successful play**. Valid counts are 1+3, 2+2, or 3+1, with the current/latest playing Player and completing Player distinct. The completing Player preselects their required owned cards. The Social button **appears only with a valid selection**, not after an arbitrary click. The first valid Social event the server receives wins; no artificial pause or wait window. Passing does not close the opening; a new successful card play closes the prior Social opening. A 2, four-of-a-kind, equal-rank or other immediate-clear play cannot be interrupted after its atomic server commit. Social clears and leads as above.

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
