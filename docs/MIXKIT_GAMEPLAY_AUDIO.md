# Licensed Mixkit sounds — President / Asshole

Two recordings from Mixkit's [crowd sound-effects catalog](https://mixkit.co/free-sound-effects/crowd/):

| Trigger | Mixkit clip | Mixkit ID | Install path |
| --- | --- | --- | --- |
| Social, on host and player | Male crowd cheering short (4 seconds) | 459 | `client/public/audio/sfx/mixkit-social-cheer-459.mp3` |
| Skipped player, on their phone only | Crowd laugh (4 seconds) | 424 | `client/public/audio/sfx/mixkit-skip-laugh-424.mp3` |

**License:** [Mixkit Sound Effects Free License](https://mixkit.co/license/modal/sfxFree/), not CC0. The license allows integration into video games, but does **not** permit distributing the sound effects individually, as stock, or with source files. Attribution is not required.

## Installation and deployment

Run `npm run audio:mixkit` to download both recordings into Curtbox's local
Vite public directory. Both files are ignored by Git. CI and the Docker build
run this before building the deployable app, which bundles the sounds as part of
the playable game.

If a sound is unavailable or the browser disallows playback, the existing
local synthesized sound remains as fallback. The host's skip cue is unchanged.

Do not commit these recordings to the public source repository or redistribute
them as standalone audio assets.
