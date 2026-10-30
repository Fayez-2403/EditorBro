---
name: motion-studio
description: The Tech पे Trek motion studio, from the "Motion Studio in 20 Repos" prompt pack (@0xwhrrari, Opus 5.5). It covers the full open-source stack (Blender, NumPy, Puppeteer, GSAP, Three.js, SciPy, Pedalboard, pyloudnorm, Tone.js, Remotion, OpenCV, Numba, Pillow, faster-whisper, ReportLab, FFmpeg), the 4 motion-engineering articles and the studio method behind them. That method is a block brief, one timeline every layer reads, look-dev stills then a low-res motion check, written follow-ups with numbers, measure-don't-guess checks, and a retro. It also holds 20 reel ideas and use cases. It also scaffolds every new reel as the full folder of the user's TECHPETREK_MASTER_REEL_STUDIO contract (new_reel.py). Load it for EVERY reel, video, animation, cover or motion graphic in this repo, next to reel-pipeline and motionmaxxing; use it to pick the tools, write the brief, and run the measurements before calling anything done.
---

# Motion studio (20 repos)

**Why this exists:** the user's standing request (2026-10-29) is that every reel prompt picks up this whole stack: all 16 tools, the 4 articles, the method and the 20 ideas. Reels are the only purpose of this repo.

