# Curtbox — curated real reaction sound effects (22 emotes)

Each entry below points to an **individual real sound recording** on Freesound, marked **Creative Commons Zero (CC0)** by its uploader. The goal is to replace the old generic interface noises with specific, recognizable comic/game-show effects. These are source-page candidates for upgrading the bundled synthesized sounds; **the linked third-party recordings have not been downloaded, auditioned, or bundled by this environment**. The source archive already includes 22 original synthesized Ogg sound effects with matching filenames, so emotes play immediately even without these replacements. Listen to the previews and confirm the CC0 indication before using them.

## Download and install

1. Visit the linked Freesound page for each reaction (Freesound may require a free account to download the original media).
2. Download the original recording and save it under `assets/reaction-raw/` **using the ID in the table as its filename** — for example `assets/reaction-raw/crickets.wav`, `assets/reaction-raw/womp.mp3`, `assets/reaction-raw/finger.wav` (preserve its actual extension). Do not rename an MP3 to `.ogg` without conversion.
3. Install **ffmpeg** if needed (`brew install ffmpeg` on macOS).
4. Run `npm run audio:reactions`. The script will convert the recordings to Ogg Vorbis, normalize volume and trim them to brief one-shots, saving `client/public/audio/sfx/reaction-<id>.ogg`.
5. Run `npm run build` and `docker compose up --build -d` to bundle/serve the recordings locally.

Run `npm run audio:reactions -- --check` to see which named source files have been collected. Existing curated `.ogg` effects are preserved by `npm run audio:fetch` and can be replaced by running `audio:reactions` again. **Download and installation are manual** because Freesound does not offer a reliable unauthenticated direct link for the original audio file; this repository does not contain the raw recordings.

## Sound inventory

| Emote | Filename ID | Chosen recording | Creator | Trim cap | License |
|---|---|---|---|---|---|
| Crickets | `crickets` | [cricket](https://freesound.org/people/profquad/sounds/755751/) | profquad | 3s | CC0 |
| High Five | `highfive` | [Slap/Clap Sounds](https://freesound.org/people/gettinsomegamesounds/sounds/848990/) | gettinsomegamesounds | 1.3s | CC0 |
| Aww | `aww` | [aww.wav](https://freesound.org/people/phmiller42/sounds/124996/) | phmiller42 | 3s | CC0 |
| Mind Blown | `mindblown` | [Short Explosion.wav](https://freesound.org/people/animationIsaac/sounds/207322/) | animationIsaac | 2s | CC0 |
| Hmm | `thinking` | [Hmm reflexion male voice thinking](https://freesound.org/people/daalvinz/sounds/394231/) | daalvinz | 3s | CC0 |
| Womp Womp | `womp` | [Womp Womp on Muted Cornet](https://freesound.org/people/Paloma.SSSS/sounds/841370/) | Paloma.SSSS | 5s | CC0 |
| Wrong! | `wrong` | [buzzer.wav](https://freesound.org/people/Philip_Daniels/sounds/259290/) | Philip_Daniels | 2s | CC0 |
| Nailed It | `nailed` | [Quiz Gameshow Correct Ding 04.mp3](https://freesound.org/people/craigscottuk/sounds/644942/) | craigscottuk | 2s | CC0 |
| Applause | `applause` | [applause001.mp3](https://freesound.org/people/tec_studio/sounds/361552/) | tec_studio | 4s | CC0 |
| Awkward | `awkward` | [Record Scratch](https://freesound.org/people/florianreichelt/sounds/683322/) | florianreichelt | 2s | CC0 |
| Ooooh | `oooh` | [Gasp 2 with wonder.wav](https://freesound.org/people/jayfrosting/sounds/333398/) | jayfrosting | 2.5s | CC0 |
| Celebrate | `celebrate` | [party horn 1/3 clean](https://freesound.org/people/vewiu/sounds/379617/) | vewiu | 2.5s | CC0 |
| Drumroll | `drumroll` | [Drum Roll, Please!](https://freesound.org/people/HoBoTrails/sounds/424927/) | HoBoTrails | 4s | CC0 |
| GOAT | `goat` | [Single Goat Bleating 2x](https://freesound.org/people/Kinoton/sounds/581240/) | Kinoton | 3s | CC0 |
| Facepalm | `facepalm` | [sigh, groan.WAV](https://freesound.org/people/Flash_Shumway/sounds/114725/) | Flash_Shumway | 2.5s | CC0 |
| Poop | `poop` | [Fart 3](https://freesound.org/people/Breviceps/sounds/446000/) | Breviceps | 2s | CC0 |
| Barf | `barf` | [Vomiting.MP3](https://freesound.org/people/emilyzitek/sounds/615890/) | emilyzitek | 3s | CC0 |
| Burp | `burp` | [Short Burp](https://freesound.org/people/ldsqui/sounds/845630/) | ldsqui | 2s | CC0 |
| Woozy | `woozy` | [comedy hiccup.wav](https://freesound.org/people/martian/sounds/202800/) | martian | 2s | CC0 |
| Middle Finger | `finger` | [Fuck You.wav](https://freesound.org/people/pyro13djt/sounds/332132/) | pyro13djt | 2s | CC0 |
| WTF | `wtf` | [Me Saying WTF](https://freesound.org/people/Fabrizio84/sounds/458000/) | Fabrizio84 | 3s | CC0 |
| Bullshit | `bullshit` | [bullshit.wav](https://freesound.org/people/macdaddyno1/sounds/133778/) | macdaddyno1 | 3s | CC0 |

## Integration and licensing notes

- The existing host audio hook plays the installed `reaction-<id>.ogg` files. Player devices only trigger reactions; they do not play the shared soundboard.
- The current server-enforced reaction cooldown/host playback queue remains unchanged (1 sound playing + up to 3 waiting; audio that cannot begin within 2 seconds is discarded).
- For Adults Only emotes, the original audio contains explicit speech. The room content rating filters which reactions can be sent.
- These sources are all listed as CC0 on their Freesound pages. Keep this inventory for provenance even though CC0 does not require attribution. **Check that any reused sound really is uploader-owned/CC0 before distribution**; a public-domain license label alone is not a guarantee the uploader had rights to everything they posted.
- A few source recordings are longer than a single effect or contain multiple samples. The installer trims to the first few seconds, but **you should listen and select a better excerpt if the desired sound occurs later in the clip**. The installer does not analyze or choose excerpts automatically.
- No real Freesound recordings from this list were embedded in this distribution. The bundled files are original synthesized placeholders (including locally synthesized spoken lines). Avoid claiming the referenced external recordings are already downloaded.
