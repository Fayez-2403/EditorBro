"""Original 120 BPM cartoon-heist score for the DOTS short, synthesized from scratch (no samples, no third-party music;
the brief's licensed references are not used): 48 bars = 96.000 s, beat 0.5 s, bar 2 s, stereo. A slinky E-minor spy-funk
riff (upright-style bass, snaps, brushes, brass stabs, pizzicato, vibes) arranged to the ten scenes in
analysis/script_dots.py. Writes audio/dots/stems/*.wav (stereo) and data/dots/music.json.

  bars  0-4   monster: frame-0 stab + boom, low tremolo strings, the riff creeps in (bar 1), snaps
  bars  5-9   legends: full heist groove, brass stabs, lead hook
  bars 10-14  workshop: sneaky (rim clicks, pizzicato, vibes), no kick
  bars 15-19  bug hunt: chase (16th hats, xylophone runs)
  bars 20-24  meltdown: groove + comic brass
  bars 25-26  launch: tension build, riser; 53.00-54.00 total silence; 54.00 DROP (bars 27-29)
  bars 30-34  connected: full groove, bright
  bars 35-39  sleeping: lullaby (vibes + soft pad, no drums)
  bars 40-44  boss: groove back, building to the approve hit (88.0)
  bars 45-47  gift: warm E major resolution, final stab 94.0, ring-out to 96.0

    python analysis/dots_music.py
"""
import json, pathlib, wave

import numpy as np
from scipy.signal import fftconvolve, lfilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR, BPM, BARS = 44100, 120.0, 48
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR; N = int(round(DUR * SR))
E8 = BEAT / 2
SIL = (53.0, 54.0)
rng = np.random.default_rng(2026)
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)

SEC = {"monster": (0, 5), "legends": (5, 10), "workshop": (10, 15), "bughunt": (15, 20), "meltdown": (20, 25),
       "build": (25, 26.5), "drop": (27, 30), "connected": (30, 35), "sleeping": (35, 40), "boss": (40, 45), "gift": (45, 48)}
sec_of = lambda b: next((k for k, (a, z) in SEC.items() if a <= b < z), "build")

# two-bar riff in eighth steps: (step, midi). Bar A creeps up, bar B answers with the blue note run.
RIFF = [[(0, 40), (3, 40), (4, 43), (6, 45), (7, 46)], [(0, 47), (2, 45), (3, 43), (4, 40), (6, 38), (7, 40)]]
STAB = [[52, 55, 59, 62, 66], [48, 52, 55, 58, 62], [47, 51, 54, 57, 63]]          # Em9, C9, B7(b9-ish)
HOOK = [(0, 71, 1), (3, 74, 1), (4, 71, 1), (5, 69, 1), (6, 67, 2),                  # bar 1 (eighth, midi, length)
        (8, 64, 3), (13, 67, 1), (14, 69, 2),                                        # bar 2
        (16, 70, 1), (17, 71, 3), (20, 74, 2), (22, 76, 2),                          # bar 3
        (24, 74, 2), (26, 71, 1), (27, 69, 1), (28, 67, 2), (30, 64, 2)]             # bar 4


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)


def hp(x, fc): return x - lp(x, fc)


def bp(x, lo, hi): return hp(lp(x, hi), lo)


def env(n, a, d, sus=0.0, rel=None):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * (sus + (1 - sus) * np.exp(-t / max(d, 1e-4)))
    if rel: r = int(rel * SR); e[-r:] *= np.linspace(1, 0, r) if r < n else 1
    return e


def saw(f, n, det=0.0):
    t = np.arange(n) / SR; return 2 * ((f * (1 + det) * t + rng.random()) % 1.0) - 1


def stems_new(): return {k: np.zeros((2, N)) for k in ("drums", "bass", "music", "lead", "fx", "verb")}


S = stems_new()


def place(stem, t, x, g=1.0, pan=0.0, send=0.0):
    if SIL[0] - 0.001 <= t < SIL[1]: return
    i = int(round(t * SR))
    if i >= N or i < 0: return
    m = min(len(x), N - i); L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    S[stem][0, i:i + m] += g * L * 1.414 * x[:m]; S[stem][1, i:i + m] += g * R * 1.414 * x[:m]
    if send: S["verb"][0, i:i + m] += send * g * x[:m]; S["verb"][1, i:i + m] += send * g * x[:m]


# ---------------- instruments (all synthesized) ----------------
def kick(v=1.0):
    n = int(0.4 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * np.cumsum(48 + 95 * np.exp(-t / 0.03)) / SR) * np.exp(-t / 0.18)
    return v * np.tanh(1.5 * (body + 0.2 * rng.standard_normal(n) * np.exp(-t / 0.002)))


