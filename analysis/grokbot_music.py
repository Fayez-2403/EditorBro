"""Original 120 BPM future-bass / electro-tech score for the Grok Bot reel, synthesized from scratch (no samples, no
third-party audio): exactly 29 bars = 58.000 s, beat 0.5 s, bar 2 s. Writes stems to audio/grokbot/stems/*.wav and the
grid to data/grokbot/music.json. Sections follow the reel's chapters (analysis/script_grokbot.py):

  bar  0      hook: impact + chord stab on beat 1
  bars 1-5    groove (kick, hats, plucks), building
  bars 6-8    build: snare roll + riser into 18 s
  bars 9-11   DROP 1: supersaw chords + sub, sidechained (bot choreography)
  bars 12-14  full groove
  bars 15-17  breakdown (routine demo): pads + pluck arp, light kick
  bars 18-20  groove back
  bar 21      42.00-42.25 s total silence, then a calm pad (approval)
  bars 22-23  riser into 48 s
  bars 24-26  DROP 2 (payoff)
  bars 27-28  outro: impact on 56 s, ring-out to 58 s

    python analysis/grokbot_music.py
"""
import json, pathlib, wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR, BPM, BARS = 44100, 120.0, 29
BEAT = 60 / BPM; BAR = 4 * BEAT; DUR = BARS * BAR
N = int(round(DUR * SR))
rng = np.random.default_rng(1234)        # seeded: the score is reproducible

# F minor future-bass loop, one chord per bar: Fm - Db - Ab - Eb (i - VI - III - VII)
CHORDS = [[53, 56, 60, 65], [49, 53, 56, 61], [56, 60, 63, 68], [51, 55, 58, 63]]
ROOTS = [41, 37, 44, 39]
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(d, 1e-4))


def place(buf, t, x, g=1.0):
    i = int(round(t * SR))
    if i >= len(buf): return
    m = min(len(x), len(buf) - i); buf[i:i + m] += g * x[:m]


def kick(level=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    click = rng.standard_normal(n) * np.exp(-t / 0.003) * 0.25
    return level * np.tanh(1.6 * (body + click))


def clap():
    n = int(0.35 * SR); t = np.arange(n) / SR
    e = sum(np.exp(-np.maximum(t - d, 0) / 0.012) * (t >= d) for d in (0, 0.011, 0.022)) + 0.6 * np.exp(-t / 0.12)
    x = rng.standard_normal(n) * e
    return 0.5 * bandpass(x, 900, 2600)


def hat(open_=False):
    n = int((0.22 if open_ else 0.06) * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n) * np.exp(-t / (0.08 if open_ else 0.014))
    return 0.22 * highpass(x, 7000)


def onepole_lp(x, fc):
    from scipy.signal import lfilter
    a = np.exp(-2 * np.pi * fc / SR)
    return lfilter([1 - a], [1, -a], x)


def fft_filter(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x)).astype(np.float32)


bandpass = lambda x, lo, hi: fft_filter(x, lo, hi)
highpass = lambda x, lo: fft_filter(x, lo, SR / 2)


def saw(freq, n, detune=0.0, phase=0.0):
    t = np.arange(n) / SR
    return 2 * ((freq * (1 + detune) * t + phase) % 1.0) - 1


def supersaw(midi_notes, n, voices=7, spread=0.012):
    x = np.zeros(n)
    for m in midi_notes:
        for v in range(voices):
            d = spread * (v - (voices - 1) / 2) / ((voices - 1) / 2)
            x += saw(hz(m), n, d, rng.random()) / voices
    return x / len(midi_notes)


def lowpass_sweep(x, f0, f1):
    """Block-wise FFT low-pass sweeping f0 -> f1 (Hz) across x."""
    out = np.zeros_like(x); B = 2048
    for s in range(0, len(x), B):
        seg = x[s:s + B]; fc = f0 + (f1 - f0) * (s / max(1, len(x)))
        out[s:s + B] = fft_filter(np.pad(seg, (0, B - len(seg)))[:B], 0, fc)[:len(seg)]
    return out


def riser(n, f0=200, f1=4000):
    t = np.arange(n) / SR; p = t / t[-1]
    noise = highpass(rng.standard_normal(n), 400) * p ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f0 * (f1 / f0) ** p) / SR) * p ** 3 * 0.3
    return 0.25 * (noise * 0.6 + tone)


def impact(n=int(2.2 * SR)):
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / 0.06)) / SR) * np.exp(-t / 0.7)
    air = onepole_lp(rng.standard_normal(n), 3000) * np.exp(-t / 0.35) * 0.5
    return 0.9 * np.tanh(1.4 * (sub + air))


def sidechain(times, n, depth=0.75, rel=0.22):
    g = np.ones(n)
    for t in times:
        i = int(t * SR); m = min(int(rel * 1.6 * SR), n - i)
        if m > 0: g[i:i + m] = np.minimum(g[i:i + m], 1 - depth * np.exp(-np.arange(m) / SR / (rel / 3)))
    return g


