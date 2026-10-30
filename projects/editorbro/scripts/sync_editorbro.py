"""Build the public EditorBro repo folder from this studio, by whitelist.

    python projects/editorbro/scripts/sync_editorbro.py            # copies into C:/Users/ce/EditorBro (or --dest)
    python projects/editorbro/scripts/sync_editorbro.py --dry-run  # lists what would ship, copies nothing

What ships:
- our code, docs and our own skills;
- the files under `projects/editorbro/repo_overlay/` (README, articles, setup scripts) on top.

What never ships:
- secrets (.env*);
- third-party skills (they are linked, see docs/skills-map.md);
- the prompt-pack PDF;
- media (renders, takes, reference reels, brand photos);
- node_modules / caches.

`SHIPPED.txt` in the destination lists every file copied.
"""
from __future__ import annotations

import argparse
import fnmatch
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]          # motion-as-code
OVERLAY = ROOT / "projects/editorbro/repo_overlay"

# (source glob relative to ROOT, destination prefix relative to the repo root)
INCLUDE = [
    ("CLAUDE.md", "docs/studio/CLAUDE.motion-as-code.md"),
    ("LICENSE.pdoom-engine", ""),
    ("app/src/**/*", ""), ("app/scripts/**/*", ""), ("app/public/fonts/**/*", ""),
    ("app/index.html", ""), ("app/canvas-render.html", ""), ("app/flex-render.html", ""),
    ("app/package.json", ""), ("app/bun.lock", ""), ("app/tsconfig.json", ""), ("app/tsconfig.scripts.json", ""), ("app/vite.config.ts", ""),
    ("analysis/*.py", ""),
    ("tools/motion-studio/render_html.mjs", ""), ("tools/motion-studio/package.json", ""), ("tools/motion-studio/package-lock.json", ""),
    ("tools/motion-studio/templates/**/*", ""),
    (".claude/skills/reel-pipeline/**/*", ""), (".claude/skills/motion-studio/**/*", ""),
    (".claude/hooks/*.py", ""), (".claude/settings.json", ""),
    ("docs/TECHPETREK_MASTER_REEL_STUDIO.md", ""),
    ("projects/editorbro/**/*", ""),
]

EXCLUDE = [
    "*/node_modules/*", "*/__pycache__/*", "*.pyc", "*.nbi", "*.nbc", "*/.env*", ".env*",
    ".claude/skills/motion-studio/references/source/*",
    "projects/editorbro/assets/*", "projects/editorbro/out/*", "projects/editorbro/repo_overlay/*",
    "projects/editorbro/audio/takes/*", "projects/editorbro/public/clips/*", "projects/editorbro/web/dist/*",
    "*.mp4", "*.mov", "*.webm", "*.wav", "*.mp3", "*.m4a", "*.flac", "*.pdf", "*.zip",
]
KEEP_EMPTY = [".gitkeep", ".env.example"]


def excluded(rel: str) -> bool:
    if Path(rel).name in KEEP_EMPTY:
        return False
    return any(fnmatch.fnmatch(rel, pat) for pat in EXCLUDE)


def plan() -> list[tuple[Path, str]]:
    out: dict[str, Path] = {}
    for pattern, dest in INCLUDE:
        for src in ROOT.glob(pattern):
            if not src.is_file():
                continue
            rel = src.relative_to(ROOT).as_posix()
            if excluded(rel):
                continue
            out[dest or rel] = src
    if OVERLAY.exists():
        for src in OVERLAY.rglob("*"):
            if src.is_file() and not excluded(src.relative_to(OVERLAY).as_posix()):
                out[src.relative_to(OVERLAY).as_posix()] = src
    return sorted(((src, rel) for rel, src in out.items()), key=lambda p: p[1])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dest", default=str(Path.home() / "EditorBro"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    dest = Path(a.dest)
    files = plan()
    total = sum(src.stat().st_size for src, _ in files)
    print(f"{len(files)} files, {total / 1e6:.1f} MB -> {dest}")
    if a.dry_run:
        for src, rel in files:
            print(f"  {rel}")
        return
    for src, rel in files:
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, target)
    (dest / "SHIPPED.txt").write_text(
        "Files copied from the studio by projects/editorbro/scripts/sync_editorbro.py\n\n"
        + "\n".join(rel for _, rel in files) + "\n", encoding="utf-8")
    print("done; manifest in SHIPPED.txt")


if __name__ == "__main__":
    main()
