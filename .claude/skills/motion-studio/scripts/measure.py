"""Measure, don't guess: the checks from the "Motion Studio in 20 Repos" pack that look.py and reel_qa.py don't run.

  python measure.py quarters <film|wav>                     loudness per quarter second (pyloudnorm), loudest quarter
  python measure.py dip <film|wav> --at 1.85-2.0 --ref 1.6-1.85   a ducked "stop" vs the riser before it, in dB
  python measure.py seam <film>                             loop seam: |last - first| frame diff vs neighbour diffs
  python measure.py colour <film|png> --t 0.2 --box x,y,w,h [--want D97757]   brand colour on the lit surface: median RGB,
                                                            p99 luma, clipped %, distance to the wanted hex
  python measure.py strobe <film> [--thresh 18]              OpenCV: frames whose luma jumps and jumps back (flicker/strobe)

Everything reads the file through ffmpeg; nothing is written next to the film.
"""
import argparse, json, subprocess, sys
import numpy as np


def ffmpeg_audio(path, sr=48000):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "2", "-ar", str(sr), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2), sr


def probe(path):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", path],
                                  capture_output=True, text=True, check=True).stdout)
    s = j["streams"][0]
    n, d = s["r_frame_rate"].split("/")
    return int(s["width"]), int(s["height"]), float(n) / float(d), float(j["format"]["duration"])


def frame_at(path, t, w=None, h=None):
    W, H, _, _ = probe(path) if w is None else (w, h, 0, 0)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", path, "-frames:v", "1", "-f", "rawvideo",
                          "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3)


def small_frames(path, w=192, h=108):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def span(s):
    a, b = (float(v) for v in s.split("-"))
    return a, b


def quarters(a):
    import pyloudnorm as pyln
    x, sr = ffmpeg_audio(a.file)
    meter = pyln.Meter(sr)
    print(f"integrated {meter.integrated_loudness(x):.1f} LUFS   true-ish peak {20*np.log10(np.abs(x).max()+1e-12):.1f} dBFS")
    q = int(sr * 0.25)
    rows = [(i * 0.25, rms_db(x[i * q:(i + 1) * q])) for i in range(len(x) // q)]
    top = max(rows, key=lambda r: r[1])
    for t, v in rows:
        print(f"  {t:6.2f}-{t+0.25:5.2f}s  {v:6.1f} dB RMS  {'#' * max(0, int((v + 50) / 2))}{'  <- loudest' if (t, v) == top else ''}")


def dip(a):
    x, sr = ffmpeg_audio(a.file)
    (s0, s1), (r0, r1) = span(a.at), span(a.ref)
    d, r = rms_db(x[int(s0 * sr):int(s1 * sr)]), rms_db(x[int(r0 * sr):int(r1 * sr)])
    print(f"stop {a.at}s {d:.1f} dB   ref {a.ref}s {r:.1f} dB   -> {r - d:.1f} dB under (pack target: ~18 dB)")


def seam(a):
    F = small_frames(a.file)
    nb = np.abs(np.diff(F, axis=0)).mean(axis=(1, 2))
    s = np.abs(F[-1] - F[0]).mean()
    print(f"seam |last-first| {s:.2f}/255   neighbour diffs: median {np.median(nb):.2f}, p90 {np.percentile(nb, 90):.2f}"
          f"   -> {'SEAMLESS' if s <= np.percentile(nb, 90) else 'VISIBLE JUMP'}")


def colour(a):
    if a.file.lower().endswith((".png", ".jpg", ".jpeg")):
        from PIL import Image
        img = np.asarray(Image.open(a.file).convert("RGB"))
    else:
        img = frame_at(a.file, a.t)
    x, y, w, h = (int(v) for v in a.box.split(",")) if a.box else (0, 0, img.shape[1], img.shape[0])
    px = img[y:y + h, x:x + w].reshape(-1, 3).astype(np.float32)
    med = np.median(px, axis=0)
    luma = px @ np.array([0.2126, 0.7152, 0.0722])
    clipped = (px >= 254).any(axis=1).mean() * 100
    print(f"median RGB {tuple(int(v) for v in med)}   p99 luma {np.percentile(luma, 99):.0f}   clipped {clipped:.2f} %")
    if a.want:
        want = np.array([int(a.want.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)])
        print(f"want {tuple(want)}  -> off by {tuple(int(v) for v in med - want)} per channel (pack target: within ~5)")


def strobe(a):
    F = small_frames(a.file)
    m = F.mean(axis=(1, 2))
    _, _, fps, _ = probe(a.file)
    hits = [i for i in range(1, len(m) - 1)
            if abs(m[i] - m[i - 1]) > a.thresh and abs(m[i + 1] - m[i]) > a.thresh and np.sign(m[i] - m[i - 1]) != np.sign(m[i + 1] - m[i])]
    print(f"{len(hits)} strobe frames (one-frame luma spike > {a.thresh}/255)" + (": " + ", ".join(f"{i/fps:.2f}s" for i in hits[:20]) if hits else ""))
    print("  (a planned white flash shows up here too: check it is on a cut and lasts more than one frame)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("quarters", "dip", "seam", "colour", "strobe"):
        p = sub.add_parser(name)
        p.add_argument("file")
        if name == "dip":
            p.add_argument("--at", required=True); p.add_argument("--ref", required=True)
        if name == "colour":
            p.add_argument("--t", type=float, default=0.0); p.add_argument("--box"); p.add_argument("--want")
        if name == "strobe":
            p.add_argument("--thresh", type=float, default=18)
    a = ap.parse_args()
    globals()[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
