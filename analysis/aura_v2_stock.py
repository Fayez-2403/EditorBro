"""The Editor's Aura V2 (90 s) opening shots: real stock footage of one programmer (Mixkit's 416xx series, each clip's licence
read from its own page: "copyrightNotice":"Free", the Mixkit Stock Video Free License; 720p downloads in
projects/editors-aura/references/stock/free720 with SHA256SUMS.txt). Only the ranges the intro uses are cut, cropped to 9:16
(the landscape clips around their subject; the vertical clips as they are), scaled to 608x1080 and resampled to 30 fps into
app/public/aura/frames/stk_<shot>/. Writes data/aura_v2/stock.json (SeqCache entries).
    python analysis/aura_v2_stock.py
"""
import json, pathlib, shutil, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "projects/editors-aura/references/stock/free720"; OUT = ROOT / "app/public/aura/frames"
# shot: (clip, from s, to s, crop centre as a fraction of the width, or None for a vertical clip)
SHOTS = {
    "stk_face1": ("41650", 0.4, 3.2, 0.26),   # "Ladies and gentlemen": his face, lit blue
    "stk_face2": ("41650", 4.8, 7.0, 0.42),   # "you are not ready for this": the look up
    "stk_hands": ("41646", 6.6, 7.9, 0.55),   # hit 1: hands on the keyboard
    "stk_code": ("41657", 2.8, 5.6, None),    # hit 2: code scrolling on his screen (vertical clip)
    "stk_ots": ("41642", 1.2, 2.8, 0.45),     # hit 3: over the shoulder
    "stk_mon": ("41639", 2.2, 4.3, 0.55),     # hit 4: his monitors and code
    "stk_dive": ("41654", 0.1, 1.4, None),    # hit 5: the code screen, for the dive (vertical clip)
}


def main():
    info = {}
    for name, (clip, a, b, cx) in SHOTS.items():
        d = OUT / name; shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
        crop = f"crop=405:720:{int(round(cx * 1280 - 202.5))}:0," if cx is not None else ""
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(a), "-to", str(b), "-i", str(SRC / f"mixkit_{clip}.mp4"),
                        "-vf", f"{crop}scale=608:1080:flags=lanczos,fps=30", "-q:v", "3", "-start_number", "0", str(d / "%05d.jpg")], check=True)
        n = len(list(d.glob("*.jpg")))
        info[name] = {"dir": f"aura/frames/{name}", "ext": "jpg", "n": n, "fps": 30, "w": 608, "h": 1080, "src": f"mixkit_{clip}.mp4 {a}-{b} s",
                      "licence": "Mixkit Stock Video Free License (copyrightNotice: Free)", "url": f"https://mixkit.co/free-stock-video/ ... -{clip}/"}
        print(f"{name}: {clip} {a}-{b} s -> {n} frames")
    (ROOT / "data/aura_v2/stock.json").write_text(json.dumps(info, indent=1))


if __name__ == "__main__":
    main()
