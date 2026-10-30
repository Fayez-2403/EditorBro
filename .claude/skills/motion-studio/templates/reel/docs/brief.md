# Brief: {{TITLE}}

Created {{DATE}} from the motion-studio reel template.
- **The contract:** `docs/TECHPETREK_MASTER_REEL_STUDIO.md` (repo root).
- **The block brief method:** `.claude/skills/motion-studio/guide/brief.md`.

**How to fill it:**
- Fill every field.
- `AUTO`: the agent decides and writes down what it chose.
- `MISSING`: an honest placeholder. It blocks only the scene or export that needs it.

## NEW REEL BRIEF
```yaml
project_title: "{{TITLE}}"
subject_and_angle: "[WHAT HAPPENED / PRODUCT / STORY / CRAZY BUILD]"
primary_source_urls: []
secondary_reference_urls: []
mode: AUTO            # NEWS_LAUNCH | SOURCE_COMPILATION | MASCOT_FILM | EDITOR_AURA | PRODUCT_DEMO | EXPLAINER
idea: AUTO            # one of the 20 in .claude/skills/motion-studio/guide/ideas.md (or two combined)
runtime_seconds: 45
runtime_max_seconds: 100
format: "9:16"
resolution: "1080x1920"
fps: 60
language: "Hinglish"  # Devanagari TTS, Roman captions
voiceover: "WRITE_AND_GENERATE_IF_AUTHORIZED"   # ElevenLabs Liam, eleven_turbo_v2_5 hi (channel default)
soundtrack: "ORIGINAL"                           # synthesized score; a user song only with its file + permitted use
hook: "[FIRST 0-2 SEC]"
core_reveal: "[THE ONE THING AUDIENCE MUST REMEMBER]"
scene_count: AUTO
featured_source_videos: []
visual_style: "Premium cinematic, high-retention, highly original, physically meaningful animation"
actor_reference_images: []
mascot_or_character_reference_images: []
logo_file: "public/brand/techpe-trek.jpg"
preferred_cta: "[COMMENT KEYWORD / SAVE / SHARE / TRY LINK]"
post_caption: true
cover_image: true
budget: "FREE-FIRST"
licensing_requirements: "Only owned/authorized/appropriately licensed media; track permissions in docs/asset_manifest.csv"
critical_constraints: []
```

## Logline
A [character/viewer] discovers [surprise], tries [action], and learns [payoff].

## Block brief (motion-studio)
Write each block here (see guide/brief.md):
FILM / BRAND (HERO, APP, RESULT, SET) / FACTS / FORMAT + RENDERER / TIMELINE / BEATS / LOOP / CAMERA / LOOK / SOUND / CHECKS

## Assumptions made (when the user gave only a topic or URL)
- ...
