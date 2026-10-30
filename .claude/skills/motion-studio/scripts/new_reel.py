"""Start a new reel as the FULL master-studio folder (docs/TECHPETREK_MASTER_REEL_STUDIO.md §15), ready to build.

  python .claude/skills/motion-studio/scripts/new_reel.py <slug> --title "Reel title" [--dest projects]

Copies templates/reel/ to <dest>/<slug>/, which gives:
- assets/ (inbox, originals, licensed, generated, screenshots);
- the 11 docs/ templates;
- the Remotion src/ (compositions, scenes, components, animation, ui, audio, themes, config);
- audio/, scripts/ (voice, timing, score, beats, assets, contact sheets, render), public/ (fonts, logo), post/ and out/.

It fills {{TITLE}} / {{SLUG}} / {{DATE}} and links node_modules to the shared Remotion install (a junction on Windows,
so no npm install). It refuses to touch an existing folder: earlier reels are never overwritten.
"""
import argparse, datetime, os, pathlib, shutil, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parents[3]
TEMPLATE = HERE.parent / "templates" / "reel"
SHARED_NM = REPO / "projects" / "railway-ai-security" / "SOURCE" / "node_modules"
TEXT = {".md", ".json", ".ts", ".tsx", ".mjs", ".py", ".sh", ".csv", ".txt"}

ap = argparse.ArgumentParser()
ap.add_argument("slug", help="kebab-case folder name, e.g. apple-m6-local-ai")
ap.add_argument("--title", required=True)
ap.add_argument("--dest", default=str(REPO / "projects"))
a = ap.parse_args()

dst = pathlib.Path(a.dest).resolve() / a.slug
if dst.exists():
    sys.exit(f"{dst} already exists: pick a new slug (or a _v2 folder); earlier reels are never overwritten")
shutil.copytree(TEMPLATE, dst, ignore=shutil.ignore_patterns("node_modules", "__pycache__", "out"))
today = datetime.date.today().isoformat()
for p in dst.rglob("*"):
    if p.is_file() and p.suffix in TEXT:
        s = p.read_text(encoding="utf-8")
        if "{{" in s:
            p.write_text(s.replace("{{TITLE}}", a.title).replace("{{SLUG}}", a.slug).replace("{{DATE}}", today), encoding="utf-8")
(dst / "out").mkdir(exist_ok=True)

nm = dst / "node_modules"
if SHARED_NM.exists():
    if os.name == "nt":
        subprocess.run(["cmd", "/c", "mklink", "/J", str(nm), str(SHARED_NM)], check=True, capture_output=True)
    else:
        nm.symlink_to(SHARED_NM, target_is_directory=True)
    linked = f"node_modules -> {SHARED_NM.relative_to(REPO)}"
else:
    linked = "node_modules: run npm install in the new folder (shared install not found)"

print(f"new reel: {dst}\n  {linked}\n  next: fill docs/brief.md (NEW REEL BRIEF) + docs/factcheck.md, then src/config/voScript.json; "
      f"run python {dst.relative_to(REPO) if dst.is_relative_to(REPO) else dst}/scripts/verify_assets.py")
