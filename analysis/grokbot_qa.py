"""Automated QA for the Grok Bot reel: file format, frame count, audio, silence, loudness, beat grid, captions, spelling.
Writes projects/grok-bot-reel/QA-auto.json and prints a report.

    python analysis/grokbot_qa.py [path/to/video.mp4]
"""
import glob, json, os, pathlib, re, shutil, subprocess, sys

import numpy as np

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")
ROOT = pathlib.Path(__file__).resolve().parent.parent
VIDEO = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "projects" / "grok-bot-reel" / "output" / "grok-bot-reel_master.mp4"
D = ROOT / "data" / "grokbot"
checks = []
def check(name, ok, detail=""): checks.append({"check": name, "pass": bool(ok), "detail": detail}); print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")

probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", str(VIDEO)],
                                  capture_output=True, text=True, check=True).stdout)
v = next(s for s in probe["streams"] if s["codec_type"] == "video"); a = [s for s in probe["streams"] if s["codec_type"] == "audio"]
frames = int(v.get("nb_read_frames") or v.get("nb_frames")); fps = eval(v["r_frame_rate"]); dur = float(probe["format"]["duration"])
check("frame count = 3480 (58.000 s at 60 fps)", frames == 3480, f"{frames} frames at {fps:g} fps, {dur:.3f} s")
check("1080 x 1920, H.264", (v["width"], v["height"], v["codec_name"]) == (1080, 1920, "h264"), f"{v['width']}x{v['height']} {v['codec_name']} {v.get('pix_fmt')}")
check("audio stream present (AAC)", bool(a) and a[0]["codec_name"] == "aac", a[0]["codec_name"] if a else "none")
# audio: silence only where planned (42.00-42.25 s), loudness
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(VIDEO), "-f", "f32le", "-ac", "1", "-ar", "8000", "pipe:1"], capture_output=True, check=True).stdout
y = np.frombuffer(raw, np.float32); hop = 400; e = np.sqrt(np.mean(y[: len(y) // hop * hop].reshape(-1, hop) ** 2, 1)); db = 20 * np.log10(e + 1e-9)
silent = [i * hop / 8000 for i, x in enumerate(db) if x < -55]
unplanned = [t for t in silent if not (41.95 <= t <= 42.3) and t < 57.9]
check("no unplanned silent sections", not unplanned, f"silent 50 ms windows outside 42.00-42.25 s: {len(unplanned)}" + (f" (first at {unplanned[0]:.2f} s)" if unplanned else ""))
check("the 42.00-42.25 s pattern interrupt is silent", any(42.0 <= t <= 42.2 for t in silent))
r = subprocess.run(["ffmpeg", "-nostats", "-i", str(VIDEO), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1]); check("integrated loudness about -14 LUFS (+/-1)", abs(lufs + 14) <= 1, f"{lufs:.1f} LUFS")
# beat grid: chapter cuts and every cue on the 120 BPM grid (0.25 s steps)
cues = json.loads((D / "cues.json").read_text())
cuts = [c[0] for c in cues["chapters"]]; check("chapter cuts on bar/beat grid", all(abs(c / 0.5 - round(c / 0.5)) < 1e-6 for c in cuts), str(cuts))
evs = [x for v2 in cues["events"].values() for x in (v2 if isinstance(v2, list) else [v2])]
off = [x for x in evs if abs(x / 0.25 - round(x / 0.25)) > 1e-6]; check("all story events on the 0.25 s grid", not off, f"{len(evs)} events, off-grid: {off}")
sfx_off = [s[0] for s in cues["sfx"] if abs(s[0] / 0.25 - round(s[0] / 0.25)) > 1e-6]; check("all foley cues on the 0.25 s grid", not sfx_off, f"{len(cues['sfx'])} cues")
# captions: start on the utterance (captions are drawn from the word timings themselves)
L = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
words = [w for l in L for w in l["words"]]
mono = all(b["start"] >= a["start"] for a, b in zip(words, words[1:]))
check("caption words time-ordered and taken from the voice's own timestamps", mono, f"{len(words)} words")
starts = [(l["i"], l["start"], l["chapter"][0]) for l in L]
bad = [s for s in starts if s[1] < s[2] - 1e-6 and s[0] != 0]; check("each VO line starts inside its chapter", not bad, str([round(s[1], 2) for s in starts]))
# spelling of the brand in every on-screen string of the scene
src = (ROOT / "app" / "src" / "scenes" / "grokbot.ts").read_text(encoding="utf-8")
strings = re.findall(r"'([^'\n]*)'", src)
wrong = [s for s in strings if re.search(r"grok", s, re.I) and s != "Grok" and not re.search(r"GROK BOT|Grok Bot|grokbot|grok-bot|grok bot", s)]   # "Grok" alone = the spoken caption word
check("brand spelled GROK BOT / Grok Bot in on-screen strings", not wrong, f"suspicious: {wrong[:5]}")
check("no xAI / X logo artwork used", not re.search(r"x\.ai|xai|logo\.(svg|png)", src, re.I), "the name only, in our own type")
facts = (ROOT / "projects" / "grok-bot-reel" / "FACTS.md").read_text(encoding="utf-8")
check("fact sheet cites the official source", "x.ai/news/introducing-grok-bot" in facts)
out = {"video": str(VIDEO), "checks": checks, "passed": sum(c["pass"] for c in checks), "total": len(checks)}
(ROOT / "projects" / "grok-bot-reel" / "QA-auto.json").write_text(json.dumps(out, indent=1))
print(f"\n{out['passed']}/{out['total']} checks passed")
