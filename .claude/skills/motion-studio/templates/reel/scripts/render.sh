#!/usr/bin/env bash
# The whole reel, in gate order (master studio §16). Each step is skipped with its own flag; nothing runs the full
# 1080x1920 render unless --final is given (ask the user first).
#   bash scripts/render.sh --voice      # ElevenLabs Liam take -> lines -> SCENE_TIMINGS.json (needs ELEVENLABS_API_KEY)
#   bash scripts/render.sh --score      # synth score + SFX + mix at -14 LUFS -> public/audio/mix_reel.wav
#   bash scripts/render.sh --preview    # 540x960 motion check + QA (reel_qa, look.py, measure.py, contact sheets)
#   bash scripts/render.sh --final      # 1080x1920 master + the same QA
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(git rev-parse --show-toplevel)"; MS="$REPO/.claude/skills/motion-studio/scripts"; export PYTHONIOENCODING=utf-8
SLUG=$(node -p "require('./package.json').name")
qa() {
  python "$REPO/analysis/reel_qa.py" "$1" || true
  python "$REPO/.claude/skills/motionmaxxing/scripts/look.py" "$1" --out out/qa/look --expect "$(node -p "require('./SCENE_TIMINGS.json').variants.reel.seconds")" --expect-audio || true
  python "$MS/measure.py" quarters "$1" | head -3; python "$MS/measure.py" strobe "$1"
  bash scripts/generate_contact_sheet.sh "$1"
}
for a in "$@"; do case "$a" in
  --voice)   python scripts/audio/vo.py reel --stt && python scripts/audio/timing.py ;;
  --score)   python scripts/audio/score.py && python scripts/export_kit.py ;;
  --preview) node scripts/render.mjs --scale 0.5 && qa "out/${SLUG}_v1_preview_540x960_60fps.mp4" ;;
  --final)   node scripts/render.mjs && qa "out/${SLUG}_v1_reel_1080x1920_60fps.mp4" && npx remotion still src/index.ts Cover out/cover.png ;;
  *) echo "unknown step $a"; exit 1 ;;
esac; done
