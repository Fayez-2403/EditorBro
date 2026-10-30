# Brief: EditorBro: Welcome to the Studio

Created 2026-10-30 from the motion-studio reel template. Filled 2026-10-30.
- **The contract:** `docs/TECHPETREK_MASTER_REEL_STUDIO.md` (repo root).
- **The block brief method:** `.claude/skills/motion-studio/guide/brief.md`.

## NEW REEL BRIEF
```yaml
project_title: "EditorBro: Welcome to the Studio"
subject_and_angle: "The user's own studio repo (motion-as-code, published as EditorBro): one prompt to Claude Code (Opus 5.5) runs 64 skills, one pipeline and 12 gates and ships reels, 3D, apps and websites. Shown as a city you drive into."
primary_source_urls:
  - "this repo (git HEAD 62d8278 + working tree, counted 2026-10-30)"
  - "docs/TECHPETREK_MASTER_REEL_STUDIO.md §16 (the twelve gates)"
secondary_reference_urls:
  - "Assets/gta 6 reel to refer to.mp4 (road-sign welcome, 2.0-3.4 s)"
  - "docs/references.md (9 reels, one idea each)"
mode: PRODUCT_DEMO
idea: "the repo is a city: drive in past a painted welcome sign, and every district is something it builds (an object-to-world dive)"
runtime_seconds: 55
runtime_max_seconds: 60
format: "9:16"
resolution: "1080x1920"
fps: 60
language: "Hinglish"  # Devanagari TTS, Roman captions
voiceover: "ElevenLabs Liam (TX3LPaxmHKxFdv7VOQHJ), eleven_turbo_v2_5, hi, speed ~1.12; every word STT-checked"
soundtrack: "ORIGINAL"  # synthesized score, ducked under the voice, hit on the wireframe flip and the Fork press
hook: "0-4 s: a GTA-trailer-style golden-hour highway; the camera pans onto a painted billboard 'WELCOME TO Editor Bro'. 2.6 s VO: 'Ye GTA 6 nahi hai…' 4.0 s the world flips to wireframe: '…ye poora shot code hai.'"
core_reveal: "One prompt + this repo = a whole studio (reels, 3D, apps, websites). Fork it."
scene_count: 7
featured_source_videos: []   # our own renders only; no third-party footage in the montage
visual_style: "Cinematic golden-hour 3D world → wireframe 'code' world → dark desk with a glowing terminal → editorial grid → back to the road"
actor_reference_images: []
mascot_or_character_reference_images: []
logo_file: "none (EditorBro wordmark is set in Fraunces on the billboard; no Tech pe Trek logo on screen)"
preferred_cta: "Fork / clone github.com/Fayez-2403/EditorBro + 'Comment EDITOR' for the link"
post_caption: true
cover_image: true
budget: "FREE-FIRST (no paid generation; ElevenLabs only)"
licensing_requirements: "Only owned media. Reference reels are study material only. Demo sites are fictional brands. Track everything in docs/asset_manifest.csv"
critical_constraints:
  - "'100% code' is said only about shots that are code (the hook and the code-built shots)"
  - "every number on screen is counted from the repo (docs/factcheck.md)"
  - "no Rockstar/GTA art, logo, font or name on screen; the sign is our own design"
  - "the public repo ships our skills only; third-party skills are linked"
  - "ask before the full 1080x1920 render"
```

## Logline
A viewer thinks they are watching a new GTA trailer, discovers the whole shot is code, and learns that one repo, EditorBro,
turns a prompt into reels, 3D, apps and websites, and that they can fork it.

## Block brief (motion-studio)
- **FILM:** a 55 s, 9:16, 60 fps Hinglish product demo of a code repository, with the repo staged as a place.
- **BRAND:**
  - **HERO:** the EditorBro billboard / wordmark.
  - **APP:** Claude Code in a terminal.
  - **RESULT:** our real renders and the nine demo sites.
  - **SET:** the highway, the desk, the editorial page.
