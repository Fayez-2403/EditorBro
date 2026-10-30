"""The Editor's Aura V4.1 (user, 2026-10-23): V4 with the "empty hand -> camera" edit as PROMPT -> VIDEO, switching on every
main beat from 0:04. Writes data/aura_v41/cues.json (+ copies V4's audio data; the song is V4's, unchanged).

  0 - 3.79 s    V4 as it was: the hook (8 renders on eighths) and NUCLEAR / BOMB on the volcano
  3.79 - 16.42  ten pairs, one beat each: PROMPT (the next render frozen on its first frame, blurred and dark, its prompt
                typed into the user's real VS Code / Claude Code input box, the same place every time: the "empty hand") then
                VIDEO (the render, sharp, playing: the "camera")
  16.42 - 20.21 the last pair, slow (user, 2026-10-23: "the end part to render and go slow"): the pit-stop prompt, then the pit
                stop for 3.2 s at half speed, x0.35 under water, the launch at full speed on the measured bass return, the freeze
  20.21 - end   V4's outro
Every switch is a beat of V4's grid (k x 0.631564 s), snapped to the measured drum onset within +/-25 ms (as V4). The prompts
quote the real prompts (app/src/scenes/aura/ide.ts PROMPTS / MAJOR_PROMPT; R08/R09: the user's V4 ask, "light mode").

    python analysis/aura_v41_cues.py
"""
import json, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parents[1]
D4, D = ROOT / "data/aura_v4", ROOT / "data/aura_v41"
A4, A = ROOT / "audio/aura_v4", ROOT / "audio/aura_v41"

# (render, prompt number shown, prompt text, render-time offset in beats for repeats)
PAIRS = [
    ("r8", "Light mode: an ink ensō that paints itself on the beat."),
    ("r4", "Build a cinematic chrome-and-glass 3D brand reveal."),
    ("r9", "Light mode: glossy toys that land on every drum hit."),
    ("r2", "Sharper timing. Stronger contrast. Next: premium product UI."),
    ("r7", "A robot that breakdances on every kick."),
    ("r5", "Real-time cinematic volcano, fluid-inspired smoke and dynamic lava."),
    ("r3", "Audio-reactive shaders."),
    ("r1", "Build a beat-synced cinematic kinetic typography sequence."),
    ("r4b", "Fix reflection clipping. Check frames again. Render final."),
    ("r9b", "Frame-exact. 60 fps. Render and validate."),
    ("r6", "Cinematic procedural pit stop: an open-wheel race car, coordinated crew."),
]
NAMES = {"r1": ("R01", "KINETIC TYPE", 6), "r2": ("R02", "PRODUCT UI · FICTIONAL", 3), "r3": ("R03", "AUDIO SHADER", 7), "r4": ("R04", "CHROME + GLASS", 2),
         "r5": ("R05", "VOLCANO", 0), "r6": ("R06", "PIT STOP · CG", 8), "r7": ("R07", "ROBOT DANCE", 5), "r8": ("R08", "INK", 1), "r9": ("R09", "BOUNCE", 4)}


