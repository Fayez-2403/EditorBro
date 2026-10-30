# Demo-site contract (EditorBro showcase)

The EditorBro website shows what this studio can build. Each demo is a **complete, premium-looking website for a fictional
brand** in one niche, as one page. It is linked from the hub and filmed for the reel. It must look like a real
production site from a top agency, not a template or a wireframe. Each demo has its own identity: palette, type, layout
rhythm and motion signature.

## Files (only these; never edit shared files)
- `demos/<slug>/index.html`: the page.
- `demos/<slug>/meta.json`: `{ "slug", "name", "niche", "tagline", "accent": "#hex", "bg": "#hex", "features": ["...", "..."] }`
  (3-5 features, each one true of what you built). The hub gallery reads this.
- `src/demos/<slug>/*`: TypeScript and CSS for it (`main.ts`, `style.css`, any modules).
- **Do NOT edit:**
  - `vite.config.ts`, `package.json`, `tsconfig.json`;
  - `src/world/*`, `src/reel.ts`, `index.html`, `reel.html`;
  - other demos.
  The Vite config already finds `demos/*/index.html`.

## Stack
- Vite + TypeScript (strict). Plain DOM + CSS. Installed and allowed: `three@0.186.1` and `gsap@3.15.0`. Nothing else, and no
  `npm install`.
- **Fonts:** Google Fonts `<link>` tags are allowed. Pick type that fits the brand; do not default to Inter everywhere.
- **Images:** no stock photos, no hotlinked images, no real company logos or products. Make every visual yourself in
  SVG, CSS, canvas or Three.js: product renders, illustrated dishes, maps, avatars, charts.
- **Brand names:** fictional, as given in your brief. The footer of every demo carries this small line:
  `Demo · fictional brand · built with EditorBro`.
- **No invented claims** that could read as real-world facts: no fake press quotes attributed to real outlets, no fake
  awards. Sample data (prices in ₹, ratings, stats) is fine because the brand is fictional. Keep it plausible.
- **Determinism in reel mode:** no `Math.random()`, `Date.now()` or `performance.now()` in anything `seek(t)` drives. Use a
  seeded RNG if you need variety.

## Two modes
1. **Normal (`/demos/<slug>/`):** a fully working, interactive, responsive site.
   - Desktop target: 1440x900. Mobile target: **432 CSS px wide**, which is what the reel films at DPR 2.5.
   - The core interaction must work for real. Your brief names it.
   - Motion: elements land decelerating (`power3.out` / `expo.out`, 0.5-0.9 s) and leave accelerating (`power2.in`).
     Stagger 40-70 ms. Nothing bounces unless it is a physical object. Respect `prefers-reduced-motion`.
2. **Reel (`?reel=1`):** a scripted, deterministic 6-second tour for filming.
   - Set `window.seek = (t: number) => void` for t in [0, 6]. It puts the page into the exact state for time t:
     - scroll position;
     - which panel is open;
     - typed text;
     - the progress of the key interaction.
     Drive it with one **paused** GSAP timeline (`tl.seek(t)`) or pure functions of t. No timers or rAF loops in reel mode.
   - The tour shows the hero (0-1.5 s), the key interaction actually happening (1.5-4.5 s), then one more section or the
     result (4.5-6 s). Every second needs visible motion. No dead frames.
   - Hide scrollbars. Set `window.__ready = true` after `document.fonts.ready` and after your first `seek(0)`.
   - Use the mobile layout at 432x768 CSS. The reel captures at that viewport with DPR 2.5, i.e. 1080x1920 pixels.

## Check your work (required)
The dev server runs on http://localhost:54210 (`npm run dev` in `web/` if it isn't up).

1. `npx tsc --noEmit -p .` passes.
2. Capture stills and **look at them**:
   ```
   node scripts/capture.mjs --page demos/<slug>/index.html --w 432 --h 768 --dpr 2.5 --query reel=1 --t 0,1.5,3,4.5,6 --out ../out/wip_demos/<slug>/reel
   node scripts/capture.mjs --page demos/<slug>/index.html --w 1440 --h 900 --t 0 --out ../out/wip_demos/<slug>/desktop
   ```
   (`capture.mjs` waits for `window.__ready`, so set it in normal mode too, after fonts load.)
3. Fix whatever looks broken, cramped, cheap, overlapping or empty, then capture again. Two review rounds minimum.

## Report back
- The files you made.
- What works interactively.
- The reel-tour timeline (what happens at which second).
- The still paths.
- An honest list of anything not finished.
