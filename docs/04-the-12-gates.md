# 4. The 12 gates

Every reel passes twelve gates, in order (`docs/TECHPETREK_MASTER_REEL_STUDIO.md` §16). A gate is passed when its output
exists and has been looked at, not when someone says it's fine.

| # | Gate | Output in the reel folder | Passed when |
|---|---|---|---|
| 1 | **VERIFY** | `docs/factcheck.md`, rights in `docs/asset_manifest.csv` | Every claim has a source row; every asset has a licence status |
| 2 | **BRIEF** | `docs/brief.md` (YAML + block brief + beat table) | Each beat names the one belief it buys |
| 3 | **REFERENCE STUDY** | `docs/references.md`, contact sheets | One idea per reference, written down; nothing copied |
| 4 | **STUDIO SETUP** | `check_tools.py` output, `npm install` done | All the tools the reel needs report OK |
| 5 | **VOICE + AUDIO** | `audio/takes/`, word timings, `public/audio/mix.wav` | Every word STT-checked; the mix at -14 LUFS, true peak ≤ -2 dBTP |
| 6 | **SHOTLIST** | `docs/shotlist.md`, `SCENE_TIMINGS.json` | Every shot has a time, a camera move and its sound |
| 7 | **STYLE / CHARACTER BIBLE** | `docs/style_guide.md`, `docs/character_bible.md`, `src/themes/tokens.ts` | Colours, type and materials are locked as tokens |
| 8 | **KEY STILLS** | `out/wip*/` stills + sheet | One accurate frame per shot, reviewed |
| 9 | **ANIMATIC** | `out/<slug>_v1_preview_540x960_60fps.mp4` | Watched with sound; pace and intelligibility OK |
| 10 | **BUILD** | the scenes in `src/` and the captured plates | Deterministic: the same t gives the same frame |
| 11 | **CRITIQUE** | `docs/review_log.md` | Every category 8/10 or better; the three worst fixed and re-rendered |
| 12 | **FINISH + SHIP** | the final render, `post/caption_final.txt`, cover, delivery report | QA passes; the user approved the full render |

## How a review round is written
```
## Round 2: look-dev stills + the 4.2 s motion check
| Category | Score |
| Opening hook clarity and strength | 7 |
| Composition, camera continuity, depth | 8 |
...
Three biggest problems:
1. 0-1 s: the truck reads as boxes -> extrude a side profile with wheel arches, glass, a chrome bumper
2. all: golden hour still mild -> sun elevation 0.24 -> 0.15, warm light leak from the left
3. 3.9 s: end frame holds -> 4.0 s scan line flips the world to wireframe
```
Numbers, timestamps and fixes. "Make it pop" is not a fix.

## What the checks look for
- **Opening 0-3 s:** is the hook clear with the sound off?
- **Each scene's midpoint and each transition ±6 frames:** no jumps, no dead frames.
- **A 360 px phone test:** can every word be read at that size?
- **A silent watch-through**, then an audio-only listen.
- **The final CTA:** on screen long enough, inside the safe zone.

Next: [engines](05-engines.md).
