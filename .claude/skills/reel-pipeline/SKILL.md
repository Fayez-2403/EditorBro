---
name: reel-pipeline
description: The master workflow for every new reel or video in this repo (Techpe Trek reels, explainers, repo round-ups, launch reels, music-led reels). Runs the reel through all installed skills in order (brand, brief, hook, script and voice, template and motion, build in the pdoom engine, export and QA, post kit) and says which skill to load at each stage. Use whenever the user asks to make, remake, restyle, re-voice or render a reel, video, animation or short; for a small follow-up edit, run only the stages it touches.
---

# Reel pipeline (Motion as Code)

Every reel in this repo is built **in code in this repo's engine** (`app/`: pdoom-video engine, Three.js, canvas type),
with its voice, music and mix made by the Python scripts in `analysis/`. Skills guide each stage; none of them replaces
the engine. Paid generators (Higgsfield, Seedance) are optional extras, used only with the user's explicit approval.

Before anything else, read `CLAUDE.md`, `README.md`, `docs/CONTEXT.md` and the project memory (`MEMORY.md`). Keep the
rules there: never edit `app/src/engine/`; every plate is a pure function of time; check work with stills; ask before a
full or 4K render; explain each change before making it.

## Standing preferences (user)
- 9:16 Instagram reels, 1080x1920, usually under 60 s; preview on localhost:54173 (another free port if that one is taken).
- A human, young, excited male voice. ElevenLabs "Liam" (TX3LPaxmHKxFdv7VOQHJ). Hinglish narration (Devanagari Hindi for the
  voice, English words in English) unless told otherwise; captions in Roman Hinglish or English, never Hindi script on screen.
  Brand said "Tech पे Trek". Pronunciation is the user's top concern: check every take with speech-to-text.
- Exact, sourced facts only (keep a FACTS.md); demos labelled illustrative; never fake logos or UI.
- Keep earlier versions (rename to *_v1-...), never overwrite them.

## Motion direction: `motionmaxxing` (always, user's standing request 2026-10-27)
Load the `motionmaxxing` skill (`.claude/skills/motionmaxxing`, from github.com/Tejashmakwana/motionmaxxing) for every
reel, at stages 2, 4, 6 and 8:
- **Stage 2 (hook):** use its judgment and idea method (`references/judgment.md`, `idea.md`): an idea only this topic or brand
  could own, and a beat table where every beat "buys" one belief.
- **Stage 4 (template + look):** use its craft laws and measured timing (`references/motion.md`, `transitions.md`, `type.md`,
  `layout.md`, `world.md`). Land decelerates, leave accelerates. Shots hand off. Cut on motion. No dead frame. One hero per
  frame inside a built world.
- **Stage 6 (build):** keep building in this repo's engines (pdoom `app/`, or the Remotion projects) and port its eases and
  handoff patterns. Its GSAP runtime (`runtime/motion.js`) is only for HTML/HyperFrames pieces.
- **Stage 8 (QA):**
  - Run its gates on the render in addition to `reel_qa.py`: `python3 .claude/skills/motionmaxxing/scripts/look.py <video> --out
    <dir> --expect <s>` (G0, G2, G3), and judge G1 and G4 by eye on its `sheet.jpg`.
  - Write a short NOTE.md that quotes the numbers.
  - After the user reacts to a cut, append the reaction to its `taste/verdicts.md`.

Where it conflicts with this channel's rules, the channel rules win:
- **Format:** 9:16 1080x1920 at 60 fps, not its 16:9 / 30 fps default.
- **Captions:** word-level burned-in captions stay.
- **Labels:** the source credit and the "illustration" / "not financial advice" labels that FACTS.md requires stay. Keep them
  small and quiet, never as a HUD.
- **Voice:** Liam on ElevenLabs.

Everything else in its "Never ship" list applies:
- no page chrome or HUD counters, no deck layouts, no vibe-coded UI cards, no invented stats
- no slogan triplets
- no end card longer than 1.4 s

