"""Original 122 BPM score for the GitHub package firewall reel v3, synthesized from scratch (no samples: licensed by
construction). Quiet and warm under a conversational voice (user, 2026-10-21: "the sound should be even lesser than the
narration"): a soft kick, light hats, Fluent-calm pads, gentle plucks, a sub. No impacts, risers or slams. The length and the
chapters come from the voice's layout (data/pkgfw/layout.json). Writes audio/pkgfw/stems/*.wav and data/pkgfw/music.json.

  alert     a dark, filtered pad only: the caution buzzer and the question lead (v3)
  hook      pads + ticking hats, no kick (tension, the terminal)
  problem   a low pulse: soft kick on 1, off-beat sub
  news      a lift: the pads open, kick on 1 and 3
  how       steady groove: kick on 1 and 3, hats, plucks
  policy    the same groove, plucks brighter
  blocked   the groove, plucks muted
  limits    a softer breakdown: pads and kick on 1
  cta       warm groove, the D minor chord rings out to the end

    python analysis/pkgfw_music.py
"""
import json, pathlib, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_pkgfw import BPM, BEAT, BAR
import grokbot_music as gm   # the synth voices (kick, clap, hats, supersaw, filters, sidechain)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gm.SR
CHORDS = [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]]   # Dm - Bb - F - C
ROOTS = [38, 34, 41, 36]


def main():
    lay = json.loads((ROOT / "data" / "pkgfw" / "layout.json").read_text())
    DUR = lay["duration"]; N = int(round(DUR * SR)); nb = int(round(DUR / BAR))
    chap = lambda t: next((c[2] for c in lay["chapters"] if c[0] <= t + 1e-6 < c[1]), "cta")
    stems = {k: np.zeros(N) for k in ("drums", "bass", "chords", "fx")}
    kicks, snares = [], []
    for b in range(nb):
        for q in range(4):
            t = b * BAR + q * BEAT; ch = chap(t)
            k = None
            if ch == "problem" and q == 0: k = 0.55
            elif ch in ("news", "how", "policy", "blocked", "cta") and q in (0, 2): k = 0.6
            elif ch == "limits" and q == 0: k = 0.5
            if k and t < DUR - BAR: gm.place(stems["drums"], t, gm.kick(k)); kicks.append(round(t, 4))
            if q in (1, 3) and ch in ("how", "policy", "blocked", "cta") and t < DUR - BAR:
                gm.place(stems["drums"], t, gm.clap(), 0.28); snares.append(round(t, 4))
            for e in range(2):
                th = t + e * BEAT / 2
                if ch not in ("limits", "alert") and th < DUR - BAR: gm.place(stems["drums"], th, gm.hat(), 0.18 if e else 0.12)
    g = gm.sidechain(kicks, N, depth=0.35)
    for b in range(nb):
        c = b % 4; t0 = b * BAR; n = int(BAR * SR); ch = chap(t0 + 0.01)
        bright = {"alert": 650, "hook": 900, "problem": 1000, "news": 2200, "how": 1800, "policy": 2000, "blocked": 1600, "limits": 1100, "cta": 2000}[ch]
        pad = gm.onepole_lp(gm.supersaw(CHORDS[c], n, voices=5, spread=0.006), bright) * 0.42
        gm.place(stems["chords"], t0, pad)
        if ch in ("how", "policy", "blocked", "cta"):                       # gentle plucks on eighths
            for e in range(8):
                te = t0 + e * BEAT / 2
                m = CHORDS[c][[0, 2, 1, 3, 2, 1, 3, 2][e]] + 12
                pl = gm.supersaw([m], int(0.16 * SR), voices=3, spread=0.004) * gm.env_ad(int(0.16 * SR), 0.004, 0.07)
                gm.place(stems["chords"], te, gm.onepole_lp(pl, 2600 if ch != "blocked" else 1500), 0.16)
        if ch in ("problem", "news", "how", "policy", "blocked", "cta"):     # sub on the off-beats
            for q in range(4):
                tb = t0 + q * BEAT + BEAT / 2; m2 = int(0.22 * SR); tt = np.arange(m2) / SR
                gm.place(stems["bass"], tb, 0.32 * np.sin(2 * np.pi * gm.hz(ROOTS[c]) * tt) * gm.env_ad(m2, 0.006, 0.12))
    stems["chords"] *= np.minimum(1, 0.6 + g); stems["bass"] *= g
    tail = int(BAR * SR); t = np.arange(tail) / SR                            # the last bar: the chord rings out
    gm.place(stems["chords"], DUR - BAR, gm.onepole_lp(gm.supersaw(CHORDS[0], tail, voices=5, spread=0.006), 1600) * np.exp(-t / 0.9) * 0.4)
    for k in stems:
        stems[k][:int(0.25 * SR)] *= np.linspace(0, 1, int(0.25 * SR))      # a soft start (the voice is already speaking)
        stems[k][-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    out = ROOT / "audio" / "pkgfw" / "stems"; out.mkdir(parents=True, exist_ok=True)
    for k, x in stems.items():
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767 * 0.9).astype(np.int16).tobytes())
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "pickup": 0.0, "bars": nb, "duration": DUR,
            "beats": [round(i * BEAT, 4) for i in range(nb * 4 + 1)], "downbeats": [round(b * BAR, 4) for b in range(nb + 1)],
            "kicks": kicks, "snares": snares, "sections": [{"name": c[2], "start": c[0], "end": c[1]} for c in lay["chapters"]],
            "silences": [], "impacts": []}
    (ROOT / "data" / "pkgfw" / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"wrote stems: {DUR:.3f} s, {nb} bars at {BPM:g} BPM, {len(kicks)} soft kicks, {len(snares)} light claps, no impacts")


if __name__ == "__main__":
    main()
