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
