"""The brief's QC for the Claude reveals reel v2, as code -> projects/claude-reveals/QC-auto.json (v1: reveals_qa_v1.py).

    python analysis/reveals_qa.py [<video.mp4>]
Checks the plan and the scene source (every source video used, 1.0x, the right model labels, no model on AngioView, every
creator credited, the safety labels, no "community" claim, the actor's licence, cuts on beats, events on the grid) and,
when a video is given, its format, frame count and loudness.
"""
import json, pathlib, re, subprocess, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_reveals_v2 import CLIPS, ACTOR_SHOTS, CHAPTERS, MARKS, BEAT, DURATION, LINES, ACTOR, PANS
import pkgfw_vo_v1 as v1   # ffmpeg on PATH

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "reveals_v2"
SRC = (ROOT / "app" / "src" / "scenes" / "reveals_v2.ts").read_text(encoding="utf-8")
checks = []
def check(name, ok, detail=""): checks.append({"check": name, "pass": bool(ok), "detail": detail}); print(f"{'PASS' if ok else 'FAIL'}  {name}  {detail}")
def body(fn):   # the source of one chapter method
    m = re.search(rf"\n  private {fn}\(c: CanvasRenderingContext2D.*?\n  \}}\n", SRC, re.S); return m.group(0) if m else ""

media = json.loads((D / "media.json").read_text())
# 1. every source video is in the reel, as an excerpt played at 1.0x
NEED = {"A2", "B", "C1", "C2", "D", "E", "F"}   # v2 plays the wildfire from A2 (A is v1's cut)
used = {k for k in NEED if re.search(rf"this\.clip\(c, (?:key|'{k}')", SRC) or (k in ("C1", "C2") and "'C1' : 'C2'" in SRC)}
check("every source video is used (A-F)", used == NEED, f"used {sorted(used)}")
for k, (f, a, b, fps) in ((k, CLIPS[k]) for k in sorted(NEED)):
    m = media[k]; n_exp = round((b - a) * fps)
    check(f"excerpt {k}: 1.0x ({m['n']} frames at {fps} fps for {b - a:.2f} s)", m["fps"] == fps and abs(m["n"] - n_exp) <= 2, f"{f} {a}-{b} s")
# 2. no hidden holds: each excerpt lasts as long as its window on screen (E: the whole clip, its last frame holds for the collapse)
win = {"A2": (PANS[0][0], PANS[1][1]), "B": (PANS[1][0], PANS[2][1]), "C1": (PANS[2][0], MARKS["r3.turn"]), "C2": (MARKS["r3.turn"], PANS[3][1]),
       "F": (PANS[3][0], PANS[4][1]), "D": (PANS[4][0], PANS[5][1]), "E": (PANS[5][0], MARKS["fin.impact"] + 0.45)}
for k, (s, e) in win.items():
    ln = CLIPS[k][2] - CLIPS[k][1]; hold = (e - s) - ln
    check(f"excerpt {k} covers its window ({e - s:.2f} s on screen, {ln:.2f} s of footage)", hold <= 0.01 or (k == "E" and hold <= 0.51),
          "the full clip; last frame held for the 0.5 s collapse" if k == "E" and hold > 0.01 else "")
# 3. the right model on each reveal, none on AngioView
labels = {"panelR1": "BUILT WITH OPUS 5.5", "panelR2": "SONNET 5.5", "panelR3a": "OPUS 5.5", "panelR3b": "HAIKU 5.5", "panelR4": "OPUS 5.5"}
for fn, lab in labels.items(): check(f"{fn} shows '{lab}'", lab in body(fn))
check("AngioView (panelR5) names no model", body("panelR5") and not re.search(r"OPUS|SONNET|HAIKU|Opus|Sonnet", body("panelR5")))
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
# 6b. the user's v2 asks (2026-10-21)
check("only two WHATs (no WHATTT)", [a[0] for a in ACTOR if a[0].startswith("what")] == ["what1", "what3"] and "'WHATTT" not in SRC)
check("'ye playable' is cut (voice, captions, screen)", not re.search(r"playable hai", SRC + json.dumps(lyr, ensure_ascii=False), re.I))
check("the thread scroll has no motion ghosts", not re.search(r"const ghosts|gI \* 26", SRC))
check("no intro or numbered insert sequences (ember, chessboard, rip, field-line intro, heartbeat intro, 01 launch, 05 impact)",
      not re.search(r"chessMorph|private rip\(|r5\.beat|post\.launch|r1\.ember|r5\.num|r4\.web", SRC))
narr = lyr   # any line (the slide into 05 follows the actor's "No. Way.")
late = [f"{a:.2f}" for a, b in PANS if not any(abs(l["end"] - a) < 0.6 or (l["end"] <= a + 0.2 and l["end"] > a - 0.6) for l in narr)]
check("every slide starts as a line ends (within 0.6 s)", not late, f"slides at {[a for a, _ in PANS]}" + (f", late: {late}" if late else ""))
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
(ROOT / "projects" / "claude-reveals" / "QC-auto_v2.json").write_text(json.dumps({"checks": checks, "passed": sum(c["pass"] for c in checks), "total": len(checks)}, indent=1))
print(f"{sum(c['pass'] for c in checks)}/{len(checks)} passed")
