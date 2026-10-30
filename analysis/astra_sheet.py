"""The ASTRA.EXE reel's narration and timing sheet (projects/astra-exe/output/narration_timing.md) and its storyboard
(projects/astra-exe/output/storyboard.json): voice lines, caption bursts, on-screen text, camera shots, the simulation's events
and the cut points, with frame numbers at 60 fps. Built from data/astra/lyrics.json and output/cues.json (the real event times).

    python analysis/astra_sheet.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
O = ROOT / "projects" / "astra-exe" / "output"
FPS = 60
f = lambda t: int(round(t * FPS))
ts = lambda t: f"{int(t // 60)}:{t % 60:05.2f}"

# camera shots per sequence (reel/shots.ts), in the brief's shot letters where they apply
CAMERA = [
    (0.00, 0.50, "hook", "Whole floating mountain from its side; the arrow crosses the frame from the left"),
    (0.50, 3.00, "hook", "Impact (shake); push in among the boulders flying at the camera, slowing to 0.1x"),
    (3.00, 3.85, "hook", "Time freezes; fast pull back along the arrow's path to the bow (SHOT G style reveal)"),
    (3.85, 4.65, "hook", "Hold: the bow in front, the frozen burst beyond"),
    (4.65, 6.55, "bow", "SHOT A weapon reveal: slow orbit round the Astral Bow"),
    (6.55, 7.50, "bow", "Macro along the upper limb's engraving"),
    (7.50, 11.95, "bow", "SHOT B string macro: the cursor grabs the nock and pulls"),
    (11.95, 14.75, "bow", "Game view above the real control panel: Vajra Pulse, DRAW POWER 20 -> 100%, aim"),
    (14.75, 15.00, "bow", "SHOT C along the glowing arrow"),
    (15.00, 16.13, "bow", "SHOT D follow the arrow"),
    (16.13, 17.13, "bow", "SHOT E impact, wide"),
    (17.13, 21.00, "bow", "SHOT F slow motion among the tumbling pieces"),
    (21.00, 22.85, "m-vajra", "Low angle on the upper rim: Vajra Pulse"),
    (22.85, 24.65, "m-agni", "Close, right side: Agni Wave's heat front"),
    (24.65, 26.45, "m-vayu", "Wide from the front left: the Vayu vortex"),
    (26.45, 31.00, "m-cosmic", "Wide frontal orbit: Cosmic float, then the collapse"),
    (31.00, 32.00, "lab", "SHOT G interactive reveal: pull back from the bow to the panel"),
    (32.00, 36.64, "lab", "Game view above the panel: gravity Moon, power 70 -> 40 -> 55%, Crystal, FIRE"),
    (36.64, 38.53, "lab", "Behind and above the bow: the tall Moon-gravity arc"),
    (38.53, 42.00, "lab", "The crystal shatters; time scale 0.25x, gravity Extreme, back to 1x"),
    (42.00, 43.90, "impossible", "Establishing: the three rings strung along the arc to the crystal"),
    (43.90, 47.20, "impossible", "Fly the course: ring 1, 2, 3, the marked crystal"),
    (47.20, 49.10, "impossible", "Game view: the cursor draws to 85%, aims (preview shows the first quarter)"),
    (49.10, 51.12, "impossible", "Follow the arrow through the rings"),
    (51.12, 53.00, "impossible", "Impact: the crystal shatters in slow motion; PERFECT SHOT"),
    (53.00, 58.08, "code", "The live app in a browser frame over real source excerpts; the cursor pulls and releases"),
    (58.08, 59.55, "code", "The hit inside the browser frame (real rigid-body counts)"),
    (59.55, 61.00, "code", "MAGIC: out of the frame, full screen"),
    (61.00, 65.00, "cta", "SHOT H final hero frame: the bow above the clouds, the broken mountain behind; slow pull away"),
]
TEXT = [
    (0.55, 2.85, "LEGENDARY WEAPONS / × REAL-TIME PHYSICS 😳"),
    (3.05, 4.55, "WHAT IF LEGENDARY WEAPONS HAD PHYSICS?"),
    (3.75, 4.55, "I MADE THEM INTERACTIVE."),
    (5.00, 11.60, "tag: IN-ENGINE · REAL PHYSICS"),
    (8.05, 11.50, "GRAB • PULL • AIM • RELEASE (word by word: 8.05, 8.55, 9.35, 10.15)"),
    (13.30, 14.70, "POWER: 100%"),
    (16.33, 20.60, "tag: VAJRA PULSE · impact multiplier 1.8× (fantasy)"),
    (21.05, 22.75, "4 CELESTIAL MODES ⚡🔥🌪️🌌"),
    (21.13, 22.80, "⚡ VAJRA PULSE · impulse + shockwave + lightning"),
    (23.04, 24.60, "🔥 AGNI WAVE · heat front (shader), pieces crack loose"),
    (24.84, 26.40, "🌪️ VAYU STORM · wind field: lift + swirl"),
    (26.75, 30.95, "🌌 COSMIC FRACTURE · time slows, gravity suspended (fiction)"),
    (31.55, 35.20, "INTERACTIVE 3D PHYSICS LAB (+ the live rigid-body readout)"),
    (42.25, 44.40, "CHALLENGE: THE IMPOSSIBLE SHOT"),
    (45.10, 47.00, "callouts: RING 1 / RING 2 / RING 3 / FINAL TARGET"),
    (51.27, 52.95, "PERFECT SHOT ✓ · 3 / 3 rings · target hit · challenge complete"),
    (55.62, 60.85, "CODE → PHYSICS → MAGIC (55.62, 57.35, 59.55)"),
    (61.20, 65.00, "WHAT SHOULD I SIMULATE NEXT?"),
    (62.30, 65.00, "COMMENT ASTRA (button with a bow-and-arrow mark)"),
    (62.80, 65.00, "ASTRA.EXE · Ancient Legends, Modern Physics"),
]


def main():
    L = json.loads((ROOT / "data" / "astra" / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    C = json.loads((O / "cues.json").read_text())
    cues, sb = C["cues"], C["storyboard"]
    events = [c for c in cues if c["type"] in ("launch", "impact", "ring", "won")]
    # caption bursts as the overlay makes them (2-4 words, broken after punctuation)
    bursts = []
    for l in L:
        cur = []
        for w in l["words"]:
            cur.append(w)
            if len(cur) >= 4 or (len(cur) >= 2 and w["w"][-1] in ",.!?…।—"): bursts.append(cur); cur = []
        if cur: bursts.append(cur)
    md = ["# ASTRA.EXE reel: narration and timing sheet", "",
          "65.000 s · 1080×1920 · 60 fps (3900 frames). Times in seconds; `f` = frame number at 60 fps. The voice is ElevenLabs Liam "
          "(eleven_turbo_v2_5, Hindi, seed 11), one take cut into word groups at story anchors. The simulation's event times are real "
          "(from `cues.json`).", "", "## Voiceover (word for word)", "", "| # | Section | Start | End | f | Line |", "|---|---|---|---|---|---|"]
    for i, l in enumerate(L): md.append(f"| {i + 1} | {l['chapter']} | {l['start']:.2f} | {l['end']:.2f} | {f(l['start'])} | {l['text']} |")
    md += ["", "## Captions (2–4 word bursts, Roman Hinglish, centred at y 1450, inside the safe zone)", "", "| Start | f | Words |", "|---|---|---|"]
    for b in bursts: md.append(f"| {b[0]['start']:.2f} | {f(b[0]['start'])} | {' '.join(w['w'] for w in b)} |")
    md += ["", "## On-screen text", "", "| From | To | f | Text |", "|---|---|---|---|"]
    for a, b, tx in TEXT: md.append(f"| {a:.2f} | {b:.2f} | {f(a)} | {tx} |")
    md += ["", "## Camera", "", "| From | To | f | Sequence | Shot |", "|---|---|---|---|---|"]
    for a, b, s, d in CAMERA: md.append(f"| {a:.2f} | {b:.2f} | {f(a)} | {s} | {d} |")
    md += ["", "## Simulation events (measured)", "", "| t | f | Event |", "|---|---|---|"]
    for e in events:
        what = {"launch": f"arrow released ({e.get('mode')})", "impact": f"impact: {e.get('mode')} ({e.get('broken')} pieces broke)", "ring": f"ring {e.get('idx', 0) + 1} passed", "won": "challenge won"}[e["type"]]
        md.append(f"| {e['t']:.3f} | {f(e['t'])} | {what} |")
    md += ["", "## Cut points (shot starts)", "", "| Shot | Start | End | f |", "|---|---|---|---|"]
    for s in sb: md.append(f"| {s['id']} | {s['t0']:.2f} | {s['t1']:.2f} | {f(s['t0'])} |")
    md += ["", "## Sound", "",
           "Original score at 96 BPM, first downbeat 0.5 s (`beat-grid.json`). Every big fracture lands on the grid and gets a hit: "
           + ", ".join(f"{e['t']:.2f}" for e in events if e["type"] == "impact") + ". Foley is driven by the simulation's own launches, impacts, "
           "breaks, collisions and ring passes, plus UI clicks, cuts and title slams. There is a brief silence after the hook's hit "
           "(0.55–1.2 s), a tape stop and start around the 0.25× slow motion (39.45–41.7 s), and a celestial chime at 64.1 s.",
           "", "No-music version for Instagram's licensed library: `reel_nomusic.mp4` (voice + foley)."]
    (O / "narration_timing.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    story = {"duration": 65.0, "fps": FPS, "frames": 3900, "width": 1080, "height": 1920,
             "shots": [{**s, "frame0": f(s["t0"]), "frame1": f(s["t1"])} for s in sb],
             "camera": [{"from": a, "to": b, "frame": f(a), "sequence": s, "shot": d} for a, b, s, d in CAMERA],
             "on_screen_text": [{"from": a, "to": b, "frame": f(a), "text": tx} for a, b, tx in TEXT],
             "voice": [{"start": l["start"], "end": l["end"], "frame": f(l["start"]), "text": l["text"], "words": l["words"]} for l in L],
             "captions": [{"start": b[0]["start"], "frame": f(b[0]["start"]), "text": " ".join(w["w"] for w in b)} for b in bursts],
             "events": [{"t": e["t"], "frame": f(e["t"]), **{k: v for k, v in e.items() if k != "t"}} for e in events]}
    (O / "storyboard.json").write_text(json.dumps(story, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {O / 'narration_timing.md'} and storyboard.json: {len(L)} voice groups, {len(bursts)} caption bursts, {len(events)} events")


if __name__ == "__main__":
    main()
