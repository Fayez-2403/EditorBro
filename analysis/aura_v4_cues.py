"""The Editor's Aura V4 storyboard as data -> data/aura_v4/cues.json (V1, V2, V2-51s, V3 are kept). The music is aura_v4_audio.py
(28.34 s: Dubplate V1 bars 23-27 + 32 to the fade, re-phased to the measured accents). Renders only, one continuous run:
  bar 0      the hook: eight renders, one per eighth, under "9 RENDERS. ALL CODE. CLAUDE OPUS 5.5"
  2.53       "...NUCLEAR" on the drop, "BOMB" = the volcano's eruption (R05 timed so its eruption is the measured beat-2 hit)
  5.05-10.1  the fast run, a cut every half bar: ink (light), chrome, bounce (light), product UI ("talk to the boys...")
  10.1       the robot pop-locks on the run's syllables (V4-native: "...the woman... the man...")
  12.63      the join, "talk to the | COMPUTER TONGUE": kinetic type (light) -> "tougher than a LION" (claw tear) -> the shader
             ("SOUND TEST") -> the pit stop: slow-mo under water while the bass is out ("going under"), the launch exactly on the
             measured bass return, a freeze through the last gap ("NUMBER ONE"), V2's outro on the final slam (9 tiles)
Every cut and punch is snapped to its measured transient (V4's 1 ms onsets, +-25 ms of the grid); the render choreography keeps its
grid anchor `ag`, so a V1 render still lands on its own bars.
    python analysis/aura_v4_cues.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D1, D4 = ROOT / "data/aura", ROOT / "data/aura_v4"
C1 = json.loads((D1 / "cues.json").read_text()); SM = json.loads((D4 / "song_map.json").read_text()); AU = json.loads((D4 / "audio.json").read_text())
BAR, BEAT, E8, DUR = SM["bar"], SM["beat"], SM["eighth"], SM["duration"]
ev1, AN = C1["events"], SM["anchors"]
HERO = {"r1": 25.6, "r2": 34.3, "r3": 43.1, "r4": 56.4, "r5": 67.9, "r6": 78.9}
DRUM = sorted([t for t, s in AU["onsets"]["kick"] + AU["onsets"]["snare"] if s >= 0.5])
b = lambda k: round(k * BAR, 5)


def snap(tg, win=0.025):
    """The measured drum transient nearest the grid time tg (within win), else tg."""
    near = min(DRUM, key=lambda x: abs(x - tg)); return round(near if abs(near - tg) <= win else tg, 4)


def word(w, after=0.0):
    return next(x["t"] for x in SM["words"] if x["w"].lower().strip(".,?!") == w and x["t"] >= after)


def main():
    edl, snaps = [], []
    # ---- the hook bar: eight renders, one per eighth (the volcano is kept for the drop)
    TEASE = [("r8", {"lt": 0.9}), ("r4", {}), ("r1", {}), ("r3", {}), ("r9", {"lt": 1.0}), ("r6", {}), ("r2", {}), ("r7", {"lt": round(2 * BAR + 1.2 * BEAT, 4)})]
    for i, (w, o) in enumerate(TEASE):
        a, z = (snap(i * E8) if i else 0.0), snap((i + 1) * E8)
        if w in HERO: edl.append([a, z, "v1", {"w": w, "T0": HERO[w], "ag": round(i * E8, 5), "name": f"hook {w}"}])
        else: edl.append([a, z, w, {"t0": round(i * E8 - o["lt"], 4), "name": f"hook {w}"}])
    # ---- the run
    bomb = snap(b(1) + BEAT)                                               # "BOMB": the beat-2 hit after the drop
    u0, u1 = AN["measured_dropouts"][0]; f0 = AN["measured_dropouts"][1][0]; slam = AN["final_slam"]
    launch = ev1["r6.launch"]; Tu0 = launch - 0.35 * (u1 - u0); Ta = Tu0 - (u0 - b(7)); Tf0 = launch + (f0 - u1)
    RUN = [  # (grid start, grid end, kind, params, label)
        (b(1), b(2), "v1", {"w": "r5", "T0": ev1["r5.erupt"] - BEAT, "ag": round(bomb - BEAT, 4)}, ("R05", "VOLCANO", "#FFB547")),
        (b(2), b(2.5), "r8", {"t0": b(2)}, ("R08", "INK", "#FF6A4D")),
        (b(2.5), b(3), "v1", {"w": "r4", "T0": ev1["r4.hero"] - 2 * E8, "ag": b(2.5)}, ("R04", "CHROME + GLASS", "#4C8DFF")),
        (b(3), b(3.5), "v1", {"w": "r2", "T0": 13.25 * BAR, "ag": b(3)}, ("R02", "PRODUCT UI · FICTIONAL", "#3FD6E0")),   # "Every frame, on the beat."
        (b(3.5), b(4), "r9", {"t0": b(3.5)}, ("R09", "BOUNCE", "#FF8DA1")),                                     # its white sky holds "talk to the boys..." 
        (b(4), b(5), "r7", {"t0": b(1)}, ("R07", "ROBOT DANCE", "#D97757")),           # native: lt = bar 3, the syllable pop-locks
        (b(5), b(6), "v1", {"w": "r1", "T0": 9.5 * BAR, "ag": b(5)}, ("R01", "KINETIC TYPE", "#C8F31D")),
        (b(6), b(7), "v1", {"w": "r3", "T0": ev1["r3.fracture"], "ag": b(6)}, ("R03", "AUDIO SHADER", "#9B7BFF")),
        (b(7), slam, "v1", {"w": "r6", "tmap": [[b(7), round(Ta, 4)], [u0, round(Tu0, 4)], [u1, launch], [f0, round(Tf0, 4)], [slam, round(Tf0, 4)]]}, ("R06", "PIT STOP · CG", "#FF5A5F")),
    ]
    labels = []
    for n, (a, z, kind, p, (key, name, col)) in enumerate(RUN):
        A_ = snap(a) if n else a; Z = snap(z) if z != slam else slam
        if n == 0: A_ = edl[-1][1]
        edl.append([A_, Z, kind, {**p, "name": f"{key} {name}"}]); labels.append({"a": A_, "b": Z, "n": n, "key": key, "name": name, "col": col}); snaps.append(round((A_ - a) * 1000, 1))
    edl.append([slam, DUR, "outro", {"name": "outro"}])
    for i in range(len(edl) - 1): edl[i][1] = edl[i + 1][0]                 # contiguous
    cut = lambda i: edl[i][0]
    R = {x[3]["name"].split()[0]: i for i, x in enumerate(edl) if x[3]["name"][0] == "R"}
    # ---- transitions, centred on the cuts (the claw opens on "tougher", before its cut)
    tough = word("tougher")
    xf = [[cut(R["R05"]), "flash", round(cut(R["R05"]) - 0.05, 4), round(cut(R["R05"]) + 0.07, 4), {}],
          [cut(R["R08"]), "burn", round(cut(R["R08"]) - 0.17, 4), round(cut(R["R08"]) + 0.17, 4), {"seed": 1}],
          [cut(R["R04"]), "ink", round(cut(R["R04"]) - 0.26, 4), round(cut(R["R04"]) + 0.08, 4), {"seed": 2, "c": [0.5, 0.52]}],
          [cut(R["R02"]), "zoom", round(cut(R["R02"]) - 0.15, 4), round(cut(R["R02"]) + 0.15, 4), {"c": [0.5, 0.54]}],
          [cut(R["R09"]), "whip", round(cut(R["R09"]) - 0.12, 4), round(cut(R["R09"]) + 0.12, 4), {}],
          [cut(R["R07"]), "iris", round(cut(R["R07"]) - 0.08, 4), round(cut(R["R07"]) + 0.2, 4), {"c": [0.5, 0.4]}],
          [cut(R["R01"]), "slice", round(cut(R["R01"]) - 0.12, 4), round(cut(R["R01"]) + 0.14, 4), {"seed": 3}],
          [cut(R["R03"]), "claw", round(tough, 4), round(cut(R["R03"]) + 0.06, 4), {"seed": 4}],
          [cut(R["R06"]), "zoom", round(cut(R["R06"]) - 0.15, 4), round(cut(R["R06"]) + 0.15, 4), {"c": [0.5, 0.5]}]]
    # (the slam into the outro is a hard cut: V2's outro brings its own white flash, and a second one stacked on it blanked 3 frames)
    fx = {"under": [u0, u1], "splash": u1, "freeze": [f0, slam]}
    # ---- captions (the song's words, snapped to the vocal onsets)
    W = lambda w, after=0.0: word(w, after)
    caps = [
        {"kind": "hook", "t0": 0.0, "t1": round(W("like") - 0.03, 4), "lines": [["9 RENDERS.", -0.1], ["ALL CODE.", snap(BEAT)], ["CLAUDE OPUS 5.5", snap(2 * BEAT)]]},
        {"kind": "nuke", "t0": round(W("like") - 0.03, 4), "t1": round(b(1) + 2.1, 4), "w": {"like": W("like"), "a": W("a", W("like")), "nuclear": W("nuclear"), "bomb": bomb}},
        {"kind": "talk", "t0": round(W("talk") - 0.03, 4), "t1": round(W("talk", 12.0) - 0.04, 4), "talks": [x["t"] for x in SM["words"] if x["w"].lower().startswith("talk") and x["t"] < 12.0],
         "nouns": [["BOYS", W("boys")], ["GIRLS", W("girls")], ["WOMAN", W("woman")], ["MAN", W("man")]], "crowd": W("virgin")},
        {"kind": "computer", "t0": round(W("talk", 12.0) - 0.04, 4), "t1": round(W("go") - 0.03, 4), "w": {"talk": W("talk", 12.0), "computer": W("computer"), "tongue": W("tongue")}},
        {"kind": "lion", "t0": round(W("go") - 0.03, 4), "t1": round(W("sound") - 0.4, 4), "w": {"go": W("go"), "tougher": tough, "than": W("than"), "lion": W("lion", 15.0)}},
        {"kind": "sound", "t0": round(W("sound") - 0.05, 4), "t1": round(u0 - 0.15, 4), "w": {"sound": W("sound"), "test": W("test")}},
        {"kind": "under", "t0": u0, "t1": round(u1 + 0.3, 4), "w": {"going": W("going"), "under": W("under")}, "gap": [u0, u1]},
        {"kind": "one", "t0": round(W("number") - 0.05, 4), "t1": slam, "w": {"number": W("number")}},
    ]
    # ---- punches (measured transients) and the outro's events
    punches = [[0.0, 0.6]] + [[x[0], 0.45] for x in edl[1:8]] + [[cut(R["R05"]), 1.0], [bomb, 1.0]]
    punches += [[x[0], 0.7] for x in edl[R["R08"]:R["R06"] + 1]] + [[u1, 1.0], [slam, 1.0]]
    punches += [[snap(b(k)), 0.4] for k in (1.5, 4.5, 5.5, 6.5)]
    punches += [[W(w), s] for w, s in (("boys", 0.3), ("girls", 0.3), ("woman", 0.3), ("man", 0.3), ("computer", 0.5), ("tongue", 0.4), ("lion", 0.9), ("sound", 0.4), ("test", 0.5), ("under", 0.4), ("number", 0.6))] + [[tough, 0.8]]
    punches = sorted({round(t, 4): k for t, k in punches}.items())
    ev = {"o.slam": slam, "o.card": round(slam + BEAT, 4), "o.grid": round(slam + BAR, 4), "o.push": round(slam + 2 * BAR, 4), "o.fade": round(DUR - 1.1, 4), "o.end": DUR,
          **{f"o.tile{i}": round(slam + BAR + i * E8, 4) for i in range(9)}, "bomb": bomb}
    tiles = [{"key": f"r{i + 1}", "name": n, "col": c} for i, (n, c) in enumerate([("TYPE", "#C8F31D"), ("PRODUCT UI", "#3FD6E0"), ("SHADER", "#9B7BFF"), ("CHROME", "#4C8DFF"), ("VOLCANO", "#FFB547"),
                                                                                    ("PIT STOP", "#FF5A5F"), ("ROBOT", "#D97757"), ("INK", "#FF6A4D"), ("BOUNCE", "#FF8DA1")])]
    # ---- foley: light (the song carries it): a riser into the drop, impacts, whooshes into the transitions, the outro's ticks
    sfx = [[round(cut(R["R05"]) - 0.95, 4), "riser", 0.45], [cut(R["R05"]), "sub", 0.55], [bomb, "drop", 0.5]]
    sfx += [[round(x[0] - 0.42, 4), "whoosh", 0.22] for x in xf[1:]]
    sfx += [[round(W("computer") + k * 0.016, 4), "key", 0.12] for k in range(8)] + [[u1, "sub", 0.4], [W("number"), "flash", 0.3]]
    sfx += [[slam, "sub", 0.55], *[[ev[f"o.tile{i}"], "tick", 0.28] for i in range(9)], [ev["o.push"], "ping", 0.25]]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx if 0 <= t < DUR])
    out = {"duration": DUR, "bpm": SM["bpm"], "eighth": E8, "beat": BEAT, "bar": BAR, "edl": edl, "xf": xf, "fx": fx, "captions": caps, "labels": labels,
           "punches": punches, "events": ev, "tiles": tiles, "sfx": sfx,
           "notes": "V4: renders only; cuts and punches snapped to V4's measured transients; the music math is in song_map.json `math`"}
    (D4 / "cues.json").write_text(json.dumps(out, indent=1))
    grid = lambda t: abs(t / E8 - round(t / E8)) * E8 * 1000
    print(f"V4 {DUR} s: {len(edl)} ranges, {len(xf)} transitions, {len(caps)} captions, {len(punches)} punches, {len(sfx)} foley; "
          f"run cuts vs grid (ms) {[round(grid(x[0]), 1) for x in edl[8:-1]]}; snap deltas {snaps}")
    for a, z, k, p in edl: print(f"  {a:6.3f}-{z:6.3f} {k:6s} {p.get('name', '')} {('T0 ' + str(round(p['T0'], 3))) if 'T0' in p else ''}")


if __name__ == "__main__":
    main()
