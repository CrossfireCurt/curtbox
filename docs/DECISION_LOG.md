# Curtbox — authoritative decisions, superseded plans and open verification

**As of November 23, 2026.** Use this to avoid re-asking settled questions or implementing obsolete proposals. The user's latest explicit decision has highest precedence; see game specs.

## Platform / identity — agreed

- Curtbox is the **platform**, not the name of a particular game; Survey Show is Game 1 and President / Asshole is Game 2.
- Host and Player are separate roles on separate browser sessions/devices, no combined role. Host TV presentation and Player phone controls stay separate. Room codes are generated, random four-letter uppercase strings.
- Host creator controls initial settings, first Player is initially Primary Controller; user sessions restore with reconnect tokens; room state is authoritative and persisted server-side in Postgres.
- Minimal original retro Curtbox aesthetic with calm GitHub-like controls; game-specific presenter styles. No AI announcer, speech synthesis or copyrighted visual/audio replication.

## Survey Show — latest decision beats archived plan

- **Current:** Percentage slider movement **previews**; explicit Submit confirms; can change and resubmit until deadline; full timer always runs; no answer if Submit never pressed. Prediction choices immediately lock and may end early when everyone answers.
- **Superseded:** Older Nov 20 monolithic planning handoff says slider release auto-commits and all input phases can end early. That is **not** current source behavior. The archive is retained for context, not as a fresh implementation mandate.
- Current game has two regular rounds, one selected finale (Top3/Rank/Showdown), server-owned score math, delayed atomic point commit after sequential Host reveals, co-winners on tied first score and concise source attribution.

## President / Asshole — finalized and not to reopen

