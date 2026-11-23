# Curtbox development roadmap

**Canonical queue:** [open GitHub issues](https://github.com/CrossfireCurt/curtbox/issues). These items are **not yet implemented** unless an issue is closed after tested changes are merged.

| Order | Issue | Feature |
| --- | --- | --- |
| 1 | [#1](https://github.com/CrossfireCurt/curtbox/issues/1) | Android TV / Google TV / compatible Fire TV presenter APK, configurable Curtbox server — **first APK implementation in review; physical TV QA pending** |
| 2 | [#2](https://github.com/CrossfireCurt/curtbox/issues/2) | Disconnected-player icon next to names on public presenter screens in both games |
| 3 | [#3](https://github.com/CrossfireCurt/curtbox/issues/3) | **Ordinary equal-rank response skips the next player**, with Skipped animation on presenter + skipped player's phone; **successful Social clears instead** |
| 4 | [#4](https://github.com/CrossfireCurt/curtbox/issues/4) | Make rank/value of current overlapping pile legible |
| 5 | [#5](https://github.com/CrossfireCurt/curtbox/issues/5) | Host pile history with e.g. “Curt cleared” attribution and bounded state |
| 6 | [#6](https://github.com/CrossfireCurt/curtbox/issues/6) | Disallow mixed-rank play/Social card selections (without breaking mixed-rank exchange) |
| 7 | [#7](https://github.com/CrossfireCurt/curtbox/issues/7) | Random server-owned delay before bot turns and bot Social, human opportunity to interrupt |
| 8 | [#8](https://github.com/CrossfireCurt/curtbox/issues/8) | Next-hand ready display with **named** ranks and fun player stats |

## Already delivered

- Multi-game Curtbox, Survey Show, President / Asshole, configured bot seats and core tests.
- Connected [GitHub repository](https://github.com/CrossfireCurt/curtbox), GitHub Actions CI/CD, GHCR `:main` image; first `main` run succeeded.
- Shared agent specs, `AGENTS.md`, Docker image pull/update workflow.
- **GitHub Codespaces / VS Code devcontainer collaboration** is delivered by the PR introducing this document; deployment remains separate from dev.

## Approved gameplay correction versus current behavior

The source currently clears the pile on ordinary equal-rank responses. The user subsequently clarified that **ordinary equal-rank responses skip the next active player**, and **a successful Social clears the pile**. Other pre-existing special clears still apply. Until #3 is implemented and merged, this is a documented pending code defect, not live functionality.

## Workflow

Each issue should have one focused PR with engine/client tests and accompanying spec updates. CI must pass before merge. High-risk rule changes and TV remote UX need additional runtime testing. Roadmap order can change by explicit user instruction.

## Android TV delivery note

The Android TV source and GitHub APK build now live under `android-tv/` and `.github/workflows/android-tv.yml`; `docs/ANDROID_TV.md` documents sideloading and validation. **Do not close issue #1 until a physical Android TV/Google TV and compatible Fire TV or emulators have been validated**, including remote controls, host create/settings, URL configuration and reconnect. This is an initial sideloadable debug build rather than a fully signed store-distributed release.


## Additional President / Asshole user requests — November 23, 2026

These are **queued, not implemented**. Preserve the existing order (#2–#8) before taking these unless the user reprioritizes. A repeat of the same-rank-selection requirement has been consolidated into **existing [#6](https://github.com/CrossfireCurt/curtbox/issues/6)**, not filed as a duplicate.

| Queue order | Issue | Accepted request |
| --- | --- | --- |
| 9 | [#11](https://github.com/CrossfireCurt/curtbox/issues/11) | Card/table sounds, Social cheering, pile-clear whoosh; **player-only** turn-start/ticking/skipped cues and drinking glass clink |
| 10 | [#12](https://github.com/CrossfireCurt/curtbox/issues/12) | Show live server-authoritative turn countdown in the **active player's presenter square** |
| 11 | [#13](https://github.com/CrossfireCurt/curtbox/issues/13) | Label the **current** pile's combination as Single, Pair, Triple or Four-of-a-kind (not total accumulated cards) |
| 12 | [#14](https://github.com/CrossfireCurt/curtbox/issues/14) | Preserve the player's valid preselected cards when their turn becomes active |

### Verified source behavior relevant to these issues

- `client/src/PresidentAsshole.tsx` has a global host countdown in `pa-stage-head`, **not** an individual countdown within the active `pa-seat` ([#12](https://github.com/CrossfireCurt/curtbox/issues/12)).
- The client explicitly clears `selected` on each `game.currentPlayerId` change, causing preselected cards to disappear at turn changes ([#14](https://github.com/CrossfireCurt/curtbox/issues/14)).
- The client currently permits mixed-rank multi-selection; implement a same-rank-only picker for **play/Social**, while allowing mixed ranks for **Card Exchange** ([#6](https://github.com/CrossfireCurt/curtbox/issues/6)).
- Audio under `client/src/audio.ts` is predominantly Survey Show / host presentation. President / Asshole audio should use event-safe, locally available sounds and respect player-only cues ([#11](https://github.com/CrossfireCurt/curtbox/issues/11)).
- The live pile display has card faces, but no explicit combination-size label ([#13](https://github.com/CrossfireCurt/curtbox/issues/13)). Coordinate pile visibility and history with #4–#5.

The Android TV app was merged via [PR #10](https://github.com/CrossfireCurt/curtbox/pull/10) and its APK build succeeded; [#1](https://github.com/CrossfireCurt/curtbox/issues/1) remains open for actual device validation. The next **feature implementation** remains the cross-game disconnected-player warning ([#2](https://github.com/CrossfireCurt/curtbox/issues/2)).
