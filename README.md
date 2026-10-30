<div align="center">

# EditorBro

**A motion studio you run by typing.**
Reels, 3D films, apps and websites, built in code by Claude Code from a single prompt.

`Prompt → skills → pipeline → 12 quality gates → a finished reel`

</div>

---

EditorBro is the studio behind the **Tech पे Trek** reels, opened up so you can fork it. There's no After Effects, no
timeline editor and no stock footage. Every frame is a **pure function of time**, every cut comes from **measured data**
(voice word timings or a song's beat grid), and every video **re-renders from source**.

You describe the reel. Claude Code reads this repo's rules and skills, writes the brief and the fact check, builds the
scenes in Three.js / Remotion / canvas, voices and scores it, renders a low-res check, measures it, fixes the three worst
problems, and asks you before the full render.

> The opening shot of the EditorBro reel, a golden-hour highway with a painted "WELCOME TO Editor Bro" billboard, is
> code: [`projects/editorbro/web/src/world/`](projects/editorbro/web/src/world). No camera, no footage, no game assets.

## What you can make with it

| Kind | How it's built | In this repo |
|---|---|---|
| Vertical reels (9:16, 60 fps) with voice, captions and score | Remotion + the `reel-pipeline` skill | `projects/editorbro/` (a full worked example) |
| Canvas / engine reels (plates as pure functions of t) | the pdoom-video engine in `app/` | `app/src/scenes/` (46 scenes) |
| 3D worlds and cinematic shots | Three.js scenes with `seek(t)`, captured frame by frame | `projects/editorbro/web/src/world/` |
| Websites and web apps in any niche | Vite + TypeScript, GSAP, Three.js | `projects/editorbro/web/demos/` (9 fictional brands) |
| A WordPress block theme | `theme.json` + block templates | `projects/editorbro/web/demos/wordpress/wp-theme/` |
| End-to-end encryption UI | the WebCrypto API (ECDH P-256 + AES-GCM), in the browser | `projects/editorbro/web/demos/vault/` |
| Voice-over, score and mastering | ElevenLabs or edge-tts, numpy/scipy synthesis, Pedalboard + pyloudnorm | `analysis/`, `.claude/skills/motion-studio/scripts/` |
| QA that measures instead of guessing | ffprobe, pyloudnorm, OpenCV, faster-whisper | `analysis/reel_qa.py`, `measure.py`, `captions.py` |

The nine demo sites are: a D2C headphones brand, a fashion store, a café loyalty assistant, food ordering, parcel tracking,
an automation builder, a WordPress-style logistics company, a corporate energy site and an encrypted messenger. They are
**fictional brands**; each footer says so.

## Quick start

You need **Claude Code**, **Node 22+**, **Python 3.12**, **ffmpeg** and **Google Chrome**. Bun is optional, for the `app/` engine.

```sh
git clone https://github.com/Fayez-2403/EditorBro
cd EditorBro
# Windows:       powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
# macOS / Linux: bash scripts/setup.sh
claude
```

Then ask for a reel in plain words:

```
Make a 45-second reel about <your topic>. Hinglish voice, captions, original score. Facts only from <source URL>.
```

The `UserPromptSubmit` hook in `.claude/settings.json` notices it's a reel and points Claude at the pipeline. The rest
is in [docs/02-from-prompt-to-reel.md](docs/02-from-prompt-to-reel.md).

## The articles

| # | Article | What you'll learn |
|---|---|---|
| 1 | [What EditorBro is](docs/01-what-is-editorbro.md) | The idea, the rules, the folder map |
| 2 | [From prompt to reel](docs/02-from-prompt-to-reel.md) | The whole building flow, step by step, with the real commands |
| 3 | [The skills map](docs/03-skills-map.md) | All 64 skills of the studio: the ones shipped here and the ones you install from their authors |
| 4 | [The 12 gates](docs/04-the-12-gates.md) | VERIFY → … → FINISH + SHIP, and what "done" means |
| 5 | [Engines](docs/05-engines.md) | Remotion vs the pdoom engine vs Three.js vs Blender vs Puppeteer: which one, when |
| 6 | [Sound and voice](docs/06-sound-and-voice.md) | Voice takes, word timings, synthesized scores, ducking, mastering to -14 LUFS |
| 7 | [Measure, don't guess](docs/07-qa-measure-dont-guess.md) | `reel_qa.py`, `look.py`, `measure.py`, STT checks |
| 8 | [Websites and apps](docs/08-websites-and-apps.md) | How the nine demo sites were built and filmed |
| 9 | [Case study: the EditorBro reel](docs/09-case-study-editorbro-reel.md) | This repo's own reel, from the GTA-style hook to the Fork key |

## Folder map

```
.claude/        skills (reel-pipeline, motion-studio), the prompt hook, settings
app/            the pdoom-video engine (MIT, by mexicat) + engine scenes ("plates")
analysis/       Python: voice-over, word alignment, scores, mixes, QA
tools/          motion-studio Node tools (Puppeteer HTML → PNG/frames)
projects/       one folder per reel; projects/editorbro is the worked example (reel + website + demos)
docs/           the articles above + the master production contract
scripts/        setup scripts
```

## Rules the studio follows (and you can change)
- **Determinism:** every plate is a pure function of time. No `Math.random()`, `Date.now()` or `performance.now()`; use a seeded RNG.
- **Truth:** every fact on screen has a row in `docs/factcheck.md`, with its source. Demo UIs are labelled illustrative.
- **Look before rendering:** stills first, then a 540x960 motion check with sound. Ask before the full render.
- **Measure:** loudness, cut sync, frozen frames and strobing are measured, not eyeballed.
- **Keep versions:** earlier renders are never overwritten.

The author's channel defaults (9:16, 60 fps, a Hinglish voice, -14 LUFS) are in `.claude/skills/reel-pipeline/SKILL.md`.
Edit them to make the studio yours.

## What is not in this repo, and why
- **Third-party skills** (HyperFrames, motionmaxxing, the Higgsfield packs): installed from their own repos by
  `scripts/setup.*`, so their licences stay with their authors. See [docs/03-skills-map.md](docs/03-skills-map.md).
- **API keys:** copy `.env.example` to `.env` and fill your own. Voice needs an ElevenLabs key; edge-tts is a free fallback.
- **Media:** renders, voice takes, reference reels and brand photos stay out. Reels re-render from source.
- **The "Motion Studio in 20 Repos" prompt pack PDF:** it's the author's (@0xwhrrari). The `motion-studio` skill is our
  working notes on it.

## Credits
- **The pdoom-video engine:** mexicat (MIT, see `LICENSE.pdoom-engine`).
- **Fonts:** SIL OFL (Archivo, Cormorant Garamond, IBM Plex Mono, Fraunces, Noto Sans Devanagari).
- **Skills we build on:** HeyGen HyperFrames, motionmaxxing by Tejash Makwana, Higgsfield, AKCodez.
- **Built with:** Claude Code.

Made by **Mohammed Fayez Khan** for **Tech पे Trek**. If it helps you, fork it and tag the reel you make.
