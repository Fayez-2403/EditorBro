"""UserPromptSubmit hook: when a prompt is about making or changing a reel / video / animation, remind Claude to run the
reel-pipeline skill (which chains every installed skill in the right order). Prints nothing for other prompts."""
import json, re, sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)
prompt = str(data.get("prompt", ""))
if re.search(r"\b(reels?|videos?|animat\w*|render\w*|voice ?over|vo|captions?|motion|shorts?|storyboard|hook|cover|thumbnail|blender|3d)\b", prompt, re.I):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext":
        "This prompt is about a reel/video. Follow the project's reel pipeline: invoke the `reel-pipeline` skill first "
        "(.claude/skills/reel-pipeline/SKILL.md) and run its stages (brand -> brief -> hook -> script/voice -> template -> "
        "build -> export checks -> QA -> post kit), loading each stage's skills. Also load `motion-studio` (the 20-repo "
        "stack: block brief, 20 ideas, Puppeteer/Blender/Numba/Pedalboard tools, measure.py checks) and `motionmaxxing`. "
        "Follow docs/TECHPETREK_MASTER_REEL_STUDIO.md (the production contract): a NEW reel starts as the full folder via "
        "`python .claude/skills/motion-studio/scripts/new_reel.py <slug> --title ...` (docs/brief, factcheck, asset_manifest, "
        "review_log, src/, scripts/), one film grammar, the 12 gates. "
        "For small follow-up edits, use only the stages the change touches."}}))
