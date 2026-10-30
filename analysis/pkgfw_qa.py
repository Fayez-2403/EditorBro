"""Automated QC for the GitHub package firewall reel: the brief's QC list as code. Writes
projects/github-package-firewall/QC-auto.json and prints a report.

  file: 1080x1920 H.264 yuv420p, 60 fps verified, every frame present, AAC audio
  audio: -14 LUFS (+/-1), true peak under -1 dBTP, no unplanned silence (v2 has no planned stops, only the soft start)
  picture: zero blank frames (every frame sampled at 4/s has real detail, none flat)
  sync: every chapter cut on a beat of the 122 BPM grid, every story event on an eighth note (from its word), captions from
        the voice's own timestamps
  claims: no unsupported claims in the voice, captions or on-screen copy; the source credit, the "REAL SCREENSHOT" /
          "ILLUSTRATION" / docs-example labels are on screen; the official logo paths are used; FACTS.md cites the changelog

    python analysis/pkgfw_qa.py [path/to/video.mp4]
"""
import glob, json, os, pathlib, re, shutil, subprocess, sys

import numpy as np

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")
ROOT = pathlib.Path(__file__).resolve().parent.parent
PROJ = ROOT / "projects" / "github-package-firewall"
VIDEO = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else PROJ / "output" / "pkgfw_master.mp4"
D = ROOT / "data" / "pkgfw"
sys.path.insert(0, str(ROOT / "analysis"))
from script_pkgfw import BEAT, LINES
DURATION = json.loads((D / "layout.json").read_text())["duration"]   # v2: laid out from the voice

checks = []
def check(name, ok, detail=""):
    checks.append({"check": name, "pass": bool(ok), "detail": detail}); print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")

probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
                                  capture_output=True, text=True, check=True).stdout)
v = next(s for s in probe["streams"] if s["codec_type"] == "video"); a = [s for s in probe["streams"] if s["codec_type"] == "audio"]
frames = int(v.get("nb_read_frames") or v.get("nb_frames")); fps = eval(v["r_frame_rate"]); dur = float(probe["format"]["duration"])
want = round(DURATION * 60)
check("60 fps verified", abs(fps - 60) < 1e-6, f"{fps:g} fps")
check(f"every frame present ({want} at 60 fps)", abs(frames - want) <= 1, f"{frames} frames, {dur:.3f} s")
check("1080 x 1920, H.264, yuv420p", (v["width"], v["height"], v["codec_name"], v.get("pix_fmt")) == (1080, 1920, "h264", "yuv420p"),
      f"{v['width']}x{v['height']} {v['codec_name']} {v.get('pix_fmt')}")
