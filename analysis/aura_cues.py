"""The Editor's Aura storyboard as data -> data/aura/cues.json. The song is the timeline: every segment boundary and event is a
measured bar, beat or eighth of data/aura/song_map.json (made by analysis/aura_songmap.py), never a guess. The first phrase
(0-10.105 s) is the Dhurandhar intro: its events (dh.*) are its measured words and hits (data/aura/intro.json), not the grid.

  segments  [start, end, world, params]: what is on screen (the scene dispatches each world)
  events    named times (all on the grid)
  montage   the "Nuclear Bomb" phrase: volcano intercut with the IDE / preview / timeline on eighths
  flashes   the six export flashes (sixteenths, as the bass comes back)
  sfx       secondary foley, each on an event (typing, Enter, whooshes, impacts), mixed under the song

    python analysis/aura_cues.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data" / "aura"
SM = json.loads((D / "song_map.json").read_text(encoding="utf-8"))
E8, BEAT, BAR = SM["eighth"], SM["beat"], SM["bar"]
bar = lambda k: round(k * BAR, 4)
e8 = lambda k: round(k * E8, 4)
at = lambda b, n8=0: round(b * BAR + n8 * E8, 4)          # bar b, plus n8 eighths
A = SM["anchors"]
IN = json.loads((D / "intro.json").read_text(encoding="utf-8"))


def main():
    ev = {
        # 01 the cinematic intro on Dhurandhar: the line word by word, cuts on its measured hits, Dubplate slams in on bar 4
        **{f"dh.{w['w'].lower()}": w["t"] for w in IN["words"]}, **{f"dh.hit{i + 1}": h for i, h in enumerate(IN["hits"])},
        "dh.xfade": IN["xfade"]["dub_in_from"], "dh.slam": bar(4),
        # 02 the workstation wakes (real IDE recording + screenshots)
        "ide.in": bar(4), "ide.model": at(4, 4), "check.0": bar(5), "assets.in": bar(6), "prompt1.type": at(6, 2), "prompt1.enter": bar(7),
        **{f"stage.{i}": at(7, 2 * i) for i in range(5)},
        # the renders: each 3 bars, then a 1-bar roundtrip whose Enter lands on the next phrase line
        "r1.in": bar(8), "r1.title": bar(10), "r1.cursor": at(10, 6), "rt1.in": bar(11), "rt1.type": at(11, 1), "rt1.enter": bar(12),
        "r2.in": bar(12), "r2.page": bar(13), "r2.chart": at(13, 4), "r2.device": bar(14), "r2.title": at(14, 2), "r2.flip": at(14, 6),
        "rt2.in": bar(15), "rt2.drop1": at(15, 1), "rt2.drop2": at(15, 3), "rt2.play": at(15, 5), "rt2.morph": at(15, 7),
        "r3.in": bar(16), "r3.fracture": bar(17), "r3.corridor": at(17, 4), "r3.title": at(18, 2), "r3.lens": at(18, 7),
        "rt3.in": bar(19), "rt3.lamp": at(19, 2), "rt3.type": at(19, 3), "rt3.enter": bar(20),
        "r4.in": bar(20), "r4.assemble": bar(21), "r4.hero": bar(22), "r4.title": at(22, 2), "r4.reflect": at(22, 6),
        "rt4.in": bar(23), "rt4.artifact": at(23, 1), "rt4.fix": at(23, 2), "rt4.sheet": at(23, 5), "rt4.pass": at(23, 6), "rt4.dive": at(23, 7),
        "r5.in": bar(24), "r5.erupt": bar(26), "r5.title": bar(27), "r5.rock": at(27, 7),
        "r6.in": bar(28), "r6.brake": at(28, 2), "r6.crew": at(28, 4), "r6.off": bar(29), "r6.on": at(29, 6), "r6.drop": at(30, 4),
        "r6.launch": bar(31), "r6.wheel": at(31, 6),
        # Act III: the impossible timeline, the click, export, the flashes, the aura
        "fin.timeline": bar(32), "fin.macro": at(32, 4), "fin.dawn": bar(33), "fin.nudge": at(33, 6), "fin.click": bar(34),
        "fin.export": A["gap1"], "fin.back": A["bass_back"], "fin.line1": A["gap2"], "fin.line2": A["final_slam"], "fin.black": A["cut_to_black"],
    }
    seg = [
        [0.0, bar(4), "orbit", {}],
        [bar(4), at(4, 4), "ide", {"shot": "rec"}], [at(4, 4), bar(5), "ide", {"shot": "model"}], [bar(5), bar(6), "ide", {"shot": "check"}],
        [bar(6), bar(7), "ide", {"shot": "prompt", "prompt": 1}], [bar(7), bar(8), "ide", {"shot": "stages"}],
        [bar(8), bar(11), "r1", {}], [bar(11), bar(12), "ide", {"shot": "prompt", "prompt": 2, "room": "golden"}],
        [bar(12), bar(15), "r2", {}], [bar(15), bar(16), "editor", {"mode": "drop"}],
        [bar(16), bar(19), "r3", {}], [bar(19), bar(20), "ide", {"shot": "prompt", "prompt": 3, "room": "night"}],
        [bar(20), bar(23), "r4", {}], [bar(23), bar(24), "ide", {"shot": "fix", "prompt": 4}],
        [bar(24), bar(28), "r5", {}],                      # with the montage intercuts on top (below)
        [bar(28), bar(32), "r6", {}],
        [bar(32), A["final_slam"], "editor", {"mode": "final"}], [A["final_slam"], SM["duration"], "aura", {}],
    ]
    # the "Nuclear Bomb" phrase: intercuts (2 eighths each) on the fast run; the eruption bar (bar 26) stays clean
    mont = []
    pattern = ["ide.code", None, "editor.snap", None, "ide.term", None, "preview", None]
    for b in (24, 25, 27):
        for k, w in enumerate(pattern):
            if w and not (b == 27 and k >= 6):
                mont.append([at(b, k + 1), at(b, k + 2), w])
    flashes = [[round(A["bass_back"] + i * E8 / 2, 4), w] for i, w in enumerate(["r1", "r2", "r3", "r4", "r5", "r6"])]
    sfx = [[ev["dh.hit2"], "whoosh", 0.25], [ev["dh.hit4"], "whoosh", 0.25], [ev["dh.hit5"], "dive", 0.4],
           [round(ev["dh.slam"] - 0.95, 4), "riser", 0.5], [ev["dh.slam"], "sub", 0.5],
           [ev["ide.in"], "tick", 0.3], *[[at(5, i), "tick", 0.32] for i in range(10)],
           *[[round(ev["prompt1.type"] + k * 0.055, 4), "key", 0.18] for k in range(28)], [ev["prompt1.enter"], "enter", 0.45],
           *[[ev[f"stage.{i}"], "tick", 0.28] for i in range(5)],
           *[[round(ev["rt1.type"] + k * 0.06, 4), "key", 0.16] for k in range(20)], [ev["rt1.enter"], "enter", 0.45],
           [ev["rt2.drop1"], "drop", 0.35], [ev["rt2.drop2"], "drop", 0.35], [ev["rt2.morph"], "whoosh", 0.4],
           *[[round(ev["rt3.type"] + k * 0.055, 4), "key", 0.16] for k in range(22)], [ev["rt3.enter"], "enter", 0.45],
           [ev["r4.assemble"], "clank", 0.35], [ev["r4.hero"], "clank", 0.3],
           [ev["rt4.fix"], "key", 0.2], [ev["rt4.pass"], "ping", 0.35], [ev["rt4.dive"], "dive", 0.45],
           [ev["r5.erupt"], "rumble", 0.55], [ev["r5.rock"], "whoosh", 0.4],
           [ev["r6.brake"], "screech", 0.35], *[[at(29, k), "gun", 0.3] for k in (0, 1, 2, 3)], *[[at(29, 6) + k * 0.12, "gun", 0.28] for k in range(2)],
           [ev["r6.launch"], "launch", 0.5],
           [ev["fin.click"], "click", 0.45], [ev["fin.export"], "enter", 0.4], *[[t, "flash", 0.3] for t, _ in flashes],
           [ev["fin.line2"], "sub", 0.5]]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx])
    out = {"duration": SM["duration"], "bpm": SM["bpm"], "eighth": E8, "beat": BEAT, "bar": BAR, "phrases": SM["phrases"],
           "segments": seg, "events": ev, "montage": mont, "flashes": flashes, "sfx": sfx,
           "notes": "0-10.105 s: the Dhurandhar intro's measured words and hits (data/aura/intro.json); from 10.105 s every time is a measured bar / beat / eighth of data/aura/song_map.json"}
    (D / "cues.json").write_text(json.dumps(out, indent=1))
    off = [k for k, v in ev.items() if not k.startswith("dh.") and abs(v / E8 - round(v / E8)) > 1e-3]
    dh = [k for k in ev if k.startswith("dh.")]
    print(f"{len(seg)} segments, {len(ev) - len(dh)} Dubplate events ({len(off)} off the eighth grid: {off}) + {len(dh)} intro events (measured words/hits), "
          f"{len(mont)} intercuts, {len(sfx)} foley cues")
    for s in seg: print(f"  {s[0]:6.2f}-{s[1]:6.2f} {s[2]:7s} {s[3]}")


if __name__ == "__main__":
    main()
