# Curtbox — build and audio-fetch troubleshooting

**Revision: November 23, 2026.** Follow-up to the first user-run build of President / Asshole. This document records *observed* failures, the code changes supplied, and what is not yet verified.

## Observed build failure

`npm run build` failed with `TS18048: 'game.vote' is possibly 'undefined'` in `client/src/PresidentAsshole.tsx`, Democracy voting UI. `docker compose up --build -d` then failed at its `RUN npm run build` stage with the same error. This is not a Docker-specific failure.

### Fix

`PresidentAsshole.tsx` captures `const vote = game?.vote` before the component's early loading return. The vote block checks `vote` and uses that *immutable local reference* in both the outer JSX and nested `.map()` callback, including `vote.tieIndices`, `vote.votesCast`, and `vote.myVote`. This avoids TypeScript losing the narrowing of mutable `game.vote` across a callback.

### Validation still required

The author's sandbox has global `tsc` but cannot install npm packages (no npm registry DNS). Accordingly the full React TypeScript/Vite and server builds were not independently verified after the fix. On your machine:

```sh
npm run check
npm run build
npm test
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 app
```

If a new failure appears, treat it as a new diagnostic; do not assume this corrected TS18048 was the only blocking error across both workspaces.

## Observed audio warnings

`npm run audio:fetch` downloaded four background `.ogg` tracks, but both Kenney archives printed `Invalid ZIP` after reporting 14–15 KiB downloads. The previous `downloadFirst` helper selected the first *HTTP-successful* response without checking ZIP content and `unpack` only validated that chosen response. Some CDNs serve an HTML challenge/error page with HTTP 200.

### Fix

`scripts/audio-archive.mjs` contains a testable `unpackAudioArchive` function. It checks ZIP magic, runs `unzip -tq` integrity verification, unpacks and verifies at least five `.ogg` files **for every source**. Invalid/corrupt/HTML responses are logged and the backup OpenGameArt URL is attempted. Only valid archives are accepted. Temporary downloads are cleaned up on failure. `scripts/fetch-audio.mjs` imports this helper.

Run:

```sh
npm run test:audio   # 3 network-independent tests; expects unzip and zip
npm run audio:fetch # optional; can still fail if every remote source is unavailable
```

Audio downloads are optional: they are not required for the production build. If *both* sources are blocked by your network, download the CC0 archive manually from https://opengameart.org/content/85-short-music-jingles or https://opengameart.org/content/interface-sounds and add the chosen source files using the documented filenames. Do not assume a 200 status proves an actual ZIP was received.

## npm install scripts warnings

The log listed four install scripts awaiting npm approval (argon2, two esbuild versions, fsevents). These are separate warnings, **not the TS18048 failure**. If a native dependency later fails to install or load, review `npm install-scripts ls` and approve the relevant package under the package manager's security workflow. Avoid broad script approval without inspection.

## Test evidence in this sandbox

- `npm run test:president:pure`: 18 pass.
- `npm run test:pure`: 20 pass (combined lightweight checks).
- `npm run test:audio`: 3 pass.
- Full dependency-backed build, Docker/Postgres startup, and browser E2E: **not independently run here**.
