"""Original 120 BPM score for the Claude reveals reel, v3 (v3: the hook is one WHAT and the dive, 1.5 s; v2: reveals_music_v2.py)
v2 (synthesized from scratch, no samples: licensed by construction).
v2 (user, 2026-10-21): every reveal slides straight into the next, so the score has no dark gaps or intro stops; the music
sits lower under the voice (reveals_mix.py). v1: reveals_music_v1.py. Writes audio/reveals/stems/*.wav, data/reveals/music.json.

  hook    0-1.5  a tense drone with clock ticks under the one WHAT (a hit at 0), a whoosh into the dive, an impact at 1.5 s
  posted  4-14.5 ticking 16th hats, a pulse bass, the pad opening (curiosity), a riser into 01
  r1, r2  14.5-33.5  electro-funk: kick on 1, the "and" of 2 and 3, claps on 2 and 4, a syncopated bass, chord stabs
  r3      33.5-47    quirky pizzicato "strings", lighter drums
  r4      47-57      futuristic: a saw bass pulsing on the beat, a 16th arpeggio, four-on-the-floor
  r5      57-69      two soft heartbeats, then an orchestral-electronic build (string swells, toms, the beat doubling up)
  final   69-76      the victorious impact, F - G - C major, the last hit at 75 s
A soft sting as each reveal lands (script_reveals.CARDS), a little bigger from 01 to 05.

    python analysis/reveals_music.py
"""
import json, pathlib, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_reveals import BPM, BEAT, BAR, DURATION, CHAPTERS, MARKS, CARDS, PANS
import grokbot_music as gm   # kick, clap, hat, supersaw, filters, sidechain, envelopes
from reveals_music_v1 import sub_boom, pluck, tom, heartbeat, CHORDS, ROOTS

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gm.SR
N = int(round(DURATION * SR))


def sting(k):
    """A soft landing sting (k = 1..5): a short chord stab and a light sub, growing a little with k."""
    n = int(1.2 * SR); out = np.zeros(n)
    stab = gm.supersaw([69, 72, 76, 81][:2 + (k > 2) + (k > 3)], int(0.4 * SR), voices=5, spread=0.01) * gm.env_ad(int(0.4 * SR), 0.003, 0.18)
    out[:len(stab)] += gm.onepole_lp(stab, 2400 + 400 * k) * (0.2 + 0.04 * k)
    b = sub_boom(0.3 + 0.06 * k, 0.8); out[:len(b)] += b[:n]
    return out


