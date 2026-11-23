# Curtbox / Survey Show — Question Style Guide

## Target feel

**Guesspionage-like: fast, simple, funny questions about the human condition.** Use its approach to subject matter and plainspoken percentage questions as a reference, but write original prompts and use independently verified survey data, not Jackbox's proprietary question/answer bank.

Reference: [Jackbox Games — Guesspionage](https://www.jackboxgames.com/games/guesspionage) describes questions about everyday habits and awkward human behavior. This is the direction, **not** a request to reproduce existing commercial questions, artwork, audio or answers.

Curtbox Survey Show should feel like a conversation starter. Players should immediately have a personal reaction such as "Wait, do people really do that?" Examples of our **original** source-backed prompts:

- What percentage of Americans think a hot dog counts as a sandwich?
- What percentage of American cat owners consider themselves servants to their cats?
- What percentage of Americans wash their underwear after every single wear?
- What percentage of Americans believe Bigfoot definitely or probably exists?
- What percentage of Americans have stood somebody else up on a date?
- What percentage of Americans think bringing an uninvited guest to a holiday party is unacceptable?

Avoid dry survey-panel statistics, repetitive demographics, abstract technology adoption, broad political polling and questions whose answers aren't funny, personal, or surprising. A narrower but entertaining verified bank is better than hundreds of interchangeable dull questions.

## Playable prompt requirements

1. **Go straight to the question.** Prefer `What percentage of ...?` (or a similarly obvious percentage question). No "According to...", "In a 2025 YouGov poll...", "Researchers found..." or other source/poll introductions.
2. **Keep it short, naturally.** Aim around 8–18 words when possible. Validation permits 6–25 words. The former 15-word minimum is deliberately retired because it encouraged padding; no invented words just to hit a length target.
3. **Say who was surveyed.** Preserve a meaningful denominator, e.g. American adults, pet owners, married adults, or people who watch horror movies. Don't generalize a subgroup to everyone.
4. **Keep the real survey's answer condition.** "Love" is not the same as "like or love"; "definitely or probably would" is not the same as "might". Likewise preserve "at least weekly", "never", "ever", and other thresholds.
5. **Include dates only when meaningful.** Historical questions or time-bound intentions may need a year, but present-day food/behavior opinions generally don't need a publisher or survey year in the prompt.
6. **Cite separately.** Store publisher, year, survey population, dates, methodology, original question wording *if actually available*, and URL as metadata. Display publisher/year beside the revealed answer; detailed source info is available to players only during the relevant answer reveal.
7. **Do not manufacture percentages.** A catchy topic without a sourced figure stays an editorial candidate, not a playable question.
8. **Respect content ratings.** Family, Standard, Adults Only apply to question wording and subject, not merely emoji/reactions.

## Editing and upgrades

- Edit the **published** question bank by creating a new `version` under the same stable `id`, never silently mutate an active match's snapshot.
- Bundled seed v2 contains the direct-prompt rewrite of the 172 curated v1 questions (plus two finale prompts), with **unchanged answer values and source citations**.
- Server startup migration upgrades unchanged published seeded v1 rows to v2. It skips admin-modified, manually disabled, or hard-deleted questions; active matches retain their own frozen snapshots.
- The earlier generic `pew-*` corpus is retired on a one-time migration and can be re-enabled by an administrator later without the startup migration repeatedly disabling it.
- Future content growth should use more independent survey findings with genuinely entertaining behavioral prompts rather than mechanically generating scores of demographic variants of the same dry question.
