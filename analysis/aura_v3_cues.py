"""The Editor's Aura V3 storyboard as data -> data/aura_v3/cues.json (V1, V2 and V2-51s are kept). The music is
aura_v3_audio.py: Dhurandhar cut down to 5.3 s, then Dubplate's build + climax (V1 bars 22-27), its verses in V1's order
(V1 4-21), its ending (V1 28-). Most V1 renders sit on the very bars they were choreographed to ("proper sync"); the new
robot dance is keyed to V3's own measured onsets.
  edl   'intro_v3' (the side shot, neck + knuckle cracks), 'major' (THE prompt with its skills), 'r7' (the robot dance),
        'v1' (V1 at T0 + (t - a); nomontage: no intercuts), 'outro'
  cards [a, b, prompt]: 0 = the major prompt, held over the drop; n = V1's prompt n, held over its render
  bot   [kind, t0, t1, params]: Claude's bot (an illustration) jumps out of the prompt box and does the editing
    python analysis/aura_v3_cues.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D1, D3 = ROOT / "data/aura", ROOT / "data/aura_v3"
C1 = json.loads((D1 / "cues.json").read_text()); SM = json.loads((D3 / "song_map.json").read_text())
BAR, BEAT, E8, DUR, I = SM["bar"], SM["beat"], SM["eighth"], SM["duration"], SM["intro_len"]
b = lambda k: round(I + k * BAR, 4)             # V3 bar k (counted from the Dubplate slam)
ev1 = C1["events"]; A = SM["anchors"]; IN = SM["intro"]
OFF_B, OFF_C = round(I + 6 * BAR - 4 * BAR, 4), round(I + 24 * BAR - 28 * BAR, 4)   # V3 = V1 + OFF for B and C
TL = {"x0": 64, "x1": 596, "top": 670, "th": 40, "gap": 5}                           # the editor's timeline (editor.ts)
COLS = {"r1": "#C8F31D", "r2": "#3FD6E0"}


def main():
    V = lambda a, z, v1bar, name, **kw: [b(a), b(z) if isinstance(z, int) else z, "v1", {"T0": round(v1bar * BAR, 5), "name": name, **kw}]
    edl = [
        [0.0, I, "intro_v3", {}],
        [b(0), b(2), "major", {"t0": b(0), "ty0": round(b(0) + 2 * E8, 4), "ty1": round(b(2) - 4 * E8, 4), "enter": round(b(2) - 3 * E8, 4)}],
        [b(2), b(6), "r7", {"t0": b(2), "hy": 140}],                     # the drop: "like a NUCLEAR BOMB" + the fast run
        V(6, 7, 4, "IDE · recording + model"), V(7, 8, 5, "IDE · BUILD CHECK"),
        V(8, 10, 26, "R05", render=5, nomontage=True),                  # the eruption (moved; bar-aligned)
        V(10, 13, 8, "R01", render=1), V(13, 14, 11, "IDE · prompt 02"),  # native from here: V1's own bars
        V(14, 17, 12, "R02", render=2), V(17, 18, 15, "EDIT · the bot drops R01 + R02"),
        V(18, 21, 16, "R03", render=3), V(21, 22, 19, "IDE · prompt 03"),
        V(22, 24, 21, "R04", render=4),                                  # assembly + hero (one bar early, bar-aligned)
        V(24, 28, 28, "R06", render=6),                                  # native
        V(28, A["final_slam"], 32, "EDIT · final"),                     # native: export on the bass dropout
        [A["final_slam"], DUR, "outro", {}],
    ]
    PROMPT_OF = {1: 1, 2: 2, 4: 3, 5: 5, 6: 6}
    cards = [[b(2), b(6), 0]] + [[x[0], x[1], PROMPT_OF[x[3]["render"]]] for x in edl if x[2] == "v1" and x[3].get("render") in PROMPT_OF]
    # the bot: out of the prompt box (the 2D bot leaps at the lens; the 3D one lands on the drop), the editor drop, the prompts, the finale
    X = lambda T: round(TL["x0"] + (T - 12) / 34 * (TL["x1"] - TL["x0"]), 1)
    v3B = lambda n: round(ev1[n] + OFF_B, 4); v3C = lambda n: round(ev1[n] + OFF_C, 4)
    bot = [
        ["popout", round(b(2) - 5 * E8, 4), b(2), {"from": [300, 548], "mid": [304, 380]}],
        ["carry", b(17), b(18), {"drops": [[v3B("rt2.drop1"), X(24.0), 840, COLS["r1"]], [v3B("rt2.drop2"), X(34.1), 840, COLS["r2"]]],
                                  "play": v3B("rt2.play"), "playAt": [304, 112], "morph": v3B("rt2.morph")}],
        ["type", b(13), b(14), {"x": 470, "y": 562}], ["type", b(21), b(22), {"x": 470, "y": 562}],
        ["finale", b(28), A["final_slam"], {"ev": {"macro": v3C("fin.macro"), "dawn": v3C("fin.dawn"), "nudge": v3C("fin.nudge"), "click": v3C("fin.click"),
                                                   "export": v3C("fin.export"), "flash": v3C("fin.back"), "line": v3C("fin.line1")},
                                            "at": {"idle": [530, 652], "nudge": [352, 806], "export": [522, 74], "line": [450, 700]}}],
        ["wave", A["final_slam"], DUR, {"x": 470, "y": 800, "bow": round(DUR - 1.6, 4)}],
    ]
    ev = {k: v for k, v in ev1.items() if k.startswith("dh.")}
    ev.update({"o.slam": A["final_slam"], "o.card": round(A["final_slam"] + BEAT, 4), "o.grid": b(33), "o.push": b(34), "o.fade": round(DUR - 1.1, 4), "o.end": DUR,
               **{f"o.tile{i}": round(b(33) + i * E8, 4) for i in range(6)}, "nuke": A["chopper_intro"], "neck1": ev1["dh.gentlemen"], "neck2": ev1["dh.ready"]})
    punches = [[ev["neck1"], 0.55], [ev["neck2"], 0.55], [ev1["dh.hit1"], 0.9], [ev1["dh.hit2"], 0.9], [I, 1.0], [A["chopper_intro"], 1.0]]
    for x in edl[2:]: punches.append([x[0], 1.0 if x[2] in ("r7", "outro") or x[0] == b(24) else 0.65])
    for k in range(3, 6): punches.append([b(k), 0.6])                  # the drop's bar lines
    INNER = (("r5.erupt", 1.0), ("r5.rock", 0.6), ("r1.title", 0.5), ("r2.device", 0.5), ("r3.fracture", 0.8), ("r3.corridor", 0.6),
             ("r4.hero", 0.9), ("r6.crew", 0.5), ("r6.drop", 0.6), ("r6.launch", 0.9), ("fin.click", 0.5), ("fin.back", 0.6))
    for name, k in INNER:
        T = ev1[name]
        for a, z, kind, p in edl:
            if kind == "v1" and p["T0"] <= T < p["T0"] + (z - a): punches.append([round(a + T - p["T0"], 4), k])
    punches = sorted({round(t, 4): k for t, k in punches}.items())
    # foley
    major = edl[1][3]
    sfx = [[ev["neck1"], "crack", 0.5], [ev["neck2"], "crack", 0.5], [ev1["dh.hit1"], "knuckle", 0.55], [ev1["dh.hit2"], "knuckle", 0.55],
           [round(I - 0.95, 4), "riser", 0.5], [I, "sub", 0.5],
           *[[round(major["ty0"] + k * 0.075, 4), "key", 0.15] for k in range(int((major["ty1"] - major["ty0"]) / 0.075))], [major["enter"], "enter", 0.45],
           [round(b(2) - 5 * E8, 4), "boing", 0.35], [round(b(2) - E8, 4), "whoosh", 0.3]]
    for a, z, kind, p in edl:
        if kind != "v1": continue
        for T, k, g in C1["sfx"]:
            if p["T0"] <= T < p["T0"] + (z - a) - 1e-6: sfx.append([round(a + T - p["T0"], 4), k, g])
    for x in edl[3:-1]: sfx.append([round(x[0] - 0.42, 4), "whoosh", 0.2])
    fin = bot[4][3]["ev"]
    sfx += [[round(fin["nudge"] - 0.4, 4), "boing", 0.25], [round(fin["export"] - 0.3, 4), "boing", 0.3], [v3B("rt2.play"), "click", 0.35],
            [A["final_slam"], "sub", 0.55], *[[ev[f"o.tile{i}"], "tick", 0.3] for i in range(6)], [b(34), "ping", 0.25]]
    sfx = sorted([[round(t, 4), k, g] for t, k, g in sfx if 0 <= t < DUR])
    out = {"duration": DUR, "bpm": SM["bpm"], "eighth": E8, "beat": BEAT, "bar": BAR, "intro_len": I, "room": "rear",
           "edl": edl, "cards": cards, "bot": bot, "punches": punches, "events": ev, "sfx": sfx,
           "notes": "V3: native V1 bars wherever possible; the robot dance keyed to V3's own onsets; Claude's bot is an illustration"}
    (D3 / "cues.json").write_text(json.dumps(out, indent=1))
    grid = lambda t: abs((t - I) / E8 - round((t - I) / E8)) < 1e-3
    off = [x[0] for x in edl[1:] if not grid(x[0])]
    print(f"V3 {DUR} s: {len(edl)} ranges ({len(off)} off the grid {off}), {len(cards)} cards, {len(bot)} bot cues, {len(punches)} punches, {len(sfx)} foley")
    for a, z, k, p in edl: print(f"  {a:6.2f}-{z:6.2f} {k:9s} {p.get('name', '')} {('T0 ' + str(round(p['T0'], 3))) if 'T0' in p else ''}")


if __name__ == "__main__":
    main()
