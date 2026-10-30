"""Frames for the Claude reveals reel -> app/public/reveals/frames/<key>/NNNNN.(jpg|webp) and data/reveals/media.json.

The engine draws synchronously, so each video plays from its own frame sequence: frame n of a clip is shown at
clip time n / fps (1.0x, never retimed; a variable-rate source is first put on a constant 60 fps grid by timestamp).
  - the creators' excerpts (script_reveals.CLIPS): 1216 px wide (the reel's 608 px column at 2x), JPEG
  - small collage loops (LOOPS): 400 px wide, 30 fps, JPEG
  - the actor (ACTOR_SHOTS, Mixkit Free License): 1280x720 at 23.976 fps; the green-screen monitor shot is keyed to
    transparent WebP, with the screen's four corners per frame (so the scene can map the collage and the post onto it)
Also copies the thread screenshots (X's own embed) to app/public/reveals/screens/.

    python analysis/reveals_media.py [--only A,B]
"""
import json, pathlib, shutil, subprocess, sys, tempfile

import numpy as np
from PIL import Image

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_reveals import CLIPS, LOOPS, ACTOR_SHOTS
import pkgfw_vo_v1 as v1   # puts ffmpeg on PATH

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "projects" / "claude-reveals" / "references" / "source"
STOCK = ROOT / "projects" / "claude-reveals" / "references" / "stock" / "free720"
OUT = ROOT / "app" / "public" / "reveals" / "frames"
ACT_FPS = 24000 / 1001


def ff(*a):
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", *a], check=True)


def extract(src, t0, t1, fps, width, d, q=3):
    if d.exists(): shutil.rmtree(d)
    d.mkdir(parents=True)
    vf = (f"fps={fps}," if fps else "") + f"scale={width}:-2:flags=lanczos"
    ff("-ss", f"{t0:.3f}", "-i", str(src), "-t", f"{t1 - t0:.3f}", "-vf", vf, "-q:v", str(q), "-start_number", "0", str(d / "%05d.jpg"))
    fs = sorted(d.glob("*.jpg")); w, h = Image.open(fs[0]).size
    return len(fs), w, h


def key_green(src, t0, t1, d):
    """Key the green monitor out: alpha from green dominance, the spill pulled back, the screen's corners per frame."""
    if d.exists(): shutil.rmtree(d)
    d.mkdir(parents=True)
    corners = []
    with tempfile.TemporaryDirectory() as tmp:
        ff("-ss", f"{t0:.3f}", "-i", str(src), "-t", f"{t1 - t0:.3f}", "-start_number", "0", str(pathlib.Path(tmp) / "%05d.png"))
        for i, p in enumerate(sorted(pathlib.Path(tmp).glob("*.png"))):
            a = np.asarray(Image.open(p).convert("RGB")).astype(np.float32) / 255
            r, g, b = a[..., 0], a[..., 1], a[..., 2]
            k = g - np.maximum(r, b)                                  # how much greener than the other channels
            green = np.clip((k - 0.12) / 0.16, 0, 1) * (g > 0.35)
            alpha = 1 - green
            spill = (k > 0.02) & (alpha > 0)
            a[..., 1] = np.where(spill, np.minimum(g, np.maximum(r, b) + 0.02), g)
            rgba = np.dstack([a, alpha[..., None]]); rgba = (np.clip(rgba, 0, 1) * 255).astype(np.uint8)
            Image.fromarray(rgba, "RGBA").save(d / f"{i:05d}.webp", "WEBP", quality=88, method=4)
            # the screen = the largest green region after an opening (drops green glints on the headset, hands and desk)
            from scipy import ndimage
            m = ndimage.binary_opening(green > 0.5, structure=np.ones((9, 9)))
            lab, nl = ndimage.label(m)
            if nl == 0: corners.append(None); continue
            big = 1 + int(np.argmax(ndimage.sum(m, lab, range(1, nl + 1))))
            ys, xs = np.nonzero(lab == big)
            if len(xs) < 500: corners.append(None); continue
            s, df = xs + ys, xs - ys
            pick = lambda j: [int(xs[j]), int(ys[j])]
            corners.append([pick(np.argmin(s)), pick(np.argmax(df)), pick(np.argmax(s)), pick(np.argmin(df))])   # TL, TR, BR, BL
    n = len(corners); w, h = Image.open(d / "00000.webp").size
    return n, w, h, corners


