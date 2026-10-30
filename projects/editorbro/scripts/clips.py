"""Cut the montage clips and poster stills listed in src/config/montage.json from our own earlier renders.
    python scripts/clips.py
Writes public/clips/m_<id>.mp4 (1080x1920, 60 fps, H.264, no audio, +0.2 s of tail so a cut never shows a blank) and
public/clips/poster_<n>.jpg. Sources are repo-relative paths; a missing source stops with its name.
"""
import json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
EDL = json.loads((ROOT / "src/config/montage.json").read_text(encoding="utf-8"))
OUT = ROOT / "public/clips"
OUT.mkdir(parents=True, exist_ok=True)
FIT = "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1"


def src(p: str) -> pathlib.Path:
    f = REPO / p
    if not f.exists():
        sys.exit(f"missing source: {p}")
    return f


for c in EDL["clips"]:
    dst = OUT / f"m_{c['id']}.mp4"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(c["ss"]), "-i", str(src(c["src"])), "-t", str(c["dur"] + 0.2),
                    "-vf", f"{FIT},fps=60", "-an", "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", str(dst)], check=True)
    print("clip", dst.name, c["dur"], "s")
for i, p in enumerate(EDL["posters"]):
    dst = OUT / f"poster_{i}.jpg"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(p["ss"]), "-i", str(src(p["src"])), "-frames:v", "1", "-vf", f"{FIT},scale=720:1280", "-q:v", "3", str(dst)], check=True)
    print("poster", dst.name)
