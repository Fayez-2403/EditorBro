# Fact check: EditorBro: Welcome to the Studio

Every on-screen or spoken claim traces to a row here (master studio §2). Counted on 30 Oct 2026 in `c:\Users\ce\motion-as-code`.

| # | Claim | Kind | Source | Evidence | Status | Wording |
|---|---|---|---|---|---|---|
| F1 | The highway hook shot is entirely code; no camera footage | own build | `projects/editorbro/web/src/world/*.ts` (Three.js), captured by `web/scripts/capture.mjs` | the scene, sign art and textures are generated in code; no image or video files load | verified | "Ye GTA 6 nahi hai… ye poora shot code hai. Camera se ek frame nahi." |
| F2 | Made with Claude Code | own process | README ("made entirely in code, with Claude Code"); this reel built in a Claude Code session on model `claude-opus-5-5` | session environment | verified | "Claude Code"; the terminal badge shows "Opus 5.5" only on shots made in this session |
| F3 | 64 skills | count | 30 folders with SKILL.md in `.claude/skills/` + 34 in `~/.claude/skills/` | `ls -d */` + SKILL.md test, 30 Oct 2026 | verified (studio setup) | "64 skills". The public repo ships our own and links the rest; the README must say this. |
| F4 | One pipeline | own process | `.claude/skills/reel-pipeline/SKILL.md` (stages 0a-9) | file | verified | "ek pipeline" |
| F5 | 12 quality gates | own process | `docs/TECHPETREK_MASTER_REEL_STUDIO.md` §16 "Twelve-gate production pipeline" | VERIFY, BRIEF, REFERENCE STUDY, STUDIO SETUP, VOICE + AUDIO, SHOTLIST, STYLE/CHARACTER BIBLE, KEY STILLS, ANIMATIC, BUILD, CRITIQUE, FINISH + SHIP | verified | "12 quality gates" + the 12 names on screen |
| F6 | More than 20 reels made with this repo | count | README projects tables + git HEAD `projects/` (16 folders) + `app/src/timeline.ts` variants + the reels made after HEAD (Maison Milan, PaperPilot, Apple M6, package firewall) | 24 distinct reels: Jev explainer, Microsoft decision, GitHub trending series, Motion Flex, Carbon-X, Claude Duet, Claude Reveals, DOTS heist, Editor's Aura, package firewall, Grok Bot, AFTERCODE, ASTRA.EXE, Apple M6, PaperPilot, Anthropic IPO, GPT-6.1 Terra, IT hiring Q2 FY27, Kimi K3.1 Pro, LiteLLM, Railway AI security, Cloudflare KV cache, Genie 4, Maison Milan | verified | "Bees se zyada reels" |
| F7 | The montage shows only our own renders | own build | the files listed in `docs/asset_manifest.csv` (montage rows) | reels built from third-party footage (Genie 4, GPT-6.1 Terra, Apple M6) are excluded | to fill when the montage is cut | none (picture only) |
| F8 | It builds websites: brand, store, loyalty, food, delivery, automation, WordPress, corporate, E2EE | own build | `projects/editorbro/web/demos/*` (nine fictional brands), plus a real WordPress block theme in `demos/wordpress/wp-theme/meridian/`, plus real WebCrypto E2EE in `demos/vault` | pending: the builds are in progress | pending | "Brand sites, online stores, food delivery, loyalty assistants, encrypted chat, automation" |
| F9 | Every step has an article, prompt to final render | own docs | the EditorBro repo `docs/` articles | pending: must exist before the reel ships | pending | "Har step ka article hai" |
| F10 | Repo name and link | own | github.com/Fayez-2403/EditorBro | pending: the user creates the repo, we push after review | pending | "EditorBro"; the URL appears on the billboard at the end |

## Labels on screen
- **Demo sites:** fictional brands. Each footer says "Demo · fictional brand · built with EditorBro". The reel adds a small
  "fictional demo brands" tag on the websites chapter.
- **No GTA / Rockstar name or art on screen.** The VO line "Ye GTA 6 nahi hai" names the game only to say this isn't it
  (commentary). No trademark appears in the picture.

## Not used (and why)
- **"Built by Opus 5.5" for the whole repo:** earlier reels were made over many sessions, and we did not log the model each time.
- **Lines of code:** the count at HEAD includes vendored folders. Not worth a number that needs an asterisk.
- **"100% code" for the whole reel:** the montage includes reels that use voice synthesis and music generation. The claim is
  scoped to the hook shot.
