# 1. What EditorBro is

EditorBro is a video and web studio that lives in a Git repository and runs through Claude Code. You type what you want,
and Claude builds it as code inside this repo:
- a 55-second Hinglish reel with captions and an original score;
- a 3D title shot;
- a product website.

It follows the repo's rules and skills, and checks its own work with scripts before it shows you anything.

It grew out of more than twenty reels made for the Instagram channel **Tech पे Trek**. Every lesson from those reels became
a rule, a skill or a script, so the next reel starts where the last one ended.

## The idea in three sentences
1. **A video is a function of time.** Each scene ("plate") is code that draws frame *t*. Nothing is keyframed by hand, so
   any frame can be re-rendered, inspected or changed later.
2. **Timing comes from measurements.** Cuts land on the voice's word timestamps or on a song's measured beats, never on
   guesses.
3. **The process is written down.** A brief, a fact check, a shot list and a scored review log exist for every reel. An AI
   that follows a written process makes far fewer silent mistakes than one improvising.

## What's inside

| Layer | Where | Job |
|---|---|---|
| Rules | `CLAUDE.md` | What Claude must always and never do here |
| Skills | `.claude/skills/` | Step-by-step playbooks Claude loads on demand (see [the skills map](03-skills-map.md)) |
| Hook | `.claude/settings.json` + `.claude/hooks/reel_pipeline_hint.py` | Notices a reel prompt and points Claude at the pipeline |
| Contract | `docs/TECHPETREK_MASTER_REEL_STUDIO.md` | The production contract: film grammars, the 12 gates, QA loops, the delivery report |
| Engines | `app/` (pdoom-video), Remotion projects, Three.js scenes | Turn code into frames (see [engines](05-engines.md)) |
| Audio | `analysis/`, `motion-studio/scripts/` | Voice, word alignment, scores, mixing, mastering |
| QA | `analysis/reel_qa.py`, `measure.py`, `captions.py` | Measure format, loudness, silences, cut sync, strobing, speech |
| Projects | `projects/<slug>/` | One self-contained folder per reel or app |

## What makes it different from "prompt a video model"
- **You own every frame.** No generation credits, no watermark, no "the model changed so the shot changed".
- **Facts stay facts.** A number on screen has a source row; demo UIs say they are demos.
- **It is repeatable.** Change a word in the script and re-render. The cuts move with the voice, because they were never
  hard-coded.
- **It is honest about quality.** Every review round is scored 1-10 and the three worst problems are fixed with numbers
  ("sign base 6.0 → 7.2 m"), not adjectives.

Generative video (Higgsfield / Seedance skills) can be plugged in for shots that code can't reach. It is opt-in, labelled,
and only used after you approve the credits.

## Who it's for
- **Creators** who post technical reels and want a look nobody else has.
- **Developers** who want to see how far "everything as code" goes for motion design.
- **Agencies** that want a repeatable pipeline, from brief to fact check to render to QA to post.

Next: [From prompt to reel](02-from-prompt-to-reel.md).