**The source, kept forever:** `references/source/` (git-ignored, the author's text) holds three things:
- the user's PDF, `Prompt Motion Studio in 20 Repos Opus 5.5.pdf`;
- its transcription, `prompt_pack.md`: the 560-word scene prompt, the 9 follow-ups, the stack prompt, the hit table and the sound prompt;
- `x_post_and_article.md`: the 15-repo X post and the full "Motion Engineering: Build a Video Studio Around Opus 5.5" article.

Read them when you need the original wording.

**How it fits the other skills:**
- It runs inside `reel-pipeline` (stage order, and the channel rules: 9:16 1080x1920 60 fps, Hinglish Liam voice, exact sourced facts, ask before full renders).
- It runs next to `motionmaxxing` (idea, world and craft laws, plus its `look.py` gates).
- Where they overlap, the channel rules win, then motionmaxxing's craft, then this pack's method.

## The standing production contract: `docs/TECHPETREK_MASTER_REEL_STUDIO.md` (user's, 2026-10-29)
Every reel made from now on follows that file. Read it at the start of each reel.
- **Part I:** the director and engineer protocol.
- **Part II:** modules A-E (meme → silicon reveal, a thread compilation of original clips, a mascot micro-movie, editor aura, recurring patterns).
- **Part III:** the reference library.
- **Part IV:** the final checklist.

How it maps onto this repo:

1. **Every new reel is the full folder.** Run:
   ```
   python .claude/skills/motion-studio/scripts/new_reel.py <slug> --title "<Title>"
   ```
   It creates `projects/<slug>/` from `templates/reel/`, exactly the §15 tree:
   - `assets/` (inbox, originals, licensed, generated, screenshots);
   - `docs/`: brief (the NEW REEL BRIEF yaml), factcheck, asset_manifest.csv, style_guide, character_bible, shotlist, ANIMATION_GUIDE, review_log (the 1-10 scores and three worst problems), voiceover, edit_decisions, credits;
   - `src/` (compositions, scenes, components, animation, ui, audio, themes, config);
   - `audio/` (beats.json, takes, clips, sfx);
   - `scripts/`: analyze_audio.py (librosa → beats.json with the §11 fields), verify_assets.py (rights + files), generate_contact_sheet.sh (sheets, transition strips, the 360 px phone test), render.sh (voice / score / preview / final with all QA), render.mjs (resumable), stills.mjs, export_kit.py, and audio/ (vo, timing, score, align);
   - `public/` (OFL fonts, logo), `post/` and `out/`.

   It type-checks, and renders labelled PLACEHOLDER scenes until the real ones are written. Earlier reels are never overwritten.
2. **Pick ONE film grammar** (§3): NEWS_LAUNCH, SOURCE_COMPILATION, MASCOT_FILM, EDITOR_AURA, PRODUCT_DEMO or EXPLAINER. Combine it with an idea from `guide/ideas.md`.
3. **Run the 12 gates in order** (§16): VERIFY → BRIEF → REFERENCE STUDY → STUDIO SETUP (`check_tools.py`) → VOICE + AUDIO → SHOTLIST → STYLE/CHARACTER BIBLE → KEY STILLS → ANIMATIC (540x960 with sound) → BUILD → CRITIQUE (review_log.md, target 8+/10, three worst fixed) → FINISH + SHIP (after the user's OK for the full render).
4. **Truth rules** (§2, §8):
   - `docs/factcheck.md` comes before any VO.
   - Original source clips are the stars: real, credited, 1.0x, never regenerated.
   - A clip, song or person with unknown rights is a labelled placeholder that blocks only its own scene or the export.
   - X often can't be read: say so, and never describe unseen footage.
5. **Audio is the timeline** (§11):
   - a song → `python scripts/analyze_audio.py <file> --click`, then verify the downbeats by ear;
   - narration → the take's word timings.
   - Commercial songs are never baked in (see the music memory: ship an IG-music master instead).
6. **Delivery report** (§18): exact paths, ffprobe-verified runtime/size/fps/codec, scene list, VO + srt, assets with licence status, cover, caption. Be honest about what is still a placeholder.

**Where the file and the channel rules differ (the channel wins; say so in the brief):**
- **Voice:** Liam on `eleven_turbo_v2_5` (the user picked it over v3 for accent stability). The file's "ElevenLabs v3 performance version" is written as optional text only.
- **Loudness:** -14 LUFS, TP -2 dBTP is the channel master, but it is measured (`measure.py quarters`), not assumed.
- **Folder:** the project's own `out/` replaces the older `output/`; renders stay git-ignored.

**Optional extras the file names** (each needs the user's OK before install or use; installing external skills was blocked before):
- `npx remotion skills add` / `remotion-dev/skills`;
- `buildwithhanif/claude-animation-skill`;
- HyperFrames (its skills are already installed user-wide);
- the reference gallery github.com/yihui-dev/awesome-opus5-5-videos (read the prompts there when a world needs inspiration);
- Google Vids / Veo actor plates.

## 0. Check the studio is installed (once per session, 2 s)
```
python .claude/skills/motion-studio/scripts/check_tools.py
```
It prints OK or MISS with the fix command for each of the 16 tools. Install a miss before you rely on it:
- pip packages: `pip install --user ...`;
- Node libraries: `cd tools/motion-studio && npm install`;
- Blender: `winget install --id BlenderFoundation.Blender -e`.

There is no NVIDIA GPU on this machine. Blender Cycles runs on the CPU, so for 3D use EEVEE (Next) or Cycles at low samples and keep shots short (see §4).

## 1. The 20 cards: what each one does in THIS repo
| # | Tool / article | Use it for | Where it lives here |
|---|---|---|---|
| 01 | @0xwhrrari: "Motion Engineering" | the method: five layers (director, reference, timeline, renderer, critic) and gates 1-6 | `references/source/x_post_and_article.md`; applied in §2-§3 |
| 02 | **Blender** | hero 3D: mascots, clay toys, product turntables, hologram walls, real lighting and DoF | `blender/scene_template.py` (headless, resumable chunks); `blender -b --factory-startup -P ...` |
| 03 | **NumPy** | every motion and every sound as arrays: eases, springs, beat grids, synth scores | `analysis/*_music.py`, `projects/*/SOURCE/audio-src/score.py`; `scripts/motion.py` (quintic and spring curves) |
| 04 | **Puppeteer** | HTML UI, cards, search bars and titles rendered to transparent PNGs, per state or per frame via `window.seek(t)` | `tools/motion-studio/render_html.mjs`, `templates/card.html` |
| 05 | **GSAP** | UI motion and timelines in HTML plates (seek-safe, paused timeline) | `tools/motion-studio/node_modules/gsap`; motionmaxxing `runtime/motion.js` |
| 06 | @0xMovez: "How to build motion design studio with Opus 5.5 (Full-course)" | further reading (not fetched) | title only, in `prompt_pack.md` |
| 07 | **Three.js** | 3D in the browser: the pdoom engine plates, R3F apps | `app/` (engine), `projects/astra-exe/web`, `projects/aftercode/web` |
| 08 | **SciPy** | filters, reverb, resampling and envelopes for the score and SFX | used inside the `score.py` / `*_music.py` scripts |
| 09 | **Pedalboard** | compressor, limiter and FX chain on the mix | `scripts/master.py` |
| 10 | **pyloudnorm** | -14 LUFS integrated and per-quarter-second loudness | `scripts/master.py`, `scripts/measure.py quarters` |
| 11 | @0xCodila: "How to Get Money for Creating Motion Design with Opus 5.5 & Fable 5.5" | monetising: client reels, packs, the DM funnel | title only; see idea 10 and the post kit |
| 12 | **Tone.js** | synths and SFX for HTML plates and app reels (render offline with `Tone.Offline`) | `tools/motion-studio/node_modules/tone` |
| 13 | **Remotion** | video in React: the explainer reels (Genie, Cloudflare, IPO, Kimi …) | `projects/*/SOURCE` (shared node_modules from railway-ai-security) |
| 14 | **OpenCV** | catches strobing, broken and frozen frames | `scripts/measure.py strobe`, motionmaxxing `look.py` |
| 15 | **Numba** | heavy simulations precomputed to arrays: terrain erosion, particles, flow fields, crowds | `scripts/sim_erosion.py` (example) |
| 16 | @0xjmori: "Motion Engineering: One Bot, Five Departments, an Entire Studio" | the department split: director, design, motion, sound, QA | applied as the stage owners in §3 |
| 17 | **Pillow** | contact sheets, covers, the colour probe | `look.py` sheet.jpg, `scripts/measure.py colour`, cover scripts |
| 18 | **faster-whisper** | local captions and word timings; a second opinion next to ElevenLabs Scribe | `scripts/captions.py` |
| 19 | **ReportLab** | prompt-pack / carousel PDFs: lead magnets for "comment X" posts | `scripts/pack_pdf.py` |
| 20 | **FFmpeg** | encode and ship: H.264 High, yuv420p, BT.709 tags, AAC, -14 LUFS | every render script; `reel-export` skill |

## 2. The studio method (apply to every reel)
1. **Brief in blocks.** Write the BRAND / FORMAT / BEATS / LOOP / CAMERA / LOOK / CHECKS brief before any code (template in `guide/brief.md`).
   - BRAND is the swap block: HERO, APP, RESULT, SET.
   - Facts stay apart from film choices: the model may invent camera moves, never a product screen, a number or a logo.
2. **Reference analysis.** For a look reference, write a reference analysis: palette in hex, type, composition, pacing in seconds between changes, motion (snap, glide, overshoot, cut, hold), texture. Then list DO NOT COPY: their logos, copy and subjects.
3. **States and beats.** Each beat gets an entry state, an exit state and a reason to exist. UI pieces get a state list (SEARCH → RESULT → DETAIL → ACTION → CONFIRMATION). A shot that can't say why it exists is cut.
4. **One timeline.** One timeline file holds the layout and every event, and the 3D, the UI pages and the sound all read it. In this repo that is:
   - `SCENE_TIMINGS.json` + `cues.json` (Remotion);
   - `data/<v>/*.json` + `app/src/timeline.ts` (pdoom);
   - `timeline.py` (Blender pieces).
   Picture and sound cues share timestamps, never re-typed by hand.
5. **Renderer on purpose:**
   - Remotion for narrated explainers;
   - pdoom/Three for canvas worlds;
   - Puppeteer for UI cards and pages;
   - Blender for a real 3D hero.
   Mix them: cards from Puppeteer onto Blender planes, Blender renders as Remotion `<OffthreadVideo>`. Every frame is a pure function of t: no clock, no unseeded random.
6. **Weight per object class:**
   - micro UI snaps (small overshoot);
   - panels settle;
   - the camera is almost invisible;
   - headlines hit, then hold long enough to read;
   - mascots are playful.
   Quintic eases and springs come from `scripts/motion.py`. Never spring everything.
7. **Sound on the same timeline:**
   - a measured beat grid, or the VO word timings, drives the cuts;
   - a note per list item (the melody climbs as the list grows);
   - a ducked 150 ms "stop" (~18 dB under) before the big hit makes the hit the loudest moment.
   The closed-eyes test: the sound alone has a shape.
8. **Look-dev first, then a motion check:**
   - 4-6 stills as a contact sheet;
   - then the whole film at 540x960 with sound;
   - only then (with the user's OK) the full 1080x1920 render.
9. **Write the follow-up yourself** after each check: timecode, what is wrong, the fix with numbers (as in the pack's 9 rounds). Fix the three worst defects, re-render only those sections.
10. **Measure, never guess** (§5), then a **retro**: every follow-up becomes a rule. Append the rules to motionmaxxing `taste/verdicts.md` and to the project NOTE.md.

## 3. Departments: who owns each gate (from "One Bot, Five Departments")
| Gate | Department | Evidence it leaves |
|---|---|---|
| G1 references + real assets approved | Director | FACTS.md, asset list, reference analysis |
| G2 style guide + shot list approved | Design | brief blocks, STORYBOARD.md, cues/timings JSON |
| G3 representative stills inspected | Motion | contact sheet (look-dev stills) |
| G4 rough cut + contact sheet | Motion + Sound | 540x960 preview, `look.py` sheet, `measure.py quarters` |
| G5 three worst defects repaired | QA | follow-up notes with timecodes and numbers |
| G6 audio, formats, deliverables | QA + Delivery | `reel_qa.py`, `look.py`, `measure.py`, STT, post kit |

A missing real asset is a blocker: stop and ask. Never draw a convincing fake.

## 4. Recipes for each tool (copy and adapt)
- **UI cards → PNG:** write a page that reads `?state=` or exposes `window.seek(t)`. Then:
  ```
  node tools/motion-studio/render_html.mjs page.html --out frames/x --w 1500 --h 600 --states "a;b;c"
  ```
  or `--fps 60 --dur 3` for per-frame output. Transparent backgrounds, sRGB.
- **Blender hero shot:**
  ```
  blender -b --factory-startup -P .claude/skills/motion-studio/blender/scene_template.py -- --out out/blend --start 1 --end 120 --res 540x960 --engine EEVEE
  ```
  It is resumable: it skips frames that already exist. Bring the frames into Remotion/pdoom as an image sequence or as an encoded clip.
- **Numba sim:** `python .claude/skills/motion-studio/scripts/sim_erosion.py --out data/<v>/terrain.npz` precomputes the arrays; plates then sample them by t.
- **Master:** `python .claude/skills/motion-studio/scripts/master.py mix_raw.wav mix.wav --lufs -14 --tp -2`
- **Captions (local):** `python .claude/skills/motion-studio/scripts/captions.py vo.mp3 --out post/vo --lang hi --prompt "Tech पे Trek"`
  - Hinglish is weak on small models, so keep Scribe as the main STT check.
- **PDF pack:** `python .claude/skills/motion-studio/scripts/pack_pdf.py pack.json out/pack.pdf` (title, blocks, images; a lead magnet for the comment funnel).

## 5. Measurements (on the preview, then on the final)
```
python analysis/reel_qa.py <film>                                     # channel QA (size, codec, -14 LUFS, silences)
python .claude/skills/motionmaxxing/scripts/look.py <film> --out <dir> --expect <s> --expect-audio   # G0/G2/G3, sheet
python .claude/skills/motion-studio/scripts/measure.py quarters <film>        # loudness per 0.25 s; the hit should be the loudest
python .claude/skills/motion-studio/scripts/measure.py dip <film> --at 5.83-6.17 --ref 5.3-5.8    # the stop vs the riser, dB
python .claude/skills/motion-studio/scripts/measure.py colour <film> --t 2 --box x,y,w,h --want E0177A  # brand colour on the lit surface, p99, clipped %
python .claude/skills/motion-studio/scripts/measure.py strobe <film>          # one-frame luma spikes
python .claude/skills/motion-studio/scripts/measure.py seam <film>            # loops only: last vs first frame
```
Quote the numbers in NOTE.md. A check that wasn't run is reported as not run.

## 6. Ideas
`guide/ideas.md` holds 20 reel ideas and use cases for Tech पे Trek, each with its hook, format and tools. When the user gives only a topic, pick the idea whose shape fits the topic (or combine two), say which one, and build it through reel-pipeline.

## The pack's 6-point formula (keep in mind on every reel)
1. **The list is the post:** people save lists.
2. **Big, then in its place:** read once, found again.
3. **The poster is the payoff:** frame 1 or the cover already holds the value.
4. **The loop is the joke:** an endless loop gets rewatches.
5. **Dark room, lit text:** text on dark glass reads over anything. On this channel's light looks, use solid backing instead.
6. **Measure, don't guess.**