def main():
    stems = {k: np.zeros(N) for k in ("drums", "bass", "chords", "fx")}
    sec = lambda b0, b1: (b0 * BAR, b1 * BAR)
    DROPS = [sec(9, 12), sec(24, 27)]
    in_ = lambda t, a: a[0] <= t < a[1]
    kicks = []
    for b in range(BARS):
        for q in range(4):
            t = b * BAR + q * BEAT
            if 42.0 <= t < 42.25: continue
            breakdown = 15 <= b < 18 or b == 21
            if b in (6, 7, 8) or not breakdown or q in (0,):          # light kick (beat 1 only) in breakdowns
                if not (b == 21 and q > 0) and not (b == 28 and q > 0):
                    place(stems["drums"], t, kick(0.95 if any(in_(t, d) for d in DROPS) else 0.8)); kicks.append(t)
            if q in (1, 3) and b >= 1 and not breakdown and b != 28: place(stems["drums"], t, clap(), 0.9)
            for e in range(2):
                th = t + e * BEAT / 2
                if b >= 1 and b != 21 and b != 28 and not (42.0 <= th < 42.25):
                    place(stems["drums"], th, hat(open_=(e == 1 and b >= 9 and not breakdown)), 0.8 if e else 0.5)
    for i in range(16):   # snare roll into the first drop and into the payoff
        for start in (16.0, 46.0):
            place(stems["drums"], start + i * BEAT / 8, clap(), 0.25 + 0.04 * i)
    g = sidechain(kicks, N)
    for b in range(BARS):
        c = b % 4; t0 = b * BAR; n = int(BAR * SR)
        drop = any(in_(t0, d) for d in DROPS)
        if b == 0:   # hook: one big stab on beat 1
            place(stems["chords"], 0.0, supersaw([m + 12 for m in CHORDS[0]], int(0.9 * SR)) * env_ad(int(0.9 * SR), 0.002, 0.3), 0.9)
        elif drop:   # sidechained supersaw chords + sub
            place(stems["chords"], t0, lowpass_sweep(supersaw(CHORDS[c], n), 2500, 9000) * 0.7)
        elif 15 <= b < 18 or b in (21, 22, 23):   # pads (soft, filtered)
            pad = onepole_lp(supersaw(CHORDS[c], n, voices=5, spread=0.006), 1400) * 0.55
            if b == 21: pad[:int(0.25 * SR)] = 0
            place(stems["chords"], t0, pad)
        if b >= 1 and b != 21 and b < 28:   # pluck arpeggio on eighths
            for e in range(8):
                te = t0 + e * BEAT / 2
                m = CHORDS[c][[0, 2, 1, 3, 2, 1, 3, 2][e]] + 12
                pl = supersaw([m], int(0.18 * SR), voices=3, spread=0.004) * env_ad(int(0.18 * SR), 0.002, 0.07)
                place(stems["chords"], te, onepole_lp(pl, 4000), 0.35 if not drop else 0.22)
        if b >= 1 and b != 21 and b < 28:   # sub bass on the off-beats outside drops, sustained in drops
            if drop:
                tt = np.arange(n) / SR; sub = np.sin(2 * np.pi * hz(ROOTS[c]) * tt) + 0.3 * np.sin(4 * np.pi * hz(ROOTS[c]) * tt)
                place(stems["bass"], t0, 0.55 * sub)
            else:
                for q in range(4):
                    m2 = int(0.22 * SR); tt = np.arange(m2) / SR
                    place(stems["bass"], t0 + q * BEAT + BEAT / 2, 0.45 * np.sin(2 * np.pi * hz(ROOTS[c]) * tt) * env_ad(m2, 0.004, 0.12))
    stems["chords"] *= np.minimum(1, 0.35 + g); stems["bass"] *= g
    place(stems["fx"], 0.0, impact(), 1.0)                       # frame 0
    place(stems["fx"], 18.0 - 4.0, riser(int(4.0 * SR)), 1.0)    # into drop 1
    place(stems["fx"], 18.0, impact(int(1.4 * SR)), 0.7)
    place(stems["fx"], 48.0 - 4.0, riser(int(4.0 * SR)), 1.0)    # into the payoff
    place(stems["fx"], 48.0, impact(int(1.6 * SR)), 0.8)
    place(stems["fx"], 56.0, impact(), 1.0)                      # resolving impact, rings out to 58 s
    t = np.arange(int(2 * SR)) / SR                              # final F minor chord ringing out from 56 s
    place(stems["chords"], 56.0, onepole_lp(supersaw([m + 12 for m in CHORDS[0]], len(t)), 2500) * np.exp(-t / 0.8) * 0.6)
    for k in stems:                                              # 42.00-42.25 s: true silence
        stems[k][int(42.0 * SR):int(42.25 * SR)] = 0
        stems[k][-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    out = ROOT / "audio" / "grokbot" / "stems"; out.mkdir(parents=True, exist_ok=True)
    for k, x in stems.items():
        x = np.clip(x, -1, 1)
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767 * 0.9).astype(np.int16).tobytes())
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "bars": BARS, "duration": DUR,
            "beats": [round(i * BEAT, 3) for i in range(BARS * 4)], "downbeats": [round(i * BAR, 3) for i in range(BARS)],
            "kicks": [round(k, 3) for k in kicks],
            "sections": [{"name": n, "start": a * BAR, "end": b * BAR} for n, a, b in
                         [("hook", 0, 1), ("groove", 1, 6), ("build", 6, 9), ("drop1", 9, 12), ("groove2", 12, 15), ("breakdown", 15, 18),
                          ("groove3", 18, 21), ("approval", 21, 22), ("rise", 22, 24), ("drop2", 24, 27), ("outro", 27, 29)]],
            "silence": [42.0, 42.25], "impacts": [0.0, 18.0, 48.0, 56.0]}
    (ROOT / "data" / "grokbot").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "grokbot" / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"wrote {len(stems)} stems ({DUR:.3f} s, {BARS} bars at {BPM:g} BPM), {len(kicks)} kicks")


if __name__ == "__main__":
    main()