- **Deck:** 4–8 Players; standard full 52-card deck; all cards dealt, uneven hands allowed. 3 low, 2 high; no suit rank.
- **Combinations:** singles/pairs/triples/four of same rank; **ordinary equal-rank matching-size play skips the next active player (with Skipped animations on both presenter and skipped phone), not a clear**; **successful Social clears instead**. Other independent clears (2s, four-kind, active Double Trouble) remain intact. Social completion 1+3 / 2+2 / 3+1 is preselected and first server success wins; no artificial interruption period. **Correction accepted Nov 23, 2026; engine/UI implementation still pending in [issue #3](https://github.com/CrossfireCurt/curtbox/issues/3).**
- **First lead:** host-selected opening card, default 4♣, must be included in the first play. Later leads start from previous Janitor/Asshole when present, otherwise lowest available ranked Player.
- **Direction:** default clockwise; reverse-dealing and reverse-playing are independent decrees.
- **Seating:** initial joining order; Rank-Based Seating only while decree active; repealing freezes current arrangement, not a rewind.
- **Scoring:** cumulative Presidency points; longest continuous streak tiebreaker; equal values share placement.
- **Readiness:** all active Players ready each hand; deal instantly at >=4; existing hand may continue below four; late joiners enter next hand only.
- **Card Exchange:** disabled→L1→L2, one level per decree opportunity, one slot total; lower automatically surrenders highest, upper selects return from original dealt hand only, fallback lowest originals after host-defined timer.
- **Presidential Decree opportunities:** host-selected consecutive presidency threshold, one eligible change/skip per opportunity, no saved actions; timeout skips.
- **Democracy:** President selects two or three proposals (or one direct when only one eligible change exists), Players vote, President breaks ties, random tie resolution if President departed, uncast = abstain, President departure before voting forfeits opportunity.
- **Maximum Active Decrees:** current cap includes the cap decree itself; changing cap never automatically repeals anything; cannot add above cap; existing modifications and repeals permitted.
- **Term Limits:** N exact complete hands, expires **before** hand H+N after becoming effective before hand H; retroactive to all active decrees, with host-configurable self-expiration. Repealing/expiry of Term Limits **does not cancel** countdowns already attached to other decrees. Decrees enacted after Term Limits ends are permanent until another activation retroactively applies. This is the latest November 23 decision.
- **Drinking:** manual Pass = Drink in Asshole mode, no drink from automatic passes; 2 = Drink optional decree, one prompt to every other active Player; Require Acknowledgment optional blocking of affected Player's personal controls, not all Players. No forced pause for the table.

## Superseded specifically

| Old assumption | Final behavior |
|---|---|
| Political Experience is decree eligibility | Consecutive Presidency streak threshold |
| Each Card Exchange level is a separate decree | One decree, progressive levels, one slot |
| Term Limits always exempt from its own expiration | Host determines self-expiration setting |
| Repealing Term Limits cancels remaining expiry dates | Already assigned countdowns continue |
| Each pass (including timeout) triggers drinking | Manual Pass triggers only |
| Rank-Based Seating repeal reverts to join order | Seat order freezes at its current configuration |
| Expiration after following hand | Expire before first hand not covered by N complete hands |
| Survey Show percentage slider auto-commits on release | Explicit revisable Submit with full countdown |

## Not conclusively recovered from planning history

**Do not guess new mechanics:** final status/effects of the earlier exploratory decrees Dictatorship, Executive Order, Presidential Authority, Ranked Authority, Board Meeting. Exact detailed animations and a few simultaneous-event ordering edge cases. See `games/PRESIDENT_ASSHOLE_SPEC.md` Section 12 and `ARCHITECTURE_AND_AGENT_HANDOFF.md`.

## Explicit implementation assumptions awaiting endorsement

- Automatic lowest-card lead if the current Player's timer expires while leading an empty pile. Necessary for forward progress, but no recovered explicit user selection governs this exact case.
- Original expiration date persists when an existing expiring decree is **modified** (such as raising Card Exchange from L1 to L2). This prevents upgrades from silently extending the old expiration but should be verified against planning history.
- A Player who explicitly leaves before finishing a hand does not earn that hand's rank, but retains earned historical Presidency points.
- Early End Game below four Players changes the in-room stage to `ended` rather than deleting the room; the creating Host still controls final room close.

## Test and deployment state

18 President / Asshole, 15 Survey Show core and 20 client static/route tests pass (53 total) using the dependency-light runner. Engine-only TypeScript semantic check passed with globally provided Node typings. The authoring machine lacked a working npm dependency installation, so **full frontend/server compile, real Postgres, Docker and browser E2E are unverified**. See `ARCHITECTURE_AND_AGENT_HANDOFF.md` for the precise acceptance path.

## New accepted feature: configurable President / Asshole bots (November 23, 2026)

- The host can optionally add automated computer players. The implementation selects `botCount=0..7`, default zero; all seats together must fit the 4–8 player rules and **at least one human** is mandatory. This implementation detail is recorded separately from the previously finalized core card/decree rules.
- Bots behave like real Player seats for deals, ranks, score, legal turns, Card Exchange, Social and Democracy. They ready automatically and never require browser sockets. The server remains authoritative. Bots do not hold authentication tokens or host/Primary Controller permissions.
- Bots use a simple first-pass heuristic, **not** a difficulty level or any hosted AI service. Bot drinking prompts are suppressed; affected humans still receive them if a bot plays 2s.
- Only President / Asshole includes bots in this release. Survey Show bot gameplay would require separate decisions and implementation.
- GitHub workflows/releases and Docker update configuration were added in the subsequent CI/CD release, pending real GitHub execution. Still queued: Virtual Code collaboration setup; Android TV host app APK; disconnected-player warning icons for all presenter views.


## Release and hosting delivery decisions (2026-11-23)

- **Finalized deployment approach for the initial GitHub setup:** GitHub Actions for builds/tests, GitHub Releases for compiled downloadable tarballs/checksums, GHCR for application Docker images. Main publishes a development `:main` image after checks; version tags publish immutable named versions and stable `:latest`. Database stays a persistent Compose volume; a pull-only Compose file and explicit update script avoid local rebuilding.
- **Implementation limitation:** GitHub repo creation/push and live pipeline execution require the user's GitHub credentials/network. CI/CD files have been added but no remote configuration was performed by this assistant.
- **Follow-on queue (still unimplemented):** collaborative code iteration environment, Android TV presenter APK with configurable server URL, presenter disconnect indicators platform-wide.