## The production contract: `docs/TECHPETREK_MASTER_REEL_STUDIO.md` (always, user's standing request 2026-10-29)
Every reel from now on follows the user's master studio file. Read it at the start, together with `motion-studio`'s section on it.
- **Start every new reel as the full folder:** `python .claude/skills/motion-studio/scripts/new_reel.py <slug> --title "..."`. That gives assets/, the 11 docs, src/, audio/, scripts/, public/, post/ and out/.
- **Fill `docs/brief.md`** (the NEW REEL BRIEF) and **`docs/factcheck.md`** before any VO.
- **Pick ONE film grammar:** NEWS_LAUNCH / SOURCE_COMPILATION / MASCOT_FILM / EDITOR_AURA / PRODUCT_DEMO / EXPLAINER.
- **Run its 12 gates.** Score every review round 1-10 in `docs/review_log.md` and fix the three worst problems.
- **Deliver its §18 report.**
- **The channel rules below still win** where they differ: Liam turbo v2.5, ask before the full render, never bake commercial songs.

## Motion studio stack: `motion-studio` (always, user's standing request 2026-10-29)
Load the `motion-studio` skill (`.claude/skills/motion-studio`) for every reel too. It comes from the user's "Motion Studio in 20 Repos" prompt pack (PDF kept in its `references/source/`).
- **What it holds:** the 16 open-source tools, the 4 motion-engineering articles, the studio method and 20 reel ideas.
- **Session start:** run `python .claude/skills/motion-studio/scripts/check_tools.py` and install any MISS.
- **Stage 1-2:** write the block brief (`guide/brief.md`: FILM, BRAND = HERO/APP/RESULT/SET, FACTS, FORMAT, TIMELINE, BEATS, LOOP, CAMERA, LOOK, SOUND, CHECKS). Pick or combine an idea from `guide/ideas.md` when the user gives only a topic.
- **Stage 4-6:** pick the renderer on purpose:
  - Remotion for explainers;
  - pdoom/Three for canvas worlds;
  - Puppeteer (`tools/motion-studio/render_html.mjs`) for UI cards and pages;
  - Blender (`blender/scene_template.py`) for a 3D hero;
  - Numba for simulations.
  One timeline feeds picture and sound. Use quintic eases and springs by object class (`scripts/motion.py`).
- **Stage 5:** synth score in numpy/scipy, a note per list item, a ducked stop before the big hit. Master with `scripts/master.py` (Pedalboard + pyloudnorm) or the project's ffmpeg loudnorm.
- **Stage 7:**
  - 4-6 look-dev stills, then a 540x960 motion check with sound;
  - after each check, write the follow-up yourself: timecode, defect, fix with numbers;
  - fix the three worst, then ask before the full render.
- **Stage 8:** `scripts/measure.py` quarters / dip / colour / strobe (and seam for loops), plus `scripts/captions.py` (faster-whisper) as a second STT opinion next to Scribe.
- **Stage 9:** optional `scripts/pack_pdf.py` (ReportLab) lead-magnet PDF for a "comment X" funnel.
- **After the reel:** a retro. Every follow-up becomes a rule in NOTE.md and in motionmaxxing `taste/verdicts.md`.

## Stages (load the named skills with the Skill tool, in order)

