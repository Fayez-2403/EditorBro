"""The brief's QC for the Claude reveals reel, as code -> projects/claude-reveals/QC-auto.json.

    python analysis/reveals_qa.py [<video.mp4>]
Checks the plan and the scene source (every source video used, 1.0x, the right model labels, no model on AngioView, every
creator credited, the safety labels, no "community" claim, the actor's licence, cuts on beats, events on the grid) and,
when a video is given, its format, frame count and loudness.
"""
import json, pathlib, re, subprocess, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_reveals_v1 import CLIPS, ACTOR_SHOTS, CHAPTERS, MARKS, BEAT, DURATION, LINES
import pkgfw_vo_v1 as v1   # ffmpeg on PATH

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "reveals_v1"
SRC = (ROOT / "app" / "src" / "scenes" / "reveals_v1.ts").read_text(encoding="utf-8")
checks = []
def check(name, ok, detail=""): checks.append({"check": name, "pass": bool(ok), "detail": detail}); print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")
def body(fn):   # the source of one chapter method
    m = re.search(rf"\n  private {fn}\(c: CanvasRenderingContext2D.*?\n  \}}\n", SRC, re.S); return m.group(0) if m else ""

media = json.loads((D / "media.json").read_text())
# 1. every source video is in the reel, as an excerpt played at 1.0x
used = {k for k in CLIPS if re.search(rf"this\.clip\(c, (?:key|'{k}')", SRC) or (k in ("C1", "C2") and "'C1' : 'C2'" in SRC)}
check("every source video is used (A-F)", used == set(CLIPS), f"used {sorted(used)}")
for k, (f, a, b, fps) in CLIPS.items():
    m = media[k]; n_exp = round((b - a) * fps)
    check(f"excerpt {k}: 1.0x ({m['n']} frames at {fps} fps for {b - a:.2f} s)", m["fps"] == fps and abs(m["n"] - n_exp) <= 2, f"{f} {a}-{b} s")
# 2. no hidden holds: each excerpt lasts as long as its window on screen (E: the whole clip, its last frame holds for the collapse)
win = {"A": (MARKS["r1.clip"], MARKS["r1.collapse"] + 0.5), "B": (MARKS["r2.clip"], 41.0), "C1": (MARKS["r3.clipC1"], MARKS["r3.clipC2"]),
       "C2": (MARKS["r3.clipC2"], MARKS["r3.bird"] + 0.15), "F": (MARKS["r3.clipF"], 59.0), "D": (MARKS["r4.clip"], 72.95),
       "E": (MARKS["r5.clip"], MARKS["fin.impact"] + 0.4)}
for k, (s, e) in win.items():
    ln = CLIPS[k][2] - CLIPS[k][1]; hold = (e - s) - ln
    check(f"excerpt {k} covers its window ({e - s:.2f} s on screen, {ln:.2f} s of footage)", hold <= 0.01 or (k == "E" and hold <= 0.5),
          "the full clip; last frame held for the 0.45 s collapse" if k == "E" and hold > 0.01 else "")
# 3. the right model on each reveal, none on AngioView
labels = {"r1": "BUILT WITH OPUS 5.5", "r2": "SONNET 5.5", "r3": "OPUS 5.5", "r4": "OPUS 5.5"}
for fn, lab in labels.items(): check(f"{fn} shows '{lab}'", lab in body(fn))
check("r3 shows 'HAIKU 5.5' for the haiku", "HAIKU 5.5" in body("r3"))
check("AngioView (r5) names no model", not re.search(r"OPUS|SONNET|HAIKU|Opus|Sonnet", body("r5")))
check("narration: no model for AngioView", not re.search(r"five-point-five|5\.5", LINES[6][3] + LINES[6][4]))
# 4. creators credited, labels present, no unsupported claims
for k, (n, h) in {"A": ("Dilum Sanjaya", "@DilumSanjaya"), "B": ("Kevin Ngo", "@kevin_t_ngo"), "C": ("Harshpreet Singh", "@harshpreet931"),
                  "D": ("The Bugged Dev", "@thebuggeddev"), "E": ("Annas Rahman, MD", "@AnnasRahmanMD"), "F": ("Kevin Ngo", "@kevin_t_ngo")}.items():
    check(f"credit {k}: {n} {h}", f"'{n}', '{h}'" in SRC and re.search(rf"credit\(c, '{k}'", SRC))
for lab in ["PROTOTYPE · not a verified emergency-response system", "EDUCATIONAL TOOL · not a clinically validated diagnostic system",
            "Projects featured by @claudeai. Original creators credited.", "Actor: stock footage (Mixkit)", "SOURCE: @claudeai ON X"]:
    check(f"label: {lab}", lab in SRC)
lyr = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
check("no 'community' claim (voice, captions, screen)", not re.search(r"communit", SRC + json.dumps(lyr, ensure_ascii=False), re.I))
# 5. the actor: Mixkit Free License clips only
FREE = {"51602", "51605", "51606", "51607", "51610", "51611", "51612", "51613", "51614"}
ids = {re.search(r"(\d{5})", f).group(1) for f, *_ in ACTOR_SHOTS.values()}
check("actor clips are all Mixkit Free License (checked on their pages)", ids <= FREE, f"{sorted(ids)}")
# 6. voice lines don't overlap and end inside the reel
ov = [(a["key"], b["key"]) for a, b in zip(lyr, lyr[1:]) if a["end"] > b["start"] - 0.05]
check("voice lines don't overlap", not ov, str(ov)); check("voice ends before the reel does", lyr[-1]["end"] < DURATION - 0.5, f"{lyr[-1]['end']:.2f} s")
# 7. sync: chapter cuts on beats, marks and events on the eighth-note grid
g = BEAT / 2; off = lambda x, q: abs(x - round(x / q) * q) > 1e-3
check("chapter cuts on beats", not [s for _, s, _ in CHAPTERS if off(s, BEAT)], ", ".join(f"{s:g}" for _, s, _ in CHAPTERS))
ev = json.loads((D / "cues.json").read_text())["events"]
check("every event on the 0.25 s grid", not [k for k, v in ev.items() if off(v, g)], f"{len(ev)} events")
# 8. the video, if given
if len(sys.argv) > 1:
    vid = pathlib.Path(sys.argv[1])
    pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-show_streams", "-of", "json", str(vid)], capture_output=True, text=True).stdout)
    vs = next(s for s in pr["streams"] if s["codec_type"] == "video"); fps = eval(vs["r_frame_rate"]); n = int(vs["nb_read_frames"])
    check("1080x1920", (vs["width"], vs["height"]) == (1080, 1920), f"{vs['width']}x{vs['height']}")
    check("60 fps", abs(fps - 60) < 0.01, f"{fps:g}"); check(f"{round(DURATION * 60)} frames", n == round(DURATION * 60), str(n))
    r = subprocess.run(["ffmpeg", "-nostats", "-i", str(vid), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    L = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]); TP = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
    check("-14 LUFS (+-0.5)", abs(L + 14) <= 0.5, f"{L} LUFS"); check("true peak under -1 dBTP", TP <= -1.0, f"{TP} dBTP")
(ROOT / "projects" / "claude-reveals" / "QC-auto_v1.json").write_text(json.dumps({"checks": checks, "passed": sum(c["pass"] for c in checks), "total": len(checks)}, indent=1))
print(f"{sum(c['pass'] for c in checks)}/{len(checks)} passed")
