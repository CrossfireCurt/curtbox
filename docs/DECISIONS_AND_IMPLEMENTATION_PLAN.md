# Curtbox — current planning and implementation entry point

**Updated November 23, 2026.** This short pointer supersedes the earlier monolithic handoff, which is preserved at `docs/archive/DECISIONS_AND_IMPLEMENTATION_PLAN_2026-11-20.md` for historical research. **Do not copy old implementation assumptions from the archive without checking current source.** In particular, Survey Show percentage guesses currently use an explicit, revisable **Submit** button and consume the full timer, not the old auto-commit-on-slider-release behavior.

Read in this order:

1. [`../AGENTS.md`](../AGENTS.md) — agent instructions and current status.
2. [`PLATFORM_SPEC.md`](PLATFORM_SPEC.md) — Curtbox-wide contracts and decisions.
3. [`games/SURVEY_SHOW_SPEC.md`](games/SURVEY_SHOW_SPEC.md) — complete Survey Show gameplay/design contract.
4. [`games/PRESIDENT_ASSHOLE_SPEC.md`](games/PRESIDENT_ASSHOLE_SPEC.md) — complete President / Asshole rules, decree system and edge cases.
5. [`ARCHITECTURE_AND_AGENT_HANDOFF.md`](ARCHITECTURE_AND_AGENT_HANDOFF.md) — file map, Socket.IO API, architecture, current limitations, testing and next work.
6. [`DECISION_LOG.md`](DECISION_LOG.md) — superseded decisions and unresolved issues.

**Priority:** The latest explicit user decision > current game specification > code behavior (for diagnostics) > historical archived plan. When the spec and code conflict, treat it as a bug or documented unfinished feature, not as permission to silently rewrite the rules.