| # | Stage | Skills to load | Output |
|---|---|---|---|
| 0a | Scaffold (every new reel) | `motion-studio` `scripts/new_reel.py <slug> --title` (full master-studio folder); `check_tools.py` | projects/<slug>/ with docs, src, scripts |
| 0 | Brand (once per brand) | `brand-intake` (makes brand.md + MOTION.md); `higgsfield-brandkit` only if the user wants a full kit and approves credits | brand.md, MOTION.md |
| 1 | Brief + facts | `motion-studio` (block brief, idea pick, tool check); `motion-brief-writer`; research with WebSearch / WebFetch | projects/<name>/FACTS.md, BRIEF.md |
| 2 | Hook (first 2 s) | `11-social-hook` (use its hook principles; ignore its Seedance prompt format unless generating); `hyperframes-creative` (narration and beat planning) | hook line + first-frame plan |
| 3 | Script + voice | `hyperframes-creative` narration rules (write for the ear, value by line 2, numbers as spoken). Voice: analysis/grokbot_vo.py pattern (one ElevenLabs take, cut by word timestamps, placed per chapter, checked with speech-to-text) | analysis/script_<v>.py, audio/<v>/voiceover.mp3, data/<v>/lyrics.json |
| 4 | Template + look (pick by format) | explainer: `vox-explainer` / `faceless-explainer`; product or launch: `launch-video` / `product-launch-video`; 3D or character piece: `title-sequence-3d`, `02-3d-cgi` and `01-cinematic` (camera language); music-led: `music-to-video`, `10-music-video`; data or number: `animated-chart`, `milestone-reveal`; UI motion: `motion-effects`, `06-motion-design-ad`; motion rules for all: `hyperframes-animation`, `hyperframes-keyframes` | storyboard as data (data/<v>/cues.json) |
| 5 | Music + sound | `hyperframes-audio` (ducking, levels); an original score (analysis/grokbot_music.py pattern) or the user's track (`music-to-video` beat grid); foley from the cue sheet | audio/<v>/mix.mp3 at -14 LUFS, data/<v>/audio.json |
| 6 | Build in the engine | `hyperframes-core` (deterministic-render rules, apply them in pdoom); project CLAUDE.md; scene in app/src/scenes/, entry in app/src/timeline.ts | stills + contact sheets checked |
| 7 | Animatic, then final | ask before the full render; Windows: 10 s segments (projects/grok-bot-reel/SESSION-RESUME.md) | output/<name>_master.mp4 |
| 8 | Export + QA | `reel-export` (safe zones, H.264 yuv420p bt709, ffprobe); `python analysis/reel_qa.py <video>`; speech-to-text on the final mix | QA.md, social version, cover frames |
| 9 | Post kit | caption + hashtags (Hinglish, accurate claims); `higgsfield-youtube-thumbnail` for a generated cover only with approval | copyable caption |

### Optional paid generation (only after the user approves credits)
`higgsfield-generate` (images, video, audio, Virality Predictor), `seedance-auto-generate` / `higgsfield-image-auto`
(Playwright browser automation), `higgsfield-video-explainer`, `higgsfield-product-photoshoot`, `higgsfield-soul-id`.
The Higgsfield CLI is installed but needs a workspace (`hf workspace set`). Never log in or spend credits silently.
**Genjutsu** (`tools/genjutsu/`, read `docs/GENJUTSU.md` first): replaces a person or object in a real clip with a new
character (Seedance via Enhancor, plus Replicate; paid keys in `tools/genjutsu/.env`). Use only footage and references the user
owns or has licensed, never other creators' videos or real people's faces, and label the result AI-generated.

### Not for this channel
`ugc-hot-girl`, `ugc-video-auto`, `13-fashion-lookbook`, `14-food-beverage`, `15-real-estate`, `07-ecommerce-ad`,
`09-product-360`, `05-fight-scenes`, `08-anime-action`, `04-comic-to-video`, `03-cartoon`: use only if the user asks
for that format.

## Checklist before saying "done"
- [ ] Facts sourced in docs/factcheck.md (older reels: FACTS.md); illustrative labels on demo UI; docs/asset_manifest.csv rights pass (`scripts/verify_assets.py`)
- [ ] Master studio: brief yaml filled, one film grammar, review_log.md scored (8+/10, three worst fixed), §18 delivery report
- [ ] Hook works in frame 0 (no black first frame), value by line 2
- [ ] Every word of the voice checked with speech-to-text; brand pronounced right
- [ ] Stills reviewed for every chapter (no blocked shots, text inside safe zones)
- [ ] `analysis/reel_qa.py` passes; loudness -14 LUFS; frame count and size right
- [ ] motionmaxxing gates: `look.py` G0/G2/G3 numbers quoted, G1/G4 judged on its sheet, no "Never ship" items left (NOTE.md)
- [ ] motion-studio: block brief written; look-dev stills, then a low-res motion check with sound; follow-ups logged with numbers; `measure.py` quarters/dip/colour/strobe quoted; retro rules saved
- [ ] Earlier versions kept; outputs listed with paths; caption ready
