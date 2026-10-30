#!/usr/bin/env bash
# EditorBro setup for macOS / Linux.
#   bash scripts/setup.sh [--skip-skills]
# Installs the Python and Node dependencies, then the third-party skills from their authors' own repos (pinned commits),
# so their licences stay with them. Needs git, Node 22+, Python 3.12 and ffmpeg on PATH. Bun is optional (for app/).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "1/4 Python packages"
python3 -m pip install --user -r requirements.txt

echo "2/4 Node packages"
for d in tools/motion-studio projects/editorbro projects/editorbro/web; do (cd "$d" && npm install --no-audit --no-fund); done
if command -v bun >/dev/null; then (cd app && bun install); else echo "   (bun not found: skipping app/, the pdoom engine)"; fi

[ -f .env ] || { cp .env.example .env; echo "   wrote .env from .env.example (fill your own keys)"; }
[ "${1:-}" = "--skip-skills" ] && { echo "done (skills skipped)"; exit 0; }

echo "3/4 Third-party skills (cloned from their authors, pinned)"
VENDOR="$ROOT/.claude/skills/_vendor"
mkdir -p "$VENDOR"
install_pack() {  # url commit name
  local dir="$VENDOR/$3"
  [ -d "$dir" ] || git clone -q "$1" "$dir"
  git -C "$dir" checkout -q "$2"
  find "$dir" -mindepth 2 -name SKILL.md | while read -r f; do
    local skill; skill="$(dirname "$f")"
    local dst="$ROOT/.claude/skills/$(basename "$skill")"
    [ -e "$dst" ] || { cp -R "$skill" "$dst"; echo "   + $(basename "$skill")"; }
  done
}
install_pack https://github.com/higgsfield-ai/skills f83af0b higgsfield-ai
install_pack https://github.com/AKCodez/higgsfield-claude-skills f6698ab akcodez
[ -d .claude/skills/motionmaxxing ] || { git clone -q https://github.com/Tejashmakwana/motionmaxxing .claude/skills/motionmaxxing; echo "   + motionmaxxing (Apache-2.0)"; }

echo "4/4 HyperFrames skills (HeyGen); follow its prompts"
npx skills add heygen-com/hyperframes --all

echo "done. Run: python3 .claude/skills/motion-studio/scripts/check_tools.py"
