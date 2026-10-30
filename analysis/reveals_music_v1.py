"""Original 120 BPM score for the Claude reveals reel, synthesized from scratch (no samples: licensed by construction),
following the brief's music plan. Writes audio/reveals/stems/*.wav and data/reveals/music.json.

  hook    0-7    three hits on the three WHATs, a one-beat hush at 3.5, a rising whoop, the big bass drop at 5.0
  posted  7-17   ticking 16th hats, a pulse bass, the pad opening (curiosity), a riser into the countdown
  r1, r2  17-41  electro-funk: kick on 1, the "and" of 2 and 3, claps on 2 and 4, a syncopated slap-style bass, chord stabs
  r3      41-59  quirky "strings": a pizzicato melody, lighter drums; everything stops on the paper rip (58.75)
  r4      59-73  dark hum first, then futuristic: a saw bass pulsing on the beat, a 16th arpeggio, four-on-the-floor
  r5      73-88  heartbeats, then an orchestral-electronic build: slow string swells, toms, the beat doubling up
  final   88-94  the victorious impact, a major lift, the last hit at 93
Each numbered card gets the same sting (script_reveals.CARDS), bigger from 1 to 5.

    python analysis/reveals_music.py
"""
import json, pathlib, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_reveals_v1 import BPM, BEAT, BAR, DURATION, CHAPTERS, MARKS, CARDS
import grokbot_music as gm   # kick, clap, hat, supersaw, filters, sidechain, envelopes

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gm.SR
N = int(round(DURATION * SR))
# A minor funk: Am7 - Fmaj7 - C - G (one chord a bar); the finale lifts to F - G - C major
CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 64, 67], [55, 59, 62, 67]]
ROOTS = [45, 41, 48, 43]


def tone(f, n, kind="sine"):
    t = np.arange(n) / SR
    if kind == "tri": return 2 * np.abs(2 * ((f * t) % 1) - 1) - 1
    if kind == "sq": return np.sign(np.sin(2 * np.pi * f * t))
    return np.sin(2 * np.pi * f * t)


def sub_boom(level=1.0, d=1.4, f0=70, f1=32):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.18); ph = 2 * np.pi * np.cumsum(f) / SR
    return level * np.tanh(1.6 * np.sin(ph)) * np.exp(-t / (d * 0.45))


def pluck(m, d=0.22, kind="tri", lp=3000):
    n = int(d * SR); x = tone(gm.hz(m), n, kind) * gm.env_ad(n, 0.002, d * 0.35)
    return gm.onepole_lp(x, lp)


def tom(m=40, d=0.5):
    n = int(d * SR); t = np.arange(n) / SR; f = gm.hz(m) * (1 + 0.6 * np.exp(-t / 0.04))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * 0.9


def heartbeat():
    """Lub-dub: two soft low thumps 0.22 s apart."""
    out = np.zeros(int(0.7 * SR))
    for dt, g in ((0.0, 1.0), (0.22, 0.7)):
        k = sub_boom(g, 0.45, 90, 45); s = int(dt * SR); out[s:s + len(k)] += k[:len(out) - s]
    return out


def sting(k):
    """The numbered card's sting (k = 1..5): a chord stab and a sub hit, both growing with k; 4 and 5 add a reverse swell."""
    n = int(1.6 * SR); out = np.zeros(n)
    stab = gm.supersaw([69, 72, 76, 81][:2 + (k > 2) + (k > 3)], int(0.5 * SR), voices=5 + k, spread=0.01) * gm.env_ad(int(0.5 * SR), 0.003, 0.22)
    out[:len(stab)] += gm.onepole_lp(stab, 2500 + 700 * k) * (0.35 + 0.08 * k)
    b = sub_boom(0.5 + 0.12 * k, 1.0 + 0.15 * k); out[:len(b)] += b[:n]
    return out