check("audio stream present (AAC)", bool(a) and a[0]["codec_name"] == "aac", a[0]["codec_name"] if a else "none")
# audio: loudness, true peak, silence only where planned
r = subprocess.run(["ffmpeg", "-nostats", "-i", str(VIDEO), "-map", "0:a", "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1]); tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)[-1])
check("integrated loudness about -14 LUFS (+/-1)", abs(lufs + 14) <= 1, f"{lufs:.1f} LUFS")
check("no clipping: true peak under -1 dBTP", tp < -1.0, f"{tp:.1f} dBTP")
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(VIDEO), "-f", "f32le", "-ac", "1", "-ar", "8000", "pipe:1"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.float32); hop = 400; e = np.sqrt(np.mean(y[: len(y) // hop * hop].reshape(-1, hop) ** 2, 1)); db = 20 * np.log10(e + 1e-9)
music = json.loads((D / "music.json").read_text())
planned = [(a_ - 0.06, b_ + 0.06) for a_, b_, *_ in music["silences"]] + [(0.0, 0.1)]   # planned stops + the soft start
silent = [i * hop / 8000 for i, x in enumerate(db) if x < -55]
unplanned = [t for t in silent if not any(a_ <= t <= b_ for a_, b_ in planned) and t < DURATION - 0.1]
check("no unplanned silence", not unplanned, f"silent 50 ms windows outside the planned ones: {len(unplanned)}")
# picture: zero blank frames (sample 4 frames a second; a frame is blank if its luma barely varies)
w_, h_ = 108, 192
pix = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(VIDEO), "-vf", f"fps=4,scale={w_}:{h_},format=gray", "-f", "rawvideo", "pipe:1"],
                     capture_output=True, check=True).stdout
fr = np.frombuffer(pix, np.uint8).reshape(-1, h_, w_).astype(np.float32)
blank = [i / 4 for i, f in enumerate(fr) if f.std() < 4 or f.max() - f.min() < 20]
check("zero blank frames (4 per second sampled)", not blank, f"{len(fr)} sampled, blank at: {blank[:6]}")
# sync: cuts on bar lines, events on the beat grid, captions from the voice
cues = json.loads((D / "cues.json").read_text())
beats = music["beats"]
cuts = [c[0] for c in cues["chapters"][1:]]
check("every chapter cut on a beat of the 122 BPM grid", all(min(abs(c - b) for b in beats) < 1e-3 for c in cuts), str([round(c, 3) for c in cuts]))
e8 = [i * BEAT / 2 for i in range(int(DURATION / (BEAT / 2)) + 2)]
off = {k: x for k, x in cues["events"].items() if min(abs(x - b) for b in e8) > 1e-3}
check("every story event on the eighth-note grid (from its word)", not off, f"{len(cues['events'])} events, off-grid: {off}")
sfx_off = [s[0] for s in cues["sfx"] if min(abs(s[0] - b) for b in beats + [0.0]) > 0.5]
check("every foley cue tied to the grid (within half a beat)", not sfx_off, f"{len(cues['sfx'])} cues")
L = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
words = [w for l in L for w in l["words"]]
check("captions time-ordered, from the voice's own timestamps", all(b["start"] >= a["start"] for a, b in zip(words, words[1:])), f"{len(words)} words")
srt = (PROJ / "output" / "pkgfw_captions.srt").read_text(encoding="utf-8")
check("SRT built from the final word timings", srt.count("-->") > 10 and words[0]["w"] in srt, f"{srt.count('-->')} cues")
# claims and labels
src = (ROOT / "app" / "src" / "scenes" / "pkgfw.ts").read_text(encoding="utf-8")
copy = " ".join(re.findall(r"'([^'\n]*)'", src)) + " " + " ".join(l[2] for l in LINES)
banned = [p for p in (r"\bPyPI\b", r"\bpip\b", r"all malware", r"blocks all", r"automatically protect", r"protects everyone", r"free forever", r"100% safe")
          if re.search(p, copy, re.I)]
check("no unsupported claims (PyPI, 'blocks all malware', 'automatic', 'free forever')", not banned, f"found: {banned}")
for label in ("Source: GitHub Changelog • Oct 20, 2026", "REAL SCREENSHOT · github.blog", "REAL SCREENSHOT · GitHub Docs", "ILLUSTRATION",
              "EXAMPLE OUTPUT FROM GITHUB DOCS", "PUBLIC PREVIEW", "package names are fictional"):
    check(f"on-screen label present: {label}", label in src)
check("official GitHub mark and npm logo (published SVG paths, unmodified)", "M12.5.75C6.146.75" in src and "M1.763 0C.786 0" in src,
      "Primer Octicons mark-github, Simple Icons npm")
facts = (PROJ / "FACTS.md").read_text(encoding="utf-8")
check("FACTS.md cites the official changelog", "github.blog/changelog/2026-10-20-github-package-firewall-in-public-preview" in facts)
out = {"video": str(VIDEO), "checks": checks, "passed": sum(c["pass"] for c in checks), "total": len(checks)}
(PROJ / "QC-auto.json").write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding="utf-8")
print(f"\n{out['passed']}/{out['total']} checks passed")