def main():
    stems = {k: np.zeros(N) for k in ("drums", "bass", "chords", "fx")}
    chap = lambda t: next((c for c, s, e in CHAPTERS if s <= t + 1e-6 < e), "final")
    kicks, snares = [], []
    S0 = {c: (a, b) for c, a, b in CHAPTERS}; R5, FIN = S0['r5'][0], S0['final'][0]
    nb = int(round(DURATION / BAR))

    def K(t, g=0.8):
        gm.place(stems["drums"], t, gm.kick(g)); kicks.append(round(t, 4))

    def S(t, g=0.5):
        gm.place(stems["drums"], t, gm.clap(), g); snares.append(round(t, 4))

    # ---- hook (v3): a tense drone with clock ticks under the one WHAT, a hit on it, a whoosh into the dive, an impact as the post lands
    n = int(MARKS["post.in"] * SR); tt = np.arange(n) / SR
    drone = 0.5 * np.sin(2 * np.pi * 55 * tt) + 0.35 * gm.lowpass_sweep(gm.supersaw([45, 52], n, voices=3), 260, 1400)
    gm.place(stems["fx"], 0.0, drone * np.minimum(1, tt / 0.02) * np.clip((tt[-1] - tt) / 0.03, 0, 1) * (0.6 + 0.4 * tt / tt[-1]), 0.4)
    for q in range(int(MARKS["post.in"] / BEAT)): gm.place(stems["drums"], q * BEAT, pluck(108 if q % 2 else 103, 0.03, "sq", 7000), 0.12)
    gm.place(stems["fx"], MARKS["hit1"], sub_boom(0.8, 1.0)); K(MARKS["hit1"], 0.9)
    st = gm.supersaw([57, 64], int(0.3 * SR), voices=5) * gm.env_ad(int(0.3 * SR), 0.002, 0.12)
    gm.place(stems["chords"], MARKS["hit1"], gm.onepole_lp(st, 1800), 0.32)
    n = int((MARKS["post.in"] - MARKS["dive"]) * SR); gm.place(stems["fx"], MARKS["dive"], gm.riser(n, 400, 6000) * 0.3)
    gm.place(stems["fx"], MARKS["post.in"], sub_boom(1.0, 1.8, 80, 28)); K(MARKS["post.in"], 0.85)
    # ---- the main grid
    for b in range(nb):
        for q in range(4):
            t = b * BAR + q * BEAT; ch = chap(t)
            if t < MARKS["post.in"] - 1e-6: continue
            if ch == "posted":
                for s16 in range(4): gm.place(stems["drums"], t + s16 * BEAT / 4, gm.hat(), 0.16 if s16 % 2 else 0.1)
                if q == 0: K(t, 0.55)
            elif ch in ("r1", "r2"):
                if q in (0, 2): K(t, 0.8)
                if q == 1: K(t + BEAT / 2, 0.6)
                if q in (1, 3): S(t, 0.42)
                for e in range(2): gm.place(stems["drums"], t + e * BEAT / 2, gm.hat(), 0.14 if e else 0.09)
            elif ch == "r3":
                if q in (0, 2): K(t, 0.6)
                gm.place(stems["drums"], t + BEAT / 2, gm.hat(), 0.1)
                if q == 3: S(t, 0.25)
            elif ch == "r4":
                K(t, 0.85)
                if q in (1, 3): S(t, 0.35)
                for s16 in range(4): gm.place(stems["drums"], t + s16 * BEAT / 4, gm.hat(), 0.12 if s16 % 2 else 0.07)
            elif ch == "r5":
                prog = (t - R5) / (FIN - R5)
                if t < R5 + 2.0: continue                                             # the heartbeats own the first bar
                if q == 0 or (prog > 0.5 and q == 2): K(t, 0.7 + 0.2 * prog)
                if prog > 0.75: K(t + BEAT / 2, 0.5)
                if q == 0 and b % 2 == 0: gm.place(stems["drums"], t, tom(40), 0.6 + 0.3 * prog)
                if q == 2: gm.place(stems["drums"], t, tom(45, 0.35), 0.35 + 0.3 * prog)
            elif ch == "final" and t < DURATION - BAR:
                if q in (0, 2): K(t, 0.9)
                if q in (1, 3): S(t, 0.5)
    g = gm.sidechain(kicks, N, depth=0.45)
    funk = [0, None, 12, 0, None, 7, None, 12, 0, None, 10, 12, None, 7, 5, None]
    pizz = [[0, None, 7, 3, None, 0, -2, None], [3, None, 7, 10, None, 7, 3, None]]
    for b in range(nb):
        t0 = b * BAR; ch = chap(t0 + 0.01); c = b % 4; nbar = int(BAR * SR)
        if t0 < MARKS["post.in"] - 1e-6: continue
        if ch == "posted":
            p = (t0 - S0['posted'][0]) / (S0['posted'][1] - S0['posted'][0])
            gm.place(stems["chords"], t0, gm.onepole_lp(gm.supersaw(CHORDS[c], nbar, voices=5, spread=0.007), 500 + 2500 * p) * 0.4)
            for e in range(8): gm.place(stems["bass"], t0 + e * BEAT / 2, pluck(ROOTS[c] - 12, 0.18, "sq", 500), 0.35)
        elif ch in ("r1", "r2"):
            for s16, iv in enumerate(funk):
                if iv is not None: gm.place(stems["bass"], t0 + s16 * BEAT / 4, pluck(ROOTS[c] - 12 + iv, 0.16, "sq", 900), 0.5)
            for off in (0.5, 1.5, 2.5, 3.5):
                st = gm.supersaw(CHORDS[c], int(0.14 * SR), voices=5, spread=0.008) * gm.env_ad(int(0.14 * SR), 0.003, 0.05)
                gm.place(stems["chords"], t0 + off * BEAT, gm.onepole_lp(st, 3200), 0.28)
            gm.place(stems["chords"], t0, gm.onepole_lp(gm.supersaw(CHORDS[c], nbar, voices=3), 900) * 0.15)
        elif ch == "r3":
            for e, iv in enumerate(pizz[b % 2]):
                if iv is not None: gm.place(stems["chords"], t0 + e * BEAT / 2, pluck(69 + iv, 0.2, "tri", 4000), 0.32)
            for q in range(4): gm.place(stems["bass"], t0 + q * BEAT, pluck(ROOTS[c] - 12, 0.3, "tri", 600), 0.45)
            gm.place(stems["chords"], t0, gm.onepole_lp(gm.supersaw(CHORDS[c], nbar, voices=3), 1200) * 0.12)
        elif ch == "r4":
            for q in range(4):
                bs = gm.supersaw([ROOTS[c] - 12], int(0.42 * SR), voices=5, spread=0.01) * gm.env_ad(int(0.42 * SR), 0.004, 0.2)
                gm.place(stems["bass"], t0 + q * BEAT, gm.onepole_lp(bs, 700), 0.7)
            arp = [0, 7, 12, 15, 12, 7, 3, 7]
            for s16 in range(16): gm.place(stems["chords"], t0 + s16 * BEAT / 4, pluck(CHORDS[c][0] + 12 + arp[s16 % 8], 0.1, "sq", 2800), 0.12)
        elif ch == "r5":
            prog = (t0 - R5) / (FIN - R5)
            sw = gm.supersaw([m - 12 for m in CHORDS[c]] + CHORDS[c], nbar, voices=7, spread=0.006)
            sw = gm.onepole_lp(sw, 700 + 2600 * prog) * np.minimum(1, np.arange(nbar) / (0.6 * SR))
            gm.place(stems["chords"], t0, sw, 0.22 + 0.25 * prog)
            for q in range(4): gm.place(stems["bass"], t0 + q * BEAT, pluck(ROOTS[c] - 12, 0.45, "tri", 400), 0.5 + 0.3 * prog)
        elif ch == "final":
            fc = [[53, 57, 60, 65], [55, 59, 62, 67], [48, 55, 60, 64], [48, 55, 60, 64]][min(3, max(0, int((t0 - FIN) // BAR)))]
            gm.place(stems["chords"], t0, gm.onepole_lp(gm.supersaw(fc + [fc[0] + 12], nbar, voices=7, spread=0.008), 3000) * 0.4)
            for q in range(4): gm.place(stems["bass"], t0 + q * BEAT, pluck(fc[0] - 24, 0.4, "sq", 500), 0.55)
    for t in (R5, R5 + 1.0): gm.place(stems["fx"], t, heartbeat(), 0.7)               # 05 starts on two heartbeats
    for k, t in enumerate(CARDS, 1): gm.place(stems["fx"], t, sting(k))
    n = int(1.5 * SR); r = gm.riser(n, 300, 5000) * 0.18
    gm.place(stems["fx"], PANS[0][0] - 1.0, r); gm.place(stems["fx"], PANS[5][0] - 1.0, r)
    gm.place(stems["fx"], MARKS["fin.impact"], sub_boom(1.1, 2.2, 85, 28))
    gm.place(stems["fx"], MARKS["fin.hit"], sub_boom(0.9, 1.0, 80, 30))
    stems["chords"] *= np.minimum(1, 0.55 + g); stems["bass"] *= g
    tail = int(1.0 * SR); tt = np.arange(tail) / SR
    gm.place(stems["chords"], DURATION - 1.0, gm.onepole_lp(gm.supersaw([48, 55, 60, 64, 72], tail, voices=7), 2400) * np.exp(-tt / 0.5) * 0.35)
    for k in stems: stems[k][-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    out = ROOT / "audio" / "reveals" / "stems"; out.mkdir(parents=True, exist_ok=True)
    for k, x in stems.items():
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767 * 0.9).astype(np.int16).tobytes())
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "pickup": 0.0, "bars": nb, "duration": DURATION,
            "beats": [round(i * BEAT, 4) for i in range(nb * 4 + 1)], "downbeats": [round(b * BAR, 4) for b in range(nb + 1)],
            "kicks": sorted(set(kicks)), "snares": sorted(set(snares)), "sections": [{"name": c, "start": s, "end": e} for c, s, e in CHAPTERS],
            "silences": [], "impacts": [MARKS["post.in"], *CARDS, MARKS["fin.impact"], MARKS["fin.hit"]]}
    (ROOT / "data" / "reveals" / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"wrote stems: {DURATION:.1f} s, {nb} bars at {BPM:g} BPM, {len(set(kicks))} kicks, {len(set(snares))} claps, {len(grid['impacts'])} impacts")


if __name__ == "__main__":
    main()
