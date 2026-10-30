# EditorBro: rules for Claude

Read `README.md`, then `docs/02-from-prompt-to-reel.md`, before changing anything.

- **Every new reel or video** (or a remake, restyle, re-voice or render of one) goes through the `reel-pipeline` skill
  (`.claude/skills/reel-pipeline/SKILL.md`), next to `motion-studio` (`.claude/skills/motion-studio/SKILL.md`).
  - Start a reel as the full folder: `python .claude/skills/motion-studio/scripts/new_reel.py <slug> --title "..."`,
    then `npm install` in it.
  - Fill `docs/brief.md` and `docs/factcheck.md` before any voice-over.
- **Determinism:**
  - Every plate is a pure function of time. No `Math.random()`, `Date.now()` or `performance.now()`; use a seeded RNG
    (`app/src/engine/util`, or `projects/editorbro/web/src/world/rng.ts`).
  - Find timings from data: voice word timings, or a song's measured beat grid. Never invent a beat grid.
- **Look before you render:**
  - Check work with stills, then a 540x960 motion check with sound.
  - Do not run the full 1080x1920 or a 4K render without asking.
- **Truth:**
  - Every on-screen fact has a source row in `docs/factcheck.md`.
  - Demo UIs are labelled illustrative.
  - Never fake logos or real UIs.
  - Never bake commercial songs into a render.
- **Don't edit `app/src/engine/`** (the pdoom-video engine, MIT). Shared plate helpers go in `app/src/scenes/_vo.ts`.
- **Before calling a reel done:** run `python analysis/reel_qa.py <video>`, plus motionmaxxing's `look.py` if you installed it.
- **Explain each change** in one or two sentences before you make it. Keep earlier versions; never overwrite a render.