def snare(v=1.0, brush=False):
    n = int(0.3 * SR); t = np.arange(n) / SR
    nz = bp(rng.standard_normal(n), 1500 if brush else 900, 9000) * np.exp(-t / (0.09 if brush else 0.07))
    tone = 0 if brush else np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * 0.6
    return v * 0.5 * (nz + tone) * np.minimum(1, t / (0.012 if brush else 0.001))


def hat(v=1.0, open_=False):
    n = int((0.25 if open_ else 0.05) * SR); t = np.arange(n) / SR
    return v * 0.22 * hp(rng.standard_normal(n), 7500) * np.exp(-t / (0.09 if open_ else 0.012))


def snap(v=1.0):
    n = int(0.12 * SR); t = np.arange(n) / SR
    return v * 0.6 * bp(rng.standard_normal(n), 1800, 5200) * np.exp(-t / 0.015)


def rim(v=1.0):
    n = int(0.08 * SR); t = np.arange(n) / SR
    return v * 0.5 * (np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.012) + 0.4 * bp(rng.standard_normal(n), 2000, 6000) * np.exp(-t / 0.006))


def upright(m, dur, v=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = sum((0.9 ** k) / k * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.5 + 2.2 * k)) for k in range(1, 7))
    thump = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.02) * 0.4
    return v * np.tanh(1.3 * (x + thump)) * env(n, 0.004, 9, 1.0, rel=0.03)


def pluck(m, dur=0.35, v=1.0, bright=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = sum(np.sin(2 * np.pi * f * k * t + k) / k * np.exp(-t * (6 + 9 * k / bright)) for k in range(1, 9))
    return v * x * env(n, 0.002, 9, 1.0, rel=0.02)


def vibes(m, dur=1.4, v=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    x = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t / 0.15)) * np.exp(-t / 0.7)
    return v * x * (1 + 0.25 * np.sin(2 * np.pi * 5.5 * t)) * env(n, 0.002, 9, 1.0, rel=0.05)


def xylo(m, v=1.0):
    n = int(0.25 * SR); t = np.arange(n) / SR; f = hz(m)
    return v * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 3.9 * f * t)) * np.exp(-t / 0.07)


def brass(notes, dur, v=1.0, bright=3500):
    n = int(dur * SR); x = np.zeros(n)
    for m in notes:
        for d in (-0.006, 0.0, 0.007): x += saw(hz(m), n, d)
    x /= 3 * len(notes)
    t = np.arange(n) / SR; fc = 600 + bright * np.exp(-t / 0.12) * np.minimum(1, t / 0.02)
    out = np.zeros(n); B = 512; st = 0.0
    for s in range(0, n, B):   # block-wise swept one-pole x2 (a "wah" brass envelope)
        a = np.exp(-2 * np.pi * fc[s] / SR); seg = x[s:s + B]
        y, zf = lfilter([1 - a], [1, -a], seg, zi=[st * a]); st = y[-1] if len(y) else st
        out[s:s + B] = y
    return v * np.tanh(2.2 * lp(out, 5000)) * env(n, 0.015, 9, 1.0, rel=0.06)


def pad(notes, dur, v=1.0, fc=1200, trem=0.0):
    n = int(dur * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for m in notes:
        for d in (-0.004, 0.003): x += saw(hz(m), n, d)
    x = lp(lp(x / (2 * len(notes)), fc), fc)
    if trem: x *= 0.6 + 0.4 * np.sin(2 * np.pi * trem * t) ** 2
    return v * x * np.minimum(1, t / 0.3) * np.minimum(1, (t[-1] - t) / 0.3 + 1e-3)


def boom(v=1.0, dur=1.8):
    n = int(dur * SR); t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(34 + 70 * np.exp(-t / 0.08)) / SR) * np.exp(-t / 0.6)
    return v * np.tanh(1.4 * (sub + 0.4 * lp(rng.standard_normal(n), 2500) * np.exp(-t / 0.25)))


def riser(dur, v=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; p = t / t[-1]
    return v * 0.3 * (hp(rng.standard_normal(n), 500) * p ** 2 * 0.6 + np.sin(2 * np.pi * np.cumsum(150 * 30 ** p) / SR) * p ** 3 * 0.4)


def lead(m, dur, v=1.0):   # muted-trumpet-ish lead with delayed vibrato
    n = int(dur * SR); t = np.arange(n) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 0.25)
    ph = 2 * np.pi * np.cumsum(hz(m) * vib) / SR
    x = sum(np.sin(k * ph) * (0.75 ** k) for k in range(1, 9))
    return v * lp(np.tanh(1.5 * x), 3200) * env(n, 0.03, 9, 1.0, rel=0.08) * 0.35


