# Curtbox — Real background music and sound assets

Curtbox uses self-hosted sound and music. **No AI announcer, TTS, or spoken host** is used. Sourced audio is downloaded once into `client/public/audio/` and packaged into the built app. The games do not request music or effects from third-party servers at playback time.

## Install

From the `curtbox/` root, on a computer with internet access and an `unzip` command:

```sh
npm run audio:fetch
npm run build
# then: docker compose up --build -d
```

**Downloader fix (November 23, 2026):** Some Kenney URLs may reply with an HTML page despite HTTP 200. `scripts/audio-archive.mjs` now verifies the ZIP signature, archive integrity, and the number of `.ogg` entries before accepting a URL; corrupt or non-ZIP responses trigger the next listed mirror. `npm run test:audio` exercises these fallback scenarios without network access. If *both* sources fail, optional effects remain unavailable but the application build does not depend on the audio fetch.

**The ZIP delivered by ChatGPT does not include third-party audio recordings.** This environment could verify publisher/license pages but could not download the audio bytes. `audio:fetch` installs those source files on **your** machine and reports any network/URL failures. Re-run safely to retry. If files are missing, the app keeps running and effects have a simple synthesized fallback, rather than failing the build. Do not interpret a working app as proof that recordings were successfully installed.

### Music tracks (all CC0)

| Installed file | Track / creator | Intended use | Verified source & license |
|---|---|---|---|
| `audio/music/lobby.ogg` | **Catchy Swing** — Doge | Lobby / scoring | https://opengameart.org/content/catchy-swing (CC0) |
| `audio/music/guess.ogg` | **Swingshot (Swing Jazz)** — Haley Halcyon | Guessing | https://opengameart.org/content/nes-chiptune-swingshot-swing-jazz (CC0) |
| `audio/music/predict.ogg` | **Jazz** — Spring Spring / Julie Damsgaard | Predictions | https://opengameart.org/content/jazz-1 (CC0) |
| `audio/music/finale.ogg` | **Chiptune Battle Music** — OpenGameArt contributor | Finale / countdown | https://opengameart.org/content/chiptune-battle-music (CC0) |

These are real published recordings, not generated notes or recreated copyrighted game-show themes. **No third-party track should be described as original Curtbox music.** The eventual signature main theme can be independently composed and substituted in a future release.

### Sound effects and stingers (all CC0)

- **Kenney Music Jingles**, 85 short recorded musical stingers, CC0: https://kenney.nl/assets/music-jingles. Used for countdown, reveal, scoring, winning, and short reactions. `audio:fetch` fetches the downloadable archive and selects several stingers.
- **Kenney Interface Sounds**, 100 button/interface effects, CC0: https://kenney.nl/assets/interface-sounds. Used for quick reactions and UI feedback. Initially, some reaction labels are represented by **generic sound effects** and should eventually be replaced with more semantically accurate source recordings.
- **Well Done** by qubodup, applause/win recording, relicensed CC0 (filename still says `CCBY3`): https://opengameart.org/content/well-done. Used for the applause reaction.
- Suggested optional future specialized effect: **Gastric Distress** by LFA, CC0 https://opengameart.org/content/gastric-distress, for a silly fart reaction. This is not currently installed by the script because it is a long WAV and needs editing into a brief one-shot.

**Rights:** CC0 permits commercial reuse without attribution, but this document preserves attribution as a courtesy and provenance record. No famous TV-show theme, Jackbox recording, or unlicensed sound has been copied. All links should be rechecked if upstream publishers alter files or license information. Recordings are *not* in the source ZIP until downloaded by the user.

### Audio behavior

- Presentation audio belongs to Host Only. Players do not hear background tracks.
- The *current music track* is chosen by phase and crossfades in ~700 ms.
- On reconnect, where a server phase-start timestamp exists, music seeks to the current point in the track rather than restarting from 0.
- Accepted reactions queue audio sequentially (1 playing plus 3 waiting, up to 2 seconds to begin). Visual reaction animations are independent of audio availability.
- The host controls music and effect volume separately in the Sound dialog; browser autoplay requires interaction to enable audio.
- The `audio:fetch` script installs the audio into Vite's `client/public/audio/`; running `npm run build` then copies it to the server's `public/audio/` and Docker builds serve it locally.

## Notes for future contributors

Asset downloads are deliberately separate from npm dependency installation so unavailable third-party hosts cannot break a Curtbox Docker build. Before replacing an audio file, keep the stable installed filename and update this document with author, URL, license, and ideally the downloaded file hash. Replace placeholder reaction effects with appropriate CC0 recordings as those are curated.

## Specific curated reaction sounds (22 emotes)

A dedicated source-to-emote catalog is now available at [REACTION_AUDIO_CATALOG.md](REACTION_AUDIO_CATALOG.md), with **individual CC0 Freesound recordings for all 22 emotes**, including the explicit Adults Only voice samples.

The old Kenney interface-sound mappings are only generic fallbacks. For accurate reaction sounds:

1. Download the originals from the 22 links in the catalog and save each as `assets/reaction-raw/<id>.<original extension>`.
2. Run `npm run audio:reactions` (requires ffmpeg) to install normalized/trimmed `.ogg` files in `client/public/audio/sfx/`.
3. If you run `npm run audio:fetch` later, it will preserve those installed curated reaction sounds.

The curated Freesound recordings are **not bundled** in the source archive; they must be downloaded by the user. Details and source authors are retained in `REACTION_AUDIO_CATALOG.json` and the Markdown catalog.