def main():
    stems = {k: np.zeros(N) for k in ("drums", "bass", "chords", "fx")}
    chap = lambda t: next((c for c, s, e in CHAPTERS if s <= t + 1e-6 < e), "final")
    kicks, snares = [], []
    nb = int(round(DURATION / BAR))

    def K(t, g=0.8):
        gm.place(stems["drums"], t, gm.kick(g)); kicks.append(round(t, 4))

    def S(t, g=0.5):
        gm.place(stems["drums"], t, gm.clap(), g); snares.append(round(t, 4))

    # ---- hook: a tense low drone with clock ticks under the first two WHATs (cut for the hush), the three hits, the whoop, the drop
    n = int(MARKS["hush"] * SR); tt = np.arange(n) / SR
    drone = (0.5 * np.sin(2 * np.pi * 55 * tt) + 0.35 * gm.lowpass_sweep(gm.supersaw([45, 52], n, voices=3), 260, 780))
    gm.place(stems["fx"], 0.0, drone * np.minimum(1, tt / 0.04) * np.clip((tt[-1] - tt) / 0.03, 0, 1) * (0.55 + 0.45 * tt / tt[-1]), 0.4)
    for q in range(int(MARKS["hush"] / BEAT)):
        gm.place(stems["drums"], q * BEAT, pluck(108 if q % 2 else 103, 0.03, "sq", 7000), 0.12)    # tick, tock
    for t, g in ((MARKS["hit1"], 0.7), (MARKS["hit2"], 0.85), (MARKS["hit3"], 1.0)):
        gm.place(stems["fx"], t, sub_boom(g, 1.0)); K(t, 0.9)
        st = gm.supersaw([45 + 12, 52 + 12], int(0.3 * SR), voices=5) * gm.env_ad(int(0.3 * SR), 0.002, 0.12)
        gm.place(stems["chords"], t, gm.onepole_lp(st, 1800), 0.4 * g)
    n = int(1.0 * SR); tt = np.arange(n) / SR                                     # the whoop: a rising sine, 4.0 -> 5.0
    whoop = np.sin(2 * np.pi * np.cumsum(220 * 2 ** (2.5 * tt)) / SR) * np.minimum(1, tt / 0.05) * 0.25
    gm.place(stems["fx"], MARKS["hit3"] + 0.1, whoop[:int(0.88 * SR)])
    gm.place(stems["fx"], MARKS["drop"], sub_boom(1.25, 2.2, 80, 28))           # THE drop
    for q in range(4):                                                         # one bar of groove after the drop
        t = MARKS["drop"] + q * BEAT
        K(t, 0.85)
        if q in (1, 3): S(t, 0.45)
    # ---- the main grid
    for b in range(nb):
        for q in range(4):
            t = b * BAR + q * BEAT; ch = chap(t)
            if ch == "posted":
                for s16 in range(4): gm.place(stems["drums"], t + s16 * BEAT / 4, gm.hat(), 0.16 if s16 % 2 else 0.1)
                if q == 0: K(t, 0.55)
            elif ch in ("r1", "r2"):
                if q in (0, 2): K(t, 0.8)
                if q == 1: K(t + BEAT / 2, 0.6)                                  # the funk kick on the "and" of 2
                if q in (1, 3): S(t, 0.42)
                for e in range(2): gm.place(stems["drums"], t + e * BEAT / 2, gm.hat(), 0.14 if e else 0.09)
            elif ch == "r3" and t < MARKS["r3.rip"]:
                if q in (0, 2): K(t, 0.6)
                gm.place(stems["drums"], t + BEAT / 2, gm.hat(), 0.1)
                if q == 3: S(t, 0.25)
            elif ch == "r4" and t >= MARKS["r4.num"] - 0.01:
                K(t, 0.85)
                if q in (1, 3): S(t, 0.35)
                for s16 in range(4): gm.place(stems["drums"], t + s16 * BEAT / 4, gm.hat(), 0.12 if s16 % 2 else 0.07)
            elif ch == "r5" and t >= MARKS["r5.clip"] - 0.01:
                prog = (t - MARKS["r5.clip"]) / (88.0 - MARKS["r5.clip"])
                if q == 0 or (prog > 0.5 and q == 2): K(t, 0.7 + 0.2 * prog)
                if prog > 0.75: K(t + BEAT / 2, 0.5)                             # the beat doubles up near the end
                if q == 0 and b % 2 == 0: gm.place(stems["drums"], t, tom(40), 0.6 + 0.3 * prog)
                if q == 2: gm.place(stems["drums"], t, tom(45, 0.35), 0.35 + 0.3 * prog)
            elif ch == "final" and t < DURATION - BAR:
                if q in (0, 2): K(t, 0.9)
                if q in (1, 3): S(t, 0.5)
    g = gm.sidechain(kicks, N, depth=0.45)
    # ---- harmony and bass per bar
    funk = [0, None, 12, 0, None, 7, None, 12, 0, None, 10, 12, None, 7, 5, None]   # 16ths: semitones over the root
    pizz = [[0, None, 7, 3, None, 0, -2, None], [3, None, 7, 10, None, 7, 3, None]]   # A minor pentatonic bounce
    for b in range(nb):
        t0 = b * BAR; ch = chap(t0 + 0.01); c = b % 4; nbar = int(BAR * SR)
        if ch == "hook": continue
        if ch == "posted":
            p = (t0 - 7.0) / 10.0
            pad = gm.onepole_lp(gm.supersaw(CHORDS[c], nbar, voices=5, spread=0.007), 500 + 2500 * p) * 0.4
            gm.place(stems["chords"], t0, pad)
            for e in range(8):
                gm.place(stems["bass"], t0 + e * BEAT / 2, pluck(ROOTS[c] - 12, 0.18, "sq", 500), 0.35)
        elif ch in ("r1", "r2"):
            for s16, iv in enumerate(funk):
                if iv is None: continue
                gm.place(stems["bass"], t0 + s16 * BEAT / 4, pluck(ROOTS[c] - 12 + iv, 0.16, "sq", 900), 0.5)
            for off in (0.5, 1.5, 2.5, 3.5):                                     # chord stabs on the off-beats
                st = gm.supersaw(CHORDS[c], int(0.14 * SR), voices=5, spread=0.008) * gm.env_ad(int(0.14 * SR), 0.003, 0.05)
                gm.place(stems["chords"], t0 + off * BEAT, gm.onepole_lp(st, 3200), 0.28)
            gm.place(stems["chords"], t0, gm.onepole_lp(gm.supersaw(CHORDS[c], nbar, voices=3), 900) * 0.15)
        elif ch == "r3" and t0 < MARKS["r3.rip"]:
            for e, iv in enumerate(pizz[b % 2]):
                if iv is None: continue
                gm.place(stems["chords"], t0 + e * BEAT / 2, pluck(69 + iv, 0.2, "tri", 4000), 0.32)
            for q in range(4): gm.place(stems["bass"], t0 + q * BEAT, pluck(ROOTS[c] - 12, 0.3, "tri", 600), 0.45)
            gm.place(stems["chords"], t0, gm.onepole_lp(gm.supersaw(CHORDS[c], nbar, voices=3), 1200) * 0.12)
        elif ch == "r4":
            if t0 < MARKS["r4.num"] - 0.01: continue                            # the hum (below) owns the dark bars
            for q in range(4):
                bs = gm.supersaw([ROOTS[c] - 12], int(0.42 * SR), voices=5, spread=0.01) * gm.env_ad(int(0.42 * SR), 0.004, 0.2)
                gm.place(stems["bass"], t0 + q * BEAT, gm.onepole_lp(bs, 700), 0.7)
            arp = [0, 7, 12, 15, 12, 7, 3, 7]
            for s16 in range(16):
                m = CHORDS[c][0] + 12 + arp[s16 % 8]
                gm.place(stems["chords"], t0 + s16 * BEAT / 4, pluck(m, 0.1, "sq", 2800), 0.12)
        elif ch == "r5":
            if t0 < MARKS["r5.clip"] - 0.01: continue
            prog = (t0 - MARKS["r5.clip"]) / (88.0 - MARKS["r5.clip"])
            sw = gm.supersaw([m - 12 for m in CHORDS[c]] + CHORDS[c], nbar, voices=7, spread=0.006)
            sw = gm.onepole_lp(sw, 700 + 2600 * prog) * np.minimum(1, np.arange(nbar) / (0.6 * SR))
            gm.place(stems["chords"], t0, sw, 0.22 + 0.25 * prog)
            for q in range(4): gm.place(stems["bass"], t0 + q * BEAT, pluck(ROOTS[c] - 12, 0.45, "tri", 400), 0.5 + 0.3 * prog)
        elif ch == "final":
            fc = [[53, 57, 60, 65], [55, 59, 62, 67], [48, 55, 60, 64]][min(2, int((t0 - 88.0) // BAR))]
            sw = gm.onepole_lp(gm.supersaw(fc + [fc[0] + 12], nbar, voices=7, spread=0.008), 3000) * 0.4
            gm.place(stems["chords"], t0, sw)
            for q in range(4): gm.place(stems["bass"], t0 + q * BEAT, pluck(fc[0] - 24, 0.4, "sq", 500), 0.55)
    # ---- the faint electromagnetic hum in the dark, from right after the rip until 04 lights up
    h0, h1 = MARKS["r3.rip"] + 0.25, MARKS["r4.num"]; n = int((h1 - h0) * SR); tt = np.arange(n) / SR
    hum = 0.22 * (np.sin(2 * np.pi * 55 * tt) + 0.5 * np.sin(2 * np.pi * 110 * tt) + 0.2 * np.sin(2 * np.pi * 165 * tt)) * (1 + 0.3 * np.sin(2 * np.pi * 6 * tt))
    gm.place(stems["fx"], h0, hum * np.minimum(1, 0.25 + tt / 0.8) * np.clip((tt[-1] - tt) / 0.1, 0, 1))
    # ---- the heartbeats in the dark before 05, and its stings
    for t in (MARKS["r5.beat1"], MARKS["r5.beat2"], 74.75): gm.place(stems["fx"], t, heartbeat(), 0.9)
    for k, t in enumerate(CARDS, 1): gm.place(stems["fx"], t, sting(k))
    n = int(1.5 * SR); r = gm.riser(n, 300, 5000) * 0.25                         # risers into the countdown and into 05
    gm.place(stems["fx"], MARKS["post.launch"] - 1.5, r)
    gm.place(stems["fx"], MARKS["r5.num"] - 1.5, r * 1.3)
    gm.place(stems["fx"], MARKS["fin.impact"], sub_boom(1.3, 2.4, 85, 28))
    gm.place(stems["fx"], MARKS["fin.hit"], sub_boom(1.1, 1.2, 80, 30))
    stems["chords"] *= np.minimum(1, 0.55 + g); stems["bass"] *= g
    # ---- the paper rip: everything stops (black) until the hum fades in
    a, b_ = int(MARKS["r3.rip"] * SR), int((MARKS["r3.rip"] + 0.25) * SR)
    for k in ("drums", "bass", "chords"):
        stems[k][a:b_] *= np.linspace(1, 0, b_ - a); stems[k][b_:int(MARKS["r4.num"] * SR) - 200] = 0
    tail = int(1.0 * SR); tt = np.arange(tail) / SR                               # the last chord rings out
    gm.place(stems["chords"], DURATION - 1.0, gm.onepole_lp(gm.supersaw([48, 55, 60, 64, 72], tail, voices=7), 2400) * np.exp(-tt / 0.5) * 0.35)
    for k in stems: stems[k][-int(0.05 * SR):] *= np.linspace(1, 0, int(0.05 * SR))
    out = ROOT / "audio" / "reveals_v1" / "stems"; out.mkdir(parents=True, exist_ok=True)
    for k, x in stems.items():
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767 * 0.9).astype(np.int16).tobytes())
    # silences: the brief's one-beat hush before WHAAAAAATTTTT (3.5-4.0 s)
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "pickup": 0.0, "bars": nb, "duration": DURATION,
            "beats": [round(i * BEAT, 4) for i in range(nb * 4 + 1)], "downbeats": [round(b * BAR, 4) for b in range(nb + 1)],
            "kicks": sorted(set(kicks)), "snares": sorted(set(snares)), "sections": [{"name": c, "start": s, "end": e} for c, s, e in CHAPTERS],
            "silences": [[MARKS["hush"], MARKS["hit3"]]], "impacts": [MARKS["drop"], *CARDS, MARKS["fin.impact"], MARKS["fin.hit"]]}
    (ROOT / "data" / "reveals_v1" / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"wrote stems: {DURATION:.1f} s, {nb} bars at {BPM:g} BPM, {len(set(kicks))} kicks, {len(set(snares))} claps, {len(grid['impacts'])} impacts")


if __name__ == "__main__":
    main()