def main():
    only = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--only=")), None)
    mp = ROOT / "data" / "reveals" / "media.json"; mp.parent.mkdir(parents=True, exist_ok=True)
    media = json.loads(mp.read_text()) if mp.exists() else {}
    for k, (f, t0, t1, fps) in CLIPS.items():
        if only and k not in only: continue
        n, w, h = extract(SRC / f, t0, t1, fps, 1216, OUT / k)
        media[k] = {"dir": f"reveals/frames/{k}", "ext": "jpg", "n": n, "fps": fps, "w": w, "h": h, "src": f, "in": t0, "out": t1}
        print(f"{k:10s} {n:4d} frames {w}x{h} @ {fps} fps  ({f} {t0}-{t1} s)")
    for k, (f, t0, t1) in LOOPS.items():
        kk = f"loop_{k}"
        if only and kk not in only: continue
        n, w, h = extract(SRC / f, t0, t1, 30, 400, OUT / kk, q=4)
        media[kk] = {"dir": f"reveals/frames/{kk}", "ext": "jpg", "n": n, "fps": 30, "w": w, "h": h, "src": f, "in": t0, "out": t1}
        print(f"{kk:10s} {n:4d} frames {w}x{h} @ 30 fps")
    for k, (f, t0, t1, keyed) in ACTOR_SHOTS.items():
        kk = f"act_{k}"
        if only and kk not in only: continue
        if keyed:
            n, w, h, corners = key_green(STOCK / f, t0, t1, OUT / kk)
            media[kk] = {"dir": f"reveals/frames/{kk}", "ext": "webp", "n": n, "fps": ACT_FPS, "w": w, "h": h, "src": f, "in": t0, "out": t1,
                         "corners": corners}
        else:
            n, w, h = extract(STOCK / f, t0, t1, None, 1280, OUT / kk)
            media[kk] = {"dir": f"reveals/frames/{kk}", "ext": "jpg", "n": n, "fps": ACT_FPS, "w": w, "h": h, "src": f, "in": t0, "out": t1}
        print(f"{kk:10s} {n:4d} frames {w}x{h} @ 23.976 fps{' (keyed)' if keyed else ''}")
    scr = ROOT / "app" / "public" / "reveals" / "screens"; scr.mkdir(parents=True, exist_ok=True)
    media["screens"] = {}
    for p in sorted((ROOT / "projects" / "claude-reveals" / "references" / "screens").glob("t*_dark.png")):
        im = Image.open(p).convert("RGB"); a = np.asarray(im).astype(int)
        bg = a[-1, -1]; rows = np.nonzero(np.abs(a - bg).sum(2).max(1) > 30)[0]   # trim the page background under the card
        im = im.crop((0, 0, im.width, int(rows[-1]) + 4)); im.save(scr / p.name)
        # v2: where the reply itself starts (each reply's embed shows its parent post first): Claude's second avatar
        b = np.asarray(im).astype(int)[:, 30:140]
        orange = ((b[..., 0] > 190) & (b[..., 1] > 90) & (b[..., 1] < 150) & (b[..., 2] > 50) & (b[..., 2] < 125)).sum(1) > 6
        runs, y0 = [], None
        for y, on in enumerate(orange):
            if on and y0 is None: y0 = y
            if not on and y0 is not None: (runs.append((y0, y)) if y - y0 > 40 else None); y0 = None
        reply = max(0, runs[1][0] - 26) if len(runs) > 1 else 0
        media["screens"][p.stem] = {"src": f"reveals/screens/{p.name}", "w": im.width, "h": im.height, "reply": reply}
    mp.write_text(json.dumps(media, indent=1))
    tot = sum(sum(f.stat().st_size for f in (OUT / k).iterdir()) for k in media if k != "screens" and (OUT / k).exists())
    print(f"media.json: {len(media)} sequences, {tot / 1e6:.0f} MB of frames")


if __name__ == "__main__":
    main()
