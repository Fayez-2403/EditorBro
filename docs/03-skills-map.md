# 3. The skills map

The studio that made the EditorBro reel runs **64 skills**: 30 in the project's `.claude/skills/` and 34 at user level
(`~/.claude/skills/`). Counted on 30 Oct 2026.

**What ships in this repo:** only the two skills we wrote. The rest belong to their authors; `scripts/setup.ps1` /
`scripts/setup.sh` install them from their own repos at the commits we tested.

A skill is a folder with a `SKILL.md` (a playbook) and optional scripts and references. Claude reads the short description
of every skill and loads the full playbook only when a task needs it.

## Shipped here (ours)

| Skill | What it does |
|---|---|
| `reel-pipeline` | The master workflow. It runs every reel through the stages in order (scaffold, brand, brief + facts, hook, script + voice, template + look, music, build, animatic, export + QA, post kit) and names the skill to load at each stage. It also holds the channel's standing preferences. |
| `motion-studio` | The production method and tools. It covers: the block brief, 20 reel ideas, the scaffold (`new_reel.py`), the tool check, motion curves (`motion.py`), mastering (`master.py`), measurements (`measure.py`), captions (`captions.py`), a Blender scene template, a Numba erosion sim and a PDF lead-magnet packer. |

## Installed by the setup script

| Pack | Skills | Source | Licence |
|---|---|---|---|
| motionmaxxing (1) | `motionmaxxing`: idea → world → craft laws, a seek-safe GSAP runtime, and the `look.py` / `lint.mjs` review gates | github.com/Tejashmakwana/motionmaxxing | Apache-2.0 |
| Higgsfield official (8) | `higgsfield-generate`, `higgsfield-brandkit`, `higgsfield-marketplace-cards`, `higgsfield-product-photoshoot`, `higgsfield-soul-id`, `higgsfield-video-explainer`, `higgsfield-websites`, `higgsfield-youtube-thumbnail` | github.com/higgsfield-ai/skills @ f83af0b | see that repo |
| AKCodez Seedance pack (19) | `01-cinematic` … `15-real-estate` (prompt guides by genre), `higgsfield-image-auto`, `seedance-auto-generate`, `ugc-hot-girl`, `ugc-video-auto` | github.com/AKCodez/higgsfield-claude-skills @ f6698ab | see that repo |
| HyperFrames by HeyGen (21) | `hyperframes`, `hyperframes-core`, `-animation`, `-audio`, `-cli`, `-creative`, `-keyframes`, `-registry`, `-studio`, `faceless-explainer`, `general-video`, `media-use`, `motion-graphics`, `music-to-video`, `product-launch-video`, `pr-to-video`, `remotion-to-hyperframes`, `slideshow`, `talking-head-recut`, `embedded-captions`, `figma` | `npx skills add heygen-com/hyperframes --all` | see that repo |

## Used by the studio, not redistributed
**A motion-design pack (13):** `animated-chart`, `apple-launch-film`, `brand-intake`, `launch-video`, `loop-cover`,
`milestone-reveal`, `model-showdown`, `motion-brief-writer`, `motion-effects`, `newsletter-promo`, `reel-export`,
`title-sequence-3d`, `vox-explainer`.

These came into the author's Claude setup without a licence file or a public source link. So they are listed here, but
not copied. Get them from their author if you have them.

**Total:** 2 ours + 1 + 8 + 19 + 21 + 13 = **64**.

## Which skill runs when (the reel pipeline)

| Stage | Skills |
|---|---|
| Scaffold | `motion-studio` (`new_reel.py`, `check_tools.py`) |
| Brand | `brand-intake`; `higgsfield-brandkit` only with approved credits |
| Brief + facts | `motion-studio` (block brief, idea pick), `motion-brief-writer`, web research |
| Hook | `11-social-hook` (hook principles), `hyperframes-creative`, `motionmaxxing` (idea + beat table) |
| Script + voice | `hyperframes-creative` narration rules; ElevenLabs / edge-tts; STT check |
| Template + look | by format: `vox-explainer`, `launch-video`, `title-sequence-3d`, `music-to-video`, `animated-chart`, `motion-effects`; motion rules from `hyperframes-animation`, `hyperframes-keyframes`, `motionmaxxing` |
| Music + sound | `hyperframes-audio` (levels, ducking), original score scripts, `master.py` |
| Build | `hyperframes-core` (determinism rules), the engines |
| Export + QA | `reel-export`, `reel_qa.py`, `look.py`, `measure.py`, `captions.py` |
| Post kit | caption + hashtags; `higgsfield-youtube-thumbnail` only with approved credits |

**Paid generation is opt-in.** Higgsfield / Seedance skills spend credits, so the pipeline uses them only after you say yes.

Next: [the 12 gates](04-the-12-gates.md).
