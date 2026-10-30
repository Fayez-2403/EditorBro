"""Footage and screenshots for The Editor's Aura -> app/public/aura/{frames,screens}/ and data/aura/media.json.

  - ph:  the user's placeholder cinematic clip (out/cinematics10seconds.mp4: a 9:16 strip inside a 1920x1080 frame, white
         bars cropped off), 30 fps. These are the room "backshots" for now, swappable later
  - rec: the user's real VS Code + Claude Code screen recording (out/screengrab for reel.mp4), 1600 px wide, 30 fps, for pans
         and crops of the real IDE
  - screens: the user's screenshots (the IDE, the model picker, the project tree)
Frame n of a sequence shows at clip time n / fps (1.0x).

    python analysis/aura_media.py
"""
import json, pathlib, shutil, subprocess, sys

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import pkgfw_vo_v1 as v1   # puts ffmpeg on PATH

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "public" / "aura"


def ff(*a):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *a], check=True)


def strip_box(src):
    """The picture inside the white pillarbox: columns that are not (near) white in a sample frame."""
    tmp = OUT / "_probe.png"; ff("-ss", "3", "-i", str(src), "-frames:v", "1", str(tmp))
    a = np.asarray(Image.open(tmp).convert("L")).astype(int); tmp.unlink()
    cols = np.nonzero((a < 235).mean(0) > 0.5)[0]
    return int(cols[0]), int(cols[-1] - cols[0] + 1)


def seq(key, src, vf, q=3):
    d = OUT / "frames" / key
    if d.exists(): shutil.rmtree(d)
    d.mkdir(parents=True)
    ff("-i", str(src), "-vf", vf, "-q:v", str(q), "-start_number", "0", str(d / "%05d.jpg"))
    fs = sorted(d.glob("*.jpg")); w, h = Image.open(fs[0]).size
    return {"dir": f"aura/frames/{key}", "ext": "jpg", "n": len(fs), "fps": 30, "w": w, "h": h}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    media = {}
    ph = ROOT / "out" / "cinematics10seconds.mp4"
    x, w = strip_box(ph); w -= w % 2
    media["ph"] = {**seq("ph", ph, f"crop={w}:1080:{x}:0,fps=30"), "src": ph.name, "crop_x": x}
    print("ph", media["ph"]["n"], "frames", media["ph"]["w"], "x", media["ph"]["h"], "(crop x", x, ")")
    rec = ROOT / "out" / "screengrab for reel.mp4"
    media["rec"] = {**seq("rec", rec, "fps=30,scale=1600:-2:flags=lanczos"), "src": rec.name}
    print("rec", media["rec"]["n"], "frames", media["rec"]["w"], "x", media["rec"]["h"])
    scr = OUT / "screens"; scr.mkdir(exist_ok=True); media["screens"] = {}
    for n in (5, 6, 7, 8, 9, 10, 11):
        p = ROOT / "projects" / "editors-aura" / "references" / "screens" / f"user_{n}.png"
        shutil.copy(p, scr / p.name); W, H = Image.open(p).size
        media["screens"][f"user_{n}"] = {"src": f"aura/screens/{p.name}", "w": W, "h": H}
    shutil.copy(ROOT / "app" / "public" / "brand" / "techpe-trek.jpg", scr / "logo.jpg")
    (ROOT / "data" / "aura" / "media.json").write_text(json.dumps(media, indent=1))
    print("screens", list(media["screens"]))


if __name__ == "__main__":
    main()
