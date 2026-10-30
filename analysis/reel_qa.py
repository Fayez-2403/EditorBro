"""QA for any reel before posting (reel-pipeline stage 8): format, size, colour tags, audio, loudness, silences, safe
duration; plus the variant's cue grid and caption timing when its data exists.

    python analysis/reel_qa.py <video.mp4> [--variant grokbot] [--frames 3480] [--max-dur 60] [--allow-silence 42.0-42.25]
"""
import glob, json, os, pathlib, re, shutil, subprocess, sys

import numpy as np

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")
ROOT = pathlib.Path(__file__).resolve().parent.parent


def arg(name, default=None):
    for i, a in enumerate(sys.argv):
        if a == name and i + 1 < len(sys.argv): return sys.argv[i + 1]
    return default


VIDEO = pathlib.Path(sys.argv[1]); checks = []
def check(name, ok, detail=""): checks.append({"check": name, "pass": bool(ok), "detail": detail}); print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")

probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
                                  capture_output=True, text=True, check=True).stdout)
v = next(s for s in probe["streams"] if s["codec_type"] == "video"); a = [s for s in probe["streams"] if s["codec_type"] == "audio"]
frames = int(v.get("nb_read_frames") or v.get("nb_frames")); fps = eval(v["r_frame_rate"]); dur = float(probe["format"]["duration"])
check("1080 x 1920 (9:16)", (v["width"], v["height"]) == (1080, 1920), f"{v['width']}x{v['height']}")
check("H.264, yuv420p", v["codec_name"] == "h264" and v.get("pix_fmt") == "yuv420p", f"{v['codec_name']} {v.get('pix_fmt')}")
check("audio stream present (AAC)", bool(a) and a[0]["codec_name"] == "aac", a[0]["codec_name"] if a else "none")
check(f"duration under {arg('--max-dur', '60')} s", dur <= float(arg("--max-dur", "60")) + 0.05, f"{dur:.3f} s, {frames} frames at {fps:g} fps")
if arg("--frames"): check(f"frame count = {arg('--frames')}", frames == int(arg("--frames")), str(frames))
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(VIDEO), "-f", "f32le", "-ac", "1", "-ar", "8000", "pipe:1"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.float32); hop = 400; e = np.sqrt(np.mean(y[: len(y) // hop * hop].reshape(-1, hop) ** 2, 1)); db = 20 * np.log10(e + 1e-9)
allow = [tuple(map(float, r.split("-"))) for r in (arg("--allow-silence", "") or "").split(",") if r]
silent = [i * hop / 8000 for i, x in enumerate(db) if x < -55]
bad = [t for t in silent if t < dur - 0.2 and not any(lo - 0.05 <= t <= hi + 0.05 for lo, hi in allow)]
check("no unplanned silences", not bad, f"{len(bad)} silent 50 ms windows" + (f", first at {bad[0]:.2f} s" if bad else ""))
r = subprocess.run(["ffmpeg", "-nostats", "-i", str(VIDEO), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1]); check("loudness about -14 LUFS (+/-1)", abs(lufs + 14) <= 1, f"{lufs:.1f} LUFS")
# picture content: a render error paints flat frames (the engine's solid red); sample 2 frames/s and flag any frame whose
# every colour channel is nearly flat (DOTS 2026-10-20: one 10 s segment rendered solid red and passed the other checks)
vr = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(VIDEO), "-vf", "fps=2,scale=54:96", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"],
                    capture_output=True, check=True).stdout
fr = np.frombuffer(vr, np.uint8).reshape(-1, 96, 54, 3).astype(np.float32)
flat = [i / 2 for i, f in enumerate(fr) if f.reshape(-1, 3).std(0).max() < 4]
check("no flat / error frames (2 per second sampled)", not flat, f"{len(flat)} flat of {len(fr)}" + (f", {flat[0]:.1f}-{flat[-1]:.1f} s" if flat else ""))
var = arg("--variant")
if var:
    D = ROOT / "data" / var
    if (D / "cues.json").exists():
        cues = json.loads((D / "cues.json").read_text(encoding="utf-8"))
        evs = [x for v2 in cues.get("events", {}).values() for x in (v2 if isinstance(v2, list) else [v2])]
        # the grid is the variant's own eighth note (music.json "beat"), else grokbot's 0.25 s; events are stored to 0.1 ms
        g = json.loads((D / "music.json").read_text())["beat"] / 2 if (D / "music.json").exists() else 0.25
        off = [x for x in evs if abs(x - round(x / g) * g) > 1e-3]; check(f"story events on the {g:.4g} s eighth-note grid", not off, f"{len(evs)} events")
    if (D / "lyrics.json").exists():
        words = [w for l in json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"] for w in l["words"]]
        check("caption words time-ordered (from the voice's timestamps)", all(b["start"] >= a2["start"] for a2, b in zip(words, words[1:])), f"{len(words)} words")
out = {"video": str(VIDEO), "checks": checks, "passed": sum(c["pass"] for c in checks), "total": len(checks)}
print(f"\n{out['passed']}/{out['total']} checks passed")
(VIDEO.parent / (VIDEO.stem + "_qa.json")).write_text(json.dumps(out, indent=1))
