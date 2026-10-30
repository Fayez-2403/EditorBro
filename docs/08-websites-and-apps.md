# 8. Websites and apps

The same studio that makes reels builds real websites. In `projects/editorbro/web/demos/` there are nine, each for a
**fictional brand** in a different niche. Every visual is drawn in code (SVG, CSS, canvas, Three.js); there are no stock
photos and no real logos. Each footer says "Demo · fictional brand · built with EditorBro".

| Demo | Niche | What actually works |
|---|---|---|
| `brand`: LUMA Audio | D2C headphones | A Three.js headphone built from primitives on a lit turntable. Swatches recolour the model and the page. A pinned scroll story through three chapters, and an add-to-bag CTA. |
| `store`: Threadline | Fashion e-commerce | 12 SVG products with category, size and price filters and sorting. Quick view with colourways and size checks, a cart drawer with a free-shipping bar, and a 3-step demo checkout (no payment taken). |
| `loyalty`: Brewpoint Rewards | Café loyalty app | A 10-stamp card, points and tiers. A **scripted** assistant (labelled as not a live AI) answers points, rewards and birthday questions with rich cards. Redeem with a QR-style code and a stamp burst. |
| `food`: Tiffinly | Food ordering | Cuisine filters and search, menus with steppers, and a cart with delivery fee and GST. Place an order, then watch a live status run Confirmed → Cooking → Out for delivery. |
| `delivery`: Dashr | Parcel tracking | A seeded city map (streets, river, bridges, landmarks) with the courier riding the route while the camera follows. ETA countdown, four-step timeline, nearby zone, and proof of delivery with a signature that draws itself. |
| `automation`: Flowsmith | Automation builder | Drag, connect and delete nodes on a canvas. Run schedules from the actual graph: packets travel the links and each node shows its output, with a timed run log. |
| `wordpress`: Meridian Freight | WordPress business theme | The classic business-theme layout (mega menu, hero slider, services, stats, testimonials), **plus a real block theme** in `wp-theme/meridian/` (`theme.json` v3, block templates and parts). Valid JSON and balanced block markup; not yet tested inside WordPress. |
| `company`: Halcyon Grid | Corporate site | A canvas energy-field hero, count-up stats, solutions tabs with isometric SVG scenes, an investor chart that draws in, and a sample-report modal. |
| `vault`: Vaultline | End-to-end encrypted messenger | **Real WebCrypto.** ECDH P-256 key pairs, AES-GCM-256 via `deriveKey`, and a 96-bit IV per message. A server panel that only ever sees ciphertext, a SHA-256 safety number, and a tamper switch that makes decryption really fail. Labelled "not an audited product". |

Run them:
```sh
cd projects/editorbro/web && npm install && npm run dev
# http://localhost:54210/demos/<slug>/
```

## How they were built
- **The contract:** `demos/CONTRACT.md` is the brief every demo followed. It covers the files, the stack (Vite +
  TypeScript, Three.js, GSAP), the fictional-brand rules, motion rules, and two modes.
- **Normal mode** is the working, responsive site.
- **Reel mode (`?reel=1`)** is a deterministic 6-second tour for filming. `window.seek(t)` puts the page into the exact
  state for time *t*: scroll position, open panels, typed text, the progress of the key interaction. It is driven by one
  paused timeline, with no timers, and `window.__ready` signals that fonts and data are loaded.
- **Built in parallel:** three Claude Code sub-agents built three demos each, then reviewed their own stills for at least
  two rounds.

## How they were filmed
```sh
node scripts/capture.mjs --page demos/vault/index.html --w 432 --h 768 --dpr 2.5 --query reel=1 --fps 60 --dur 6 --out ../public/clips/demo_vault.mp4
```
- **Mobile layout at full size:** a 432x768 CSS viewport at DPR 2.5 gives exact 1080x1920 frames of the mobile layout.
- **No reloads mid-capture:** captures run against a second dev server with HMR and file watching off
  (`vite.capture.config.ts`). Otherwise a file saved elsewhere can reload the page halfway through.

## Make your own
Copy any demo folder, change the brand, and keep the two modes. The reel pipeline can then film it like any other plate.

Next: [case study](09-case-study-editorbro-reel.md).