def main():
    D.mkdir(parents=True, exist_ok=True); A.mkdir(parents=True, exist_ok=True)
    c4 = json.loads((D4 / "cues.json").read_text(encoding="utf-8")); au = json.loads((D4 / "audio.json").read_text())
    for f in ("audio.json", "song_map.json", "lyrics.json"):
        if (D4 / f).exists(): shutil.copyfile(D4 / f, D / f)
    shutil.copyfile(A4 / "song.wav", A / "song.wav")
    BEAT = c4["beat"]
    ons = sorted((o[0] if isinstance(o, list) else o) for o in au["onsets"]["kick"] + au["onsets"]["snare"])
    def snap(t, w=0.025):
        best = min(ons, key=lambda o: abs(o - t)); return round(best if abs(best - t) <= w else t, 4)
    edl4 = c4["edl"]; byname = {e[3].get("name", ""): e for e in edl4}
    old = {e[3]["w"] if e[2] == "v1" else e[2]: e for e in edl4[8:17]}     # the V4 run's entry per render (its tuned moment)
    S = 6                                                                  # the switching beats: 3.79 s .. 17.05 s (beats 6..27)
    cuts = [snap(k * BEAT) for k in range(S, S + 2 * len(PAIRS))]
    edl = [e for e in edl4[:8]]                                            # the hook, unchanged
    r5 = list(edl4[8]); r5[1] = cuts[0]; edl.append(r5)                    # R05 + NUCLEAR / BOMB to the first prompt beat
    labels = [l for l in c4["labels"] if l["key"] == "R05"]; labels[0] = {**labels[0], "b": cuts[0]}
    punches = [p for p in c4["punches"] if p[0] < cuts[0] - 0.05 or p[0] >= 18.3]
    sfx = [s for s in c4["sfx"] if s[0] < cuts[0] - 0.05 or s[0] >= 18.3]
    for i, (key, text) in enumerate(PAIRS):
        w = key[:2]; rep = key.endswith("b")
        p0, v0 = cuts[2 * i], cuts[2 * i + 1]
        v1_ = cuts[2 * i + 2] if i < len(PAIRS) - 1 else 20.21
        o = old[w]; kind, p = o[2], dict(o[3])
        if w == "r6":        # V4's pit stop, slowed: x0.5 from the video beat to the bass drop-out, then V4's own map (x0.35, launch, freeze)
            p = dict(byname[[n for n in byname if n.startswith("R06")][0]][3]); m = p["tmap"]
            p["tmap"] = [[v0, round(m[1][1] - 0.5 * (m[1][0] - v0), 4)]] + m[1:]
        elif kind == "v1":   # show what V4 showed at its cut (its tuned moment), moved to this window; repeats a bar later
            T_at_old = p["T0"] + (o[0] - p["ag"]) + (c4["bar"] if rep else 0.0)
            if w == "r5": T_at_old = p["T0"] + (3.158 + 0.07 - p["ag"])               # the eruption, 4 frames into its flash (no blank white frames)
            p = {**p, "T0": round(T_at_old, 6), "ag": v0}
        else:                # V4-native renders: their own start on the video beat (R07 keeps V4's choreography clock)
            p = {**p, "t0": (p["t0"] if w == "r7" else v0)}
        nm = NAMES[w]
        p["name"] = f"{nm[0]} {nm[1]}"
        hold = round(v0 - 0.19, 4) if w == "r5" else v0                    # the volcano: the dark moment 0.12 s before it blows
        edl.append([p0, v0, kind, {**p, "hold": hold, "prompt": {"n": i + 1, "of": len(PAIRS), "text": text, "t0": p0, "t1": v0}}])
        edl.append([v0, v1_, kind, p])
        labels.append({"a": v0, "b": v1_, "n": nm[2], "key": nm[0], "name": nm[1], "col": next(l["col"] for l in c4["labels"] if l["key"] == nm[0])})
        punches += [[p0, 0.35], [v0, 0.85]]
        sfx += [[round(p0 + 0.03 + j * 0.034, 4), "key", 0.1] for j in range(5)] + [[round(v0 - 0.02, 4), "enter", 0.3], [round(v0 - 0.12, 4), "whoosh", 0.16]]
    edl.append(edl4[-1])                                                   # the outro
    caps = []
    for cp in c4["captions"]:
        if cp["kind"] == "nuke": caps.append({**cp, "t1": cuts[0]})
        elif cp["kind"] in ("hook", "under", "one"): caps.append(cp)      # GOING UNDER and NUMBER 1 play over the slow finale
    xf = [x for x in c4["xf"] if x[0] < cuts[0]]                          # the hook's flash into R05 only: every switch is a hard cut
    out = {**c4, "edl": edl, "xf": xf, "captions": caps, "labels": labels, "punches": sorted(punches), "sfx": sorted(sfx),
           "switches": cuts, "notes": "V4.1: PROMPT -> VIDEO on every beat from 3.79 s (aura_v41_cues.py); the rest is V4"}
    (D / "cues.json").write_text(json.dumps(out, indent=1), encoding="utf-8")   # ASCII-escaped (the mix reads it in the default codec)
    for e in edl[8:-1]: print(f"{e[0]:7.3f}-{e[1]:7.3f}  {'PROMPT' if 'prompt' in e[3] else 'VIDEO '}  {e[3]['name']}")
    off = [round(c - round(c / BEAT) * BEAT, 4) for c in cuts]
    print(f"{len(PAIRS)} pairs; switch offsets from the grid (s): {off}")


if __name__ == "__main__":
    main()
