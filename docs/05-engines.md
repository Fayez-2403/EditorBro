# 5. Engines: which renderer, when

Every engine here obeys the same contract: **frame = f(t)**. A page or scene exposes `seek(t)` (or renders frame *n*),
and a headless browser or renderer captures it frame by frame. Nothing depends on wall-clock time, so a 60 fps render is
exact even when a frame takes two seconds to draw.

| Engine | Use it for | Lives in | Render with |
|---|---|---|---|
| **Remotion** (React) | Explainers, type, captions, layout, final assembly of all plates and audio | `projects/<slug>/src/` | `npx remotion studio`; `node scripts/render.mjs` |
| **pdoom-video** (canvas) | Canvas "plates": data films, kinetic type, mascot cartoons, anything 2D at 60 fps | `app/src/scenes/`, `app/src/timeline.ts` | `bun scripts/render.ts stills --variant <v> --t 1,5,9`; `bun scripts/render.ts video --variant <v>` |
| **Three.js** | 3D worlds, camera moves, wireframe/hologram looks, product turntables | e.g. `projects/editorbro/web/src/world/` | `node web/scripts/capture.mjs --page reel.html --fps 60 --dur 6 --out clip.mp4` |
| **Puppeteer** (HTML → PNG) | UI cards, search bars, terminal windows, website tours | `tools/motion-studio/render_html.mjs` | `node render_html.mjs ui.html --out frames/ui --fps 60 --dur 2.5` |
| **Blender** (Python) | A photoreal hero object, physically based light, real depth of field | `.claude/skills/motion-studio/blender/scene_template.py` | `blender -b -P scene_template.py` |
| **Numba** | Simulations (erosion, particles, fluids) baked to frames | `.claude/skills/motion-studio/scripts/sim_erosion.py` | `python sim_erosion.py` |

## How to choose
1. **Is it mostly type, layout or captions?** Remotion.
2. **Is it a stylised 2D world that must be fast to iterate?** The pdoom engine.
3. **Does the camera move through space?** Three.js. Add Blender only when realism is the point and the shot is short.
4. **Is it a real interface (a site, an app, a terminal)?** Build the real thing in HTML and film it with Puppeteer.
   Never fake a UI in a design tool.
5. **Do several layers have to agree?** Render each as a plate and assemble them in Remotion against one
   `SCENE_TIMINGS.json`.

## Seek-safe rules (all engines)
- **No randomness without a seed.** Use `mulberry32(seed)` or `hash(n)`.
- **No timers.** No `setTimeout`, no free-running `requestAnimationFrame` loops in capture mode. Drive one paused timeline
  (`gsap.timeline({ paused: true }).seek(t)`) or pure functions of `t`.
- **Precompute anything async** (fonts, WebCrypto, image decode) before `window.__ready = true`.
- **Eases have meaning:** things land decelerating (quintic or expo out) and leave accelerating; stagger 40-70 ms. The
  NumPy versions are in `motion.py`; port the same numbers to TypeScript.

## The example: one Three.js world, three uses
The EditorBro highway (`projects/editorbro/web/src/world/highway.ts`) is used three ways:
- the reel's hook, captured at 60 fps through `reel.html?w=1080&h=1920`;
- the website's live hero;
- the source for the "it's code" moment. A second render pass swaps every material for a teal wireframe, and a scan line
  in the grade shader reveals it.

Next: [sound and voice](06-sound-and-voice.md).