- **FACTS:** `docs/factcheck.md` F1-F10. Counts as of 2026-10-30.
- **FORMAT + RENDERER:**
  - Three.js (the highway world, wireframe flip, 3D devices, Fork key), captured with `web/scripts/capture.mjs` through `seek(t)`;
  - the demo sites captured in their `?reel=1` mode;
  - Remotion assembles the reel, type and captions;
  - numpy/scipy score, mastered with `master.py`.
- **TIMELINE:** one `SCENE_TIMINGS.json`; the VO word timings place every cut.
- **BEATS** (each buys one belief):

| # | t (s) | Shot | VO (Roman draft) | Belief bought | Reference idea |
|---|---|---|---|---|---|
| 1 | 0-4.0 | Highway: truck with clapperboard, pan to the billboard, push in | (2.6) "Ye GTA 6 nahi hai…" | "Is this the GTA trailer?" | GTA road sign |
| 2 | 4.0-6.0 | Scan line flips the world to wireframe; "100% CODE" card | "…ye poora shot code hai. Camera se ek frame nahi." | It is code | Miftahul |
| 3 | 6.0-14.0 | Dark desk, the terminal glow lights the room; one prompt line fans out into skills → pipeline → 12 gates ticking green | "Main ek prompt likhta hoon. Claude Code mera repo chalata hai: 64 skills, ek pipeline, 12 quality gates." | There is a real system | Akshay, Anmol |
| 4 | 14.0-26.0 | Style-switch montage of our own renders, a new medium every ~0.6 s on the beat | "Reels, 3D, cartoons, data films, perfume ads. Bees se zyada reels, isi repo se." | It ships, a lot | Imran, Nixime |
| 5 | 26.0-42.0 | Tiles on the desk → dive into each demo site on a phone (brand, store, loyalty, food, delivery, automation, WordPress, corporate, E2EE) | "Aur sirf video nahi. Brand sites, online stores, food delivery, loyalty assistants, encrypted chat, automation. Sab yahin se banta hai." | It builds products too | Keanu, Slate |
| 6 | 42.0-48.0 | Editorial grid: red disc, one giant word per beat (PROMPT / PIPELINE / GATES / SHIP), the docs pages | "Har step ka article hai. Prompt se final render tak." | You can learn it | Miracle |
| 7 | 48.0-55.0 | Giant 3D Fork key pressed, the repo forks into copies, back on the road: the billboard now reads the repo URL; loop to frame 1 | "Repo ka naam: EditorBro. Fork karo, clone karo, apna studio banao. Link chahiye? Comment karo EDITOR." | Act now | SaasWAVE, Slate, Keanu loop |

- **LOOP:** the last frame is the road; the cut back to frame 1 is invisible.
- **CAMERA:**
  - 35-50 mm equivalent on the road;
  - a scan-line wipe, not a cut, for the flip;
  - an object-to-world dive into each site;
  - cuts land on VO word boundaries and score beats.
- **LOOK:**
  - **Road:** golden hour.
  - **Code world:** teal wireframe on black.
  - **Desk:** near-black with terminal glow.
  - **Editorial:** grey paper + #E0262B red disc + black type.
  - **Type:** Fraunces (display), Space Grotesk (UI), JetBrains Mono (code).
- **SOUND:** an original score at 100 BPM with a ducked stop before the flip, a sub hit on the flip, ticks on each gate, whooshes on the dives, and a big hit on the Fork press. VO at -14 LUFS integrated.
- **CHECKS:**
  - `reel_qa.py`;
  - `look.py` G0-G3 (with an events file of the real cuts);
  - `measure.py` quarters / dip / colour / strobe;
  - STT on every word.

## Assumptions made
- **Length:** 55 s. The user gave no length; the channel likes under 60 s.
- **GitHub owner:** `Fayez-2403` (the existing remote's owner). The repo name EditorBro is the user's.
- **No real person or face in the reel.** The "creator" is implied by the desk and the terminal.
- **Montage:** only renders that are ours end to end. Reels built from third-party footage (Genie 4, GPT-6.1 Terra, Apple M6)
  are left out.
