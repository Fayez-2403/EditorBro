# Animation guide: {{TITLE}}

- **Determinism:** every frame is a pure function of the frame number. No Date.now, Math.random or timers; seeded rng only (src/animation/rng.ts).
- **Eases and springs:** from src/animation/anim.ts (quintic, dampedSpring), with the numbers per class in style_guide.md.
- **Craft (motionmaxxing):** land decelerates, leave accelerates; cut on motion; no dead frame.
- **Word cues:** `wf(line, word)` from src/audio/words.ts, so the picture follows the real voice.
- **Music cues:** frames from audio/beats.json. Align the PEAK of a visual event to the hit, not its first frame.
- **Heavy 3D and sims:** pre-render them (Blender template, Numba sim) to intermediates in assets/generated/, then play them with <OffthreadVideo>.
- **UI states:** render them with tools/motion-studio/render_html.mjs (Puppeteer) to transparent PNG.
- **Local frames:** scenes get a local frame `f`. Any helper that reads `useCurrentFrame()` (global) must take `f` when its cue frames are scene-local (Apple M6 retro).
- **Video in a scene:** `<Sequence from={sceneStart}>`, never `from={-f}` (which plays at 2x).
- **Comparison count-ups** start from the baseline (1x), never from 0.
- **Wipes** that hold more than 3 frames need texture: a flat field trips look.py G2.
- **Dark worlds** move little in luma. The template Reel already pushes the camera in on every scene; keep something moving in every shot.
- **Voice takes:** generate 2-3 seeds and pick per line with `--line-seed` (same text); check each with STT.