# ---------------- arrangement ----------------
def main():
    kicks, snares, hits = [], [], []
    for b in range(BARS):
        s = sec_of(b); t0 = b * BAR; A = b % 2
        groove = s in ("legends", "meltdown", "drop", "connected", "boss")
        # drums
        for q in range(4):
            t = t0 + q * BEAT
            if groove or (s == "bughunt") or (s == "monster" and b >= 2) or (s == "gift" and b < 47):
                if q in (0, 2) or (s == "bughunt" and q == 3) or (s == "drop" and q == 2):
                    place("drums", t, kick(0.9 if s == "drop" else 0.75)); kicks.append(round(t, 3))
                if q == 2 and s == "legends" and b % 2 == 1: place("drums", t + E8 * 1.5, kick(0.55)); kicks.append(round(t + 0.375, 3))
            if q in (1, 3):
                if groove or s in ("bughunt", "gift"):
                    place("drums", t, snare(0.85), pan=0.05, send=0.12); snares.append(round(t, 3))
                elif s in ("monster", "workshop") and (s == "workshop" or b >= 1):
                    place("drums", t, snap(0.9), pan=0.35, send=0.25)
            if s == "workshop": place("drums", t + E8 * 1.35, rim(0.5), pan=-0.3)
            if groove or s == "bughunt" or (s == "monster" and b >= 3):
                steps = 4 if s == "bughunt" else 2
                for e in range(steps):
                    th = t + e * BEAT / steps + (0.04 if steps == 2 and e == 1 else 0)   # light swing
                    place("drums", th, hat(0.7 if e % 2 == 0 else 0.45, open_=(s == "drop" and e == 1)), pan=0.3)
        # bass riff (not in sleeping; half-time in monster bar 0)
        if s != "sleeping" and b >= 1 and not (s == "gift" and b == 47):
            for st, m in RIFF[A]:
                tt = t0 + st * E8; tt += 0.04 if st % 2 else 0
                place("bass", tt, upright(m + (12 if s == "gift" else 0) - (0 if s != "build" else 0), 0.42, 0.9 if groove else 0.75), pan=-0.05)
        # a soft sustained chord pad + a quiet 16th shaker under every groove (the bed never drops out between hits)
        if groove or s in ("bughunt", "workshop"):
            ch = STAB[0] if A == 0 else (STAB[1] if b % 4 == 1 else STAB[2])
            place("music", t0, pad([m - 12 for m in ch[:4]], BAR, 0.22, 1100), pan=-0.1, send=0.25)
            for k16 in range(16):
                place("drums", t0 + k16 * BEAT / 4 + (0.02 if k16 % 2 else 0), hat(0.18 if k16 % 4 else 0.26), pan=-0.35)
        # brass stabs on the downbeat + the and-of-4 answer
        if groove or s == "gift":
            ch = STAB[0] if A == 0 else (STAB[1] if b % 4 == 1 else STAB[2])
            place("music", t0, brass(ch, 0.28, 0.55), pan=0.2, send=0.18)
            if A == 1: place("music", t0 + 3.5 * BEAT, brass(STAB[0], 0.22, 0.45), pan=0.2, send=0.18)
            if s == "meltdown" and A == 1:   # comic "wah-wah" falling brass
                for i, m in enumerate((64, 63, 62)): place("music", t0 + (1 + i * 0.5) * BEAT, brass([m, m - 12], 0.4, 0.4, 1800), pan=-0.2, send=0.2)
        # pizzicato answers (workshop, legends, boss)
        if s in ("workshop", "legends", "boss"):
            for st, m in RIFF[A]:
                if st in (4, 6, 7): place("music", t0 + st * E8, pluck(m + 24, 0.3, 0.4), pan=0.45, send=0.2)
        # vibes: workshop sparkle and the sleeping lullaby (hook at half dynamics)
        if s == "workshop":
            for e in (0, 5): place("music", t0 + e * E8, vibes(STAB[A][2] + 12, 1.2, 0.25), pan=-0.4, send=0.35)
        # chase xylophone runs
        if s == "bughunt":
            for e in range(8):
                if e % 2 == 0 or b % 2: place("music", t0 + 4 * BEAT - (8 - e) * BEAT / 4, xylo([76, 79, 81, 82, 83, 86, 88, 91][e], 0.35), pan=0.5, send=0.15)
        # lead hook (legends, connected, boss; one 4-bar phrase each)
        if s in ("legends", "connected", "boss") and (b - SEC[s][0]) in (1, 2, 3, 4):
            off = ((b - SEC[s][0]) - 1) * 8
            for e, m, ln in HOOK:
                if off <= e < off + 8: place("lead", t0 + (e - off) * E8, lead(m, ln * E8 * 0.95, 0.8), pan=-0.15, send=0.25)
        # low tremolo strings for the monster; tension pad in the build
        if s == "monster":
            place("music", t0, pad([28, 40, 43] if A == 0 else [28, 40, 46], BAR, 0.5 + 0.1 * b, 700, trem=6.0), send=0.2)
        if s == "build":
            place("music", t0, pad([40, 46, 52, 58], BAR if b == 25 else 1.0, 0.6, 900 + 900 * (b - 25), trem=8.0), send=0.2)
            for k in range(8 if b == 25 else 8):   # snare roll into the silence
                if b == 26: place("drums", t0 + k * BEAT / 8, snare(0.3 + 0.08 * k), send=0.1)
        if s == "sleeping":
            place("music", t0, pad([52, 55, 59, 62] if A == 0 else [48, 52, 55, 59], BAR, 0.32, 1000), send=0.4)
            off = ((b - 35) % 4) * 8
            for e, m, ln in HOOK:
                if off <= e < off + 8 and b < 39: place("lead", t0 + (e - off) * E8, vibes(m, 1.0, 0.33), pan=0.25, send=0.45)
            place("bass", t0, upright(40 if A == 0 else 36, 1.6, 0.5))
        if s == "gift":
            ch = [52, 56, 59, 63, 66]   # E major 9: the warm resolution
            place("music", t0, pad(ch, BAR if b < 47 else 2.0, 0.5, 2200), send=0.35)
    # one-shot hits
    # frame 0: a light brass stab only (user 2026-10-20: no boom in the first second; no sub boom, no low E)
    place("music", 0.0, brass([52, 55, 59, 62, 66], 0.5, 0.5), send=0.3); hits.append(0.0)
    place("fx", 10.0, boom(0.7, 1.2)); hits.append(10.0)                    # the Dots' entry
    place("fx", 49.0, riser(1.0, 0.5))
    place("fx", 51.0, riser(2.0, 1.0))                                      # into the silence
    place("fx", 54.0, boom(1.0, 2.2)); place("music", 54.0, brass([40, 52, 55, 59, 62, 66], 0.9, 0.9), send=0.3); hits.append(54.0)
    place("fx", 60.0, boom(0.5, 1.0)); hits.append(60.0)
    place("fx", 86.0, riser(2.0, 0.6))
    place("fx", 88.0, boom(0.6, 1.2)); hits.append(88.0)                    # APPROVE
    place("music", 88.0, brass([52, 56, 59, 64], 0.6, 0.7), send=0.3)
    place("fx", 94.0, boom(0.8, 2.0)); hits.append(94.0)
    place("music", 94.0, brass([40, 52, 56, 59, 63, 66], 1.6, 0.8), send=0.4)
    for e in range(6): place("music", 94.0 + e * 0.08, vibes([76, 80, 83, 87, 88, 92][e], 1.8, 0.3), send=0.5)
    # reverb: a stereo plate from decorrelated decaying noise
    n = int(1.8 * SR); t = np.arange(n) / SR
    ir = [lp(rng.standard_normal(n), 6000) * np.exp(-t / 0.45) for _ in range(2)]
    wet = np.stack([fftconvolve(S["verb"][c], ir[c])[:N] for c in range(2)]) * 0.06
    S["music"] += wet
    for k in S:
        S[k][:, int(SIL[0] * SR):int(SIL[1] * SR)] = 0                     # true silence (tails included)
        f = int(0.04 * SR); S[k][:, -f:] *= np.linspace(1, 0, f)
    out = ROOT / "audio" / "dots" / "stems"; out.mkdir(parents=True, exist_ok=True)
    for k in ("drums", "bass", "music", "lead", "fx"):
        x = np.clip(S[k] / max(1.0, np.abs(S[k]).max() / 0.95), -1, 1)
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x.T * 32767).astype(np.int16).tobytes())
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "bars": BARS, "duration": DUR,
            "beats": [round(i * BEAT, 3) for i in range(BARS * 4)], "downbeats": [round(i * BAR, 3) for i in range(BARS)],
            "kicks": sorted(set(kicks)), "snares": sorted(set(snares)), "hits": hits,
            "sections": [{"name": k, "start": a * BAR, "end": z * BAR} for k, (a, z) in SEC.items()],
            "silence": list(SIL)}
    (ROOT / "data" / "dots").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "dots" / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"wrote 5 stereo stems ({DUR:.3f} s, {BARS} bars at {BPM:g} BPM), {len(kicks)} kicks")


if __name__ == "__main__":
    main()
