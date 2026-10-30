"""The Editor's Aura V2 (89 s) storyboard as data -> data/aura_v2/cues.json (the 51.6 s first cut is frozen in data/aura_v2_51s).
V2 replays V1's worlds on the V2 music (aura_v2_audio.py). Every range starts on a V2 bar line, and its V1 excerpt starts on a V1
bar line (the same measured grid), so each world's own beat choreography lands on the beat. Two ranges sit on the exact music
V1 cut them to: the volcano on the climax (V1 bars 24-27) and the pit stop + editor finale on the ending (V1 bars 29-35).
  edl       [a, b, kind, params]: 'intro_stock' (the stock-footage cinematic, V2 time), 'v1' (V1 at T0 + (t - a)), 'outro' (V2 time)
  cards     [a, b, prompt]: the prompt card held over a render for its whole range
  punches   [t, k]: a zoom punch, a chromatic split and a shake (post) on every cut and hit
  sfx       V1's foley mapped into each range, plus the intro, a whoosh into each cut, the outro
    python analysis/aura_v2_cues.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D1, D2 = ROOT / "data/aura", ROOT / "data/aura_v2"
C1 = json.loads((D1 / "cues.json").read_text()); SM = json.loads((D2 / "song_map.json").read_text())
BAR, BEAT, E8, DUR = SM["bar"], SM["beat"], SM["eighth"], SM["duration"]
bar = lambda k: round(k * BAR, 4)
at = lambda b, n8=0: round(b * BAR + n8 * E8, 4)
ev1 = C1["events"]; A = SM["anchors"]


def main():
    V = lambda a, b, v1bar, name, **kw: [bar(a), bar(b) if isinstance(b, int) else b, "v1", {"T0": round(v1bar * BAR, 5), "name": name, **kw}]
    edl = [
        [0.0, bar(4), "intro_stock", {}],
        V(4, 5, 4, "IDE · recording + model"),
        V(5, 6, 5, "IDE · BUILD CHECK"),
        V(6, 10, 24, "R05", render=5),                      # the volcano + V1's montage, on the climax it was cut to
        V(10, 11, 6, "IDE · prompt 01"),
        V(11, 14, 8, "R01", render=1),
        V(14, 15, 11, "IDE · prompt 02"),                   # R01's caret flies into the box, as in V1
        V(15, 18, 12, "R02", render=2),
        V(18, 21, 16, "R03", render=3),
        V(21, 22, 19, "IDE · prompt 03"),                   # R03's lens blows out into the room, as in V1
        V(22, 25, 20, "R04", render=4),
        V(25, 26, 23, "IDE · fix + contact sheet"),
        V(26, 29, 29, "R06", render=6),                     # native: the same music as in V1
        V(29, A["final_slam"], 32, "EDIT · final"),          # native: export on the bass dropout, the six flashes, the line
        [A["final_slam"], DUR, "outro", {}],
    ]
    PROMPT_OF = {1: 1, 2: 2, 4: 3, 5: 5, 6: 6}                # render -> its prompt (R03 was the editor roundtrip, no prompt)
    cards = [[a, b, PROMPT_OF[p["render"]]] for a, b, k, p in edl if k == "v1" and p.get("render") in PROMPT_OF]
    ev = {k: v for k, v in ev1.items() if k.startswith("dh.")}
    ev.update({"o.slam": A["final_slam"], "o.card": round(A["final_slam"] + BEAT, 4), "o.grid": bar(33), "o.push": bar(34), "o.fade": round(DUR - 1.1, 4), "o.end": DUR,
               **{f"o.tile{i}": at(33, i) for i in range(6)}, "nuke": A["chopper_intro"]})
    punches = [[ev[f"dh.hit{i}"], 0.8] for i in range(1, 6)] + [[ev["dh.slam"], 1.0]]
    for a, b, k, p in edl[1:]: punches.append([a, 1.0 if a in (bar(6), bar(10), bar(26), A["final_slam"]) else 0.65])
    INNER = (("r5.erupt", 1.0), ("r5.rock", 0.6), ("r1.title", 0.5), ("r2.page", 0.5), ("r2.device", 0.5), ("r3.fracture", 0.8), ("r3.corridor", 0.6),
             ("r4.assemble", 0.6), ("r4.hero", 0.9), ("r6.drop", 0.6), ("r6.launch", 0.9), ("fin.click", 0.5), ("fin.back", 0.6))
    for name, k in INNER:
        T = ev1[name]
        for a, b, kind, p in edl:
            if kind == "v1" and p["T0"] <= T < p["T0"] + (b - a): punches.append([round(a + T - p["T0"], 4), k])
    punches += [[bar(33), 0.35], [bar(34), 0.3]]
    punches = sorted({round(t, 4): k for t, k in punches}.items())
    sfx = [s for s in C1["sfx"] if s[0] < bar(4)]
    for a, b, kind, p in edl:
        if kind != "v1": continue
        for T, k, g in C1["sfx"]:
            if p["T0"] <= T < p["T0"] + (b - a) - 1e-6: sfx.append([round(a + T - p["T0"], 4), k, g])
    for a, b, kind, p in edl[2:-1]: sfx.append([round(a - 0.42, 4), "whoosh", 0.2])
    sfx += [[A["final_slam"], "sub", 0.55], *[[ev[f"o.tile{i}"], "tick", 0.3] for i in range(6)], [bar(34), "ping", 0.25]]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx if 0 <= t < DUR])
    out = {"duration": DUR, "bpm": SM["bpm"], "eighth": E8, "beat": BEAT, "bar": BAR, "phrases": SM["phrases"], "room": "rear",
           "edl": edl, "cards": cards, "punches": punches, "events": ev, "sfx": sfx,
           "notes": "V2 (89 s): each 'v1' range plays V1's measured choreography from a bar line T0; the intro (stock footage) and outro are V2-native"}
    (D2 / "cues.json").write_text(json.dumps(out, indent=1))
    off = [a for a, b, k, p in edl[1:] if abs(a / E8 - round(a / E8)) > 1e-3 or (k == "v1" and abs(p["T0"] / E8 - round(p["T0"] / E8)) > 1e-3)]
    print(f"V2: {len(edl)} ranges ({len(off)} off the grid), {len(cards)} prompt cards, {len(punches)} punches, {len(sfx)} foley cues")
    for a, b, k, p in edl: print(f"  {a:6.2f}-{b:6.2f} {k:11s} {p.get('name', '')} {('T0 ' + str(round(p['T0'], 3))) if 'T0' in p else ''}")


if __name__ == "__main__":
    main()
