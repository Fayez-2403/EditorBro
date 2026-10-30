# 9. Case study: the EditorBro reel

The reel that introduces this repo was made with this repo. Everything below is in `projects/editorbro/`.

## The brief
- **Format:** 55 s, 9:16, 60 fps. Hinglish voice-over (ElevenLabs "Liam") and an original score.
- **The goal:** get people to fork the repo.
- **Grammar and idea:** PRODUCT_DEMO grammar; the repo is staged as a city you drive into. See `docs/brief.md` and
  `docs/factcheck.md`.

## The references
Ten reels were studied, and one idea was taken from each (`docs/references.md`):
- the road-sign welcome from the GTA VI trailer;
- object-to-world dives;
- "100% code, rendered not filmed";
- one thread fanning out into many;
- the style-switch montage;
- the editorial red disc;
- a giant key press as the hit.

Motion ideas only: no footage, logos or music.

## The hook: a GTA-style shot that is code
`web/src/world/highway.ts` is a Three.js scene with no imported assets:
- **Road and roadside:** a procedural road and barriers, instanced bushes with leaf cards, and palms with alpha fronds.
- **Infrastructure:** power lines on a catenary sag, and a gantry.
- **The truck:** a pickup extruded from its side profile, towing a giant clapperboard.
- **The billboard:** hand-painted in canvas ("WELCOME TO Editor Bro").
- **Look:** a shader sky, warm fog, shadows, bloom, and a grade with grain and a light leak.

The camera rides behind the truck, pans onto the billboard and pushes in, the same move as the trailer's 2.0-3.4 s.

At 4.35 s, the moment the voice says "ye poora scene code hai", a scan line sweeps down the frame. Behind it, every
material is swapped for a teal wireframe in a second render pass; the billboard alone becomes a hologram of its own art.
The camera then cranes up over the code world. Review rounds 1-3 (`docs/review_log.md`) took it from boxes on a grey
road to that shot, with the fixes written as numbers.

## The voice and the timeline
- **One take, checked word by word.** One Liam take (`scripts/audio/vo.py`) was checked word by word with speech-to-text.
  Two words were misheard, so the script changed rather than the expectation: "shot" was heard as "short" and became
  "scene", and "loyalty assistants" was heard as "assistance" and became "loyalty apps".
- **The take drives the timeline.** `timing.py` laid the lines on a 100 BPM grid and wrote `SCENE_TIMINGS.json`. Every
  cut, caption and sound hit reads that file:
  - "64" at 14.24 s fans out 64 real skill names;
  - "12" at 16.54 s starts the gates ticking;
  - "Fork" at 48.89 s presses the key.

## The rooms
| Scene | Built with |
|---|---|
| hook, flip | the Three.js plate captured at 60 fps, plus Remotion type ("100% CODE", `const cameraFrames = 0;`) |
| prompt | a Remotion terminal whose glow lights the desk |
| pipeline | SVG threads to the 64 skill chips, one pipeline line, the 12 named gates |
| montage | our own earlier renders cut on the spoken words, "20+ REELS", a poster wall on half beats |
| websites | the nine demo sites' reel tours on phones, a 3x3 wall, laptops |
| docs | editorial paper, red disc, the article titles, PROMPT → RENDER |
| cta | the gold wordmark, a 3D FORK key with a burst, `git clone`, then back on the road where the billboard now says FORK IT |

## Sound
`scripts/audio/score.py` builds the music and effects from `src/audio/cues.json`:
- per-scene stem energy;
- a dead stop 0.23 s before the flip, then a sub-impact on the scan line;
- ticks down the gates, paper flips on the posters;
- the biggest hit on the FORK press.

The mix is mastered to -14.2 LUFS integrated with a true peak of -2.0 dBFS.

## What we'd do differently
Every follow-up is a rule now (see the retro in `docs/review_log.md`):
- Build the hook before anything else.
- Never let a demo's dev server reload a page mid-capture.
- Check every word of the voice before cutting picture to it.
