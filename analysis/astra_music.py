"""Original score for the ASTRA.EXE reel, synthesized from scratch (no samples, no third-party audio: licensed by construction).
Epic cinematic percussion blended with Indian classical colour, as the brief's music direction asks: a tanpura-style drone (additive
strings with the jawari "swirl" of overtones), a bansuri-like flute (breath and glides), taiko and dhol/tabla-like drums, string pads
and a spiccato ostinato, brass stabs, a formant choir, metallic impacts and a rise before each release.

96 BPM, 4/4, the first downbeat on the hook's impact (0.5 s; bar 2.5 s). Every big fracture of the reel lands on this grid (the
reel's releases were placed so the physics does: projects/astra-exe/output/cues.json) and gets a hit; the sections follow the
storyboard (the director's shots) and its time map (the freeze, the Cosmic float, the 0.25x time-scale slow motion: a tape stop
and a tape start). D minor, Dm - Bb - Gm - A, with a Bhairav-coloured melody (D Eb F# G A Bb C#).

Writes audio/astra/stems/{drums,bass,strings,lead,drone,fx}.wav and data/astra/music.json.

    python analysis/astra_music.py
"""
import json, pathlib, sys, wave

import numpy as np
from scipy.signal import fftconvolve

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import grokbot_music as gm
from script_astra import DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gm.SR
BPM = 96.0; BEAT = 60 / BPM; BAR = 4 * BEAT; PICKUP = 0.5
N = int(round(DURATION * SR))
rng = np.random.default_rng(965)
hz = gm.hz
CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]   # Dm Bb Gm A
ROOTS = [38, 34, 31, 33]
SCALE = [62, 63, 66, 67, 69, 70, 73, 74]                             # D Eb F# G A Bb C# D (Bhairav colour)


def t_of(bar, beat=0.0): return PICKUP + bar * BAR + beat * BEAT
def bar_of(t): return int(np.floor((t - PICKUP) / BAR + 1e-9))


# ------------------------------------------------------------------ instruments
def tanpura(m, d=4.5, level=1.0):
    """A plucked drone string: 36 harmonics, the jawari's bright formant sweeping up the overtones and back."""
    n = int(d * SR); t = np.arange(n) / SR; f = hz(m); x = np.zeros(n)
    centre = 5 + 16 * (1 - np.exp(-t / 0.9)) * np.exp(-t / 3.5)
    for k in range(1, 37):
        if f * k > 9000: break
        a = (k ** -0.8) * np.exp(-t / (4.0 / (1 + k / 18))) * (1 + 1.6 * np.exp(-((k - centre) / 3.2) ** 2))
        x += a * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k) + k * 1.7)
    return level * 0.12 * x * np.minimum(1, t / 0.004)


def flute(notes, level=1.0):
    """A breathy bansuri-like line: [(start s, midi, length s)], legato glides (meend) between notes, vibrato, breath."""
    if not notes: return np.zeros(1)
    T = notes[-1][0] + notes[-1][2] + 0.4; n = int(T * SR); t = np.arange(n) / SR
    f = np.full(n, hz(notes[0][1])); amp = np.zeros(n)
    for i, (s, m, L) in enumerate(notes):
        a, b = int(s * SR), int((s + L) * SR)
        if i: # glide from the previous note over 90 ms
            g = int(0.09 * SR); f0 = hz(notes[i - 1][1]); f1 = hz(m)
            f[a:a + g] = f0 * (f1 / f0) ** (np.linspace(0, 1, g) ** 0.6); f[a + g:] = f1
        else: f[a:] = hz(m)
        e = np.ones(b - a); att = int(0.06 * SR); rel = int(0.18 * SR)
        e[:att] = np.linspace(0.2 if i else 0, 1, att); e[-rel:] *= np.linspace(1, 0.35 if i + 1 < len(notes) else 0, rel)
        amp[a:b] = np.maximum(amp[a:b], e)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.3 * t) * np.minimum(1, t / 0.6)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    tone = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.06 * np.sin(3 * ph)
    breath = gm.fft_filter(rng.standard_normal(n), 1800, 6500) * 0.16
    return level * 0.3 * (tone + breath) * amp


def taiko(level=1.0, f0=95):
    n = int(0.9 * SR); t = np.arange(n) / SR
    f = f0 * (0.55 + 0.45 * np.exp(-t / 0.06))
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.35)
    skin = gm.onepole_lp(rng.standard_normal(n), 900) * np.exp(-t / 0.03) * 0.8
    return level * np.tanh(1.8 * (body + skin))


def dagga(level=1.0):
    n = int(0.32 * SR); t = np.arange(n) / SR
    f = 62 + 70 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    slap = gm.fft_filter(rng.standard_normal(n), 200, 1800) * np.exp(-t / 0.012) * 0.4
    return level * np.tanh(1.5 * (body + slap))


def tabla_na(level=1.0, f0=760):
    n = int(0.3 * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.06 * np.exp(-t / 0.02))) / SR
    x = (np.sin(ph) + 0.45 * np.sin(2.01 * ph) + 0.2 * np.sin(3.02 * ph)) * np.exp(-t / 0.11)
    return level * 0.4 * (x + gm.fft_filter(rng.standard_normal(n), 2000, 7000) * np.exp(-t / 0.004) * 0.5)


def ge(level=1.0):
    """The tabla's bass stroke: a low glide."""
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 95 + 45 * np.exp(-t / 0.08)
    return level * 0.6 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)


def metal(level=1.0, f0=220, d=2.5):
    """An inharmonic metallic strike (temple-bell / anvil partials)."""
    n = int(d * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for r, a, tau in ((1, 1, 1.6), (2.76, 0.6, 0.9), (5.4, 0.4, 0.5), (8.93, 0.25, 0.3), (13.3, 0.15, 0.18)):
        x += a * np.sin(2 * np.pi * f0 * r * t) * np.exp(-t / tau)
    return level * 0.35 * (x + gm.fft_filter(rng.standard_normal(n), 3000, 12000) * np.exp(-t / 0.01))


def sub(level=1.0, f0=58, f1=26, d=2.4):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.5)
    return level * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (d / 3)) * np.minimum(1, t / 0.003)


def swell(d, f0=300, f1=9000, level=1.0):
    """A reverse swell: noise opening up and rising in level, cut at the end (into a hit)."""
    n = int(d * SR); u = np.linspace(0, 1, n)
    x = gm.lowpass_sweep(rng.standard_normal(n), f0, f1) * u ** 2.5
    return level * 0.5 * x


def strings(chord, d, fc=1800, att=0.35, trem=0.0, level=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = gm.onepole_lp(gm.supersaw(chord, n, voices=5, spread=0.007), fc)
    e = np.minimum(1, t / att) * np.minimum(1, (d - t) / 0.3)
    if trem: e *= 0.7 + 0.3 * np.sin(2 * np.pi * trem * t) ** 2
    return level * 0.3 * x * e


def spiccato(m, level=1.0):
    n = int(0.16 * SR); t = np.arange(n) / SR
    x = gm.saw(hz(m), n) + 0.5 * gm.saw(hz(m), n, 0.003)
    return level * 0.22 * gm.onepole_lp(x, 2400) * np.minimum(1, t / 0.006) * np.exp(-t / 0.05)


def brass(chord, d=0.6, level=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = sum(gm.saw(hz(m), n, 0.002) + 0.6 * gm.saw(hz(m - 12), n) for m in chord)
    fc = 350 + 2600 * np.exp(-t / 0.12)
    y = np.zeros(n); c = 0.0
    for i in range(0, n, 256):   # a block-wise moving low-pass
        seg = x[i:i + 256]; y[i:i + 256] = gm.onepole_lp(seg, fc[i])
    return level * 0.12 * y * np.minimum(1, t / 0.02) * np.exp(-t / 0.4)


def choir(chord, d, level=1.0):
    """An "aah" choir: saws through three vowel formants (730, 1090, 2440 Hz)."""
    n = int(d * SR); t = np.arange(n) / SR
    src = sum(gm.saw(hz(m) * (1 + 0.004 * np.sin(2 * np.pi * (4.7 + 0.3 * i) * t[0])), n, 0.004) for i, m in enumerate(chord))
    x = 1.0 * gm.fft_filter(src, 600, 900) + 0.6 * gm.fft_filter(src, 950, 1250) + 0.25 * gm.fft_filter(src, 2200, 2700)
    e = np.minimum(1, t / 0.5) * np.minimum(1, (d - t) / 0.5)
    return level * 0.25 * x * e


def pluck(m, d=0.3, fc=4000, level=1.0):
    n = int(d * SR); t = np.arange(n) / SR
    x = 0.55 * np.sin(2 * np.pi * hz(m) * t) + 0.3 * np.sin(4 * np.pi * hz(m) * t) + 0.25 * gm.saw(hz(m), n, 0.002)
    return level * gm.onepole_lp(x * np.minimum(1, t / 0.002) * np.exp(-t / 0.12), fc)


def hall(x, sec=2.6, wet=0.32):
    """A simple hall: convolution with a decaying noise burst."""
    L = int(sec * SR); ir = rng.standard_normal(L) * np.exp(-np.arange(L) / SR / (sec / 5)); ir = gm.onepole_lp(ir, 5000); ir /= np.sqrt((ir ** 2).sum())
    return x + wet * fftconvolve(x, ir)[:len(x)]


def bighit(level=1.0, kind="vajra"):
    """A cinematic hit: three taikos, a sub drop, a metallic strike, a noise burst; coloured per mode."""
    out = np.zeros(int(3.2 * SR))
    for k, (f0, g) in enumerate(((80, 1.0), (62, 0.8), (105, 0.6))): gm.place(out, 0.004 * k, taiko(g, f0))
    gm.place(out, 0, sub(0.9)); gm.place(out, 0, gm.fft_filter(rng.standard_normal(int(0.4 * SR)), 300, 8000) * np.exp(-np.arange(int(0.4 * SR)) / SR / 0.06) * 0.5)
    f0 = {"vajra": 233, "agni": 196, "vayu": 262, "cosmic": 147, "crystal": 330, "final": 147}.get(kind, 220)
    gm.place(out, 0, metal(0.7, f0, 2.8))
    if kind in ("cosmic", "final", "crystal"): gm.place(out, 0, metal(0.4, f0 * 1.5, 3.0))
    return level * out


# ------------------------------------------------------------------ the score
def main():
    D = ROOT / "data" / "astra"; O = ROOT / "projects" / "astra-exe" / "output"
    cues = json.loads((O / "cues.json").read_text())["cues"]
    impacts = [(c["t"], c["mode"], c["shot"]) for c in cues if c["type"] == "impact"]
    launches = [(c["t"], c["shot"]) for c in cues if c["type"] == "launch"]
    lyr = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    S = {k: np.zeros(N) for k in ("drums", "bass", "strings", "lead", "drone", "fx")}
    # sections (reel time)
    SEC = [(0.0, "pickup"), (0.5, "hook"), (3.0, "freeze"), (4.65, "reveal"), (12.0, "power"), (15.0, "flight"), (16.125, "epic"),
           (21.0, "modes"), (26.75, "float"), (29.1, "collapse"), (31.0, "lab"), (39.45, "slow"), (41.4, "lab2"), (42.0, "tension"),
           (47.3, "build"), (49.1, "flight2"), (51.125, "triumph"), (53.0, "code"), (59.5, "magic"), (61.0, "finale")]
    sec = lambda t: [s for a, s in SEC if a <= t + 1e-6][-1]
    nbar = int(np.ceil((DURATION - PICKUP) / BAR)) + 1
    hits, kicks = [], []

    # ---- the drone: the tanpura cycle (Pa Sa' Sa' Sa) through almost everything, a low A/D pedal
    t = 4.65
    while t < DURATION - 0.5:
        s = sec(t)
        if s not in ("pickup", "hook", "freeze"):
            lv = 0.55 if s in ("slow", "float", "tension") else 0.75
            for j, m in enumerate((45, 62, 62, 50)):
                gm.place(S["drone"], t + j * BEAT * 0.75, tanpura(m, 4.0, lv * (1.0 if j else 0.9)))
        t += 3 * BEAT
    # a low pad of the drone from the freeze (so the freeze and the reveal are never empty)
    S["drone"][int(3.0 * SR):] += 0
    gm.place(S["drone"], 3.0, strings([38, 45, 50], 1.8, 700, 0.6, 0, 0.8))

    # ---- harmony: string pads per bar, tremolo in the float and the tension, choir on the big lifts
    for b in range(-1, nbar):
        t0 = t_of(b); t1 = t0 + BAR
        if t1 <= 0 or t0 >= DURATION: continue
        tm = max(t0, 0.0); s = sec(tm + 0.01); c = b % 4
        chord = CHORDS[c] if s not in ("triumph", "finale") else [50, 54, 57]
        if s in ("pickup", "hook"): continue
        fc = {"freeze": 900, "reveal": 1200, "power": 1700, "flight": 2000, "epic": 2600, "modes": 2800, "float": 1500, "collapse": 2600,
              "lab": 1600, "slow": 700, "lab2": 1600, "tension": 1100, "build": 2000, "flight2": 2400, "triumph": 3200, "code": 1800,
              "magic": 3000, "finale": 3000}[s]
        lv = {"freeze": 0.5, "reveal": 0.55, "power": 0.75, "tension": 0.6, "slow": 0.6, "float": 0.8}.get(s, 1.0)
        gm.place(S["strings"], tm, strings([m + 12 for m in chord] + [chord[0]], t1 - tm + 0.3, fc, 0.25, 6.0 if s in ("float", "tension") else 0, lv))
        if s in ("epic", "modes", "collapse", "triumph", "magic", "finale", "flight2"):
            gm.place(S["lead"], tm, choir([m + 12 for m in chord], t1 - tm + 0.2, 0.7 if s != "finale" else 1.0))
        # the bass: root on the bar, octave pulse in the driving sections
        if s not in ("freeze", "slow", "float"):
            gm.place(S["bass"], tm, strings([ROOTS[c] - 12, ROOTS[c]], t1 - tm, 400, 0.05, 0, 1.2))
    # ---- the spiccato ostinato (eighths on chord tones) in the driving sections
    for b in range(0, nbar):
        for e in range(8):
            t = t_of(b, e / 2)
            if t >= DURATION: continue
            s = sec(t)
            if s not in ("power", "epic", "modes", "collapse", "build", "flight2", "code", "magic", "tension"): continue
            c = b % 4; ch = CHORDS[c]
            m = [ch[0], ch[0] + 12, ch[1] + 12, ch[0] + 12, ch[2], ch[0] + 12, ch[1] + 12, ch[2] + 12][e]
            lv = 0.55 if s in ("tension", "code") else 0.85
            gm.place(S["strings"], t, spiccato(m, lv))
            if s in ("code", "magic"): gm.place(S["lead"], t + BEAT / 4, pluck(m + 12, 0.25, 3600, 0.16))

    # ---- drums
    for b in range(-1, nbar):
        for six in range(16):
            t = t_of(b, six / 4)
            if t < 0 or t >= DURATION: continue
            s = sec(t); q, sub4 = divmod(six, 4)
            # the epic taiko ostinato: low hits on 1 and the "and" of 2, 3; a high answer on 4
            if s in ("epic", "modes", "collapse", "magic"):
                if six in (0, 6, 8): gm.place(S["drums"], t, taiko(0.9 if six == 0 else 0.7, 80)); kicks.append(t)
                if six in (12, 14): gm.place(S["drums"], t, taiko(0.55, 120))
                if six in (4, 12): gm.place(S["drums"], t, dagga(0.5))
                if sub4 == 2: gm.place(S["drums"], t, tabla_na(0.25, 760 + 40 * (six % 8)))
            elif s == "power":   # building: taiko on every beat, getting louder, a roll into the release
                p = (t - 12.0) / 3.0
                if sub4 == 0: gm.place(S["drums"], t, taiko(0.4 + 0.5 * p, 85))
                if p > 0.6 and sub4 == 2: gm.place(S["drums"], t, taiko(0.3 + 0.4 * p, 110))
            elif s == "flight":  # the roll under the flight
                gm.place(S["drums"], t, taiko(0.35 + 0.45 * (t - 15.0), 125))
            elif s in ("lab", "lab2", "code"):   # a lighter groove: dhol and tabla
                lv = 0.45 if s == "code" else 0.5
                if six in (0, 6, 10): gm.place(S["drums"], t, dagga(lv)); kicks.append(t)
                if six in (4, 12): gm.place(S["drums"], t, ge(lv * 0.9))
                if sub4 == 2 or six in (3, 15): gm.place(S["drums"], t, tabla_na(lv * 0.55, 760 if sub4 == 2 else 900))
                if s == "code" and sub4 == 0: gm.place(S["drums"], t, taiko(0.35, 70))
            elif s == "tension":  # a heartbeat
                if six in (0, 3): gm.place(S["drums"], t, taiko(0.45 if six == 0 else 0.3, 60))
                if sub4 == 2: gm.place(S["drums"], t, gm.hat(), 0.12)
            elif s == "build":    # a rising roll into the release
                p = (t - 47.3) / 1.8
                if six % (2 if p < 0.5 else 1) == 0: gm.place(S["drums"], t, taiko(0.3 + 0.6 * p, 110 + 30 * p))
            elif s == "reveal" and t >= 8.0:   # a soft pulse once the string is pulled
                if six in (0, 8): gm.place(S["drums"], t, dagga(0.28))
            elif s == "finale" and t < 63.0:
                if six in (0, 8): gm.place(S["drums"], t, taiko(0.7, 75))

    # ---- the flute: phrases over the reveal, the lab and the finale (Bhairav colour)
    for t0, ph in ((5.1, [(0, 62, 0.6), (0.6, 63, 0.4), (1.0, 66, 0.9), (1.9, 67, 0.5), (2.4, 69, 1.6)]),
                   (9.0, [(0, 70, 0.5), (0.5, 69, 0.5), (1.0, 67, 0.4), (1.4, 66, 0.4), (1.8, 63, 0.5), (2.3, 62, 1.5)]),
                   (31.3, [(0, 69, 0.5), (0.5, 70, 0.4), (0.9, 73, 0.9), (1.8, 74, 1.4)]),
                   (61.4, [(0, 74, 0.8), (0.8, 73, 0.4), (1.2, 70, 0.4), (1.6, 69, 0.6), (2.2, 66, 0.5), (2.7, 62, 1.2)])):
        gm.place(S["lead"], t0, flute(ph, 0.9))

    # ---- hits: every impact, coloured by its mode; brass stabs on the big ones; swells before them
    for t, mode, shot in impacts:
        kind = "crystal" if shot == "impossible" else "final" if shot == "hook" else mode
        lv = 1.0 if shot in ("hook", "impossible", "bow") else 0.85
        gm.place(S["fx"], t, bighit(lv, kind)); hits.append(round(t, 3))
        gm.place(S["fx"], max(0, t - 1.0), swell(1.0, 300, 8000, 0.45 if shot != "hook" else 0.0))
        if shot not in ("lab",): gm.place(S["lead"], t, brass([m + 12 for m in CHORDS[bar_of(t) % 4]], 0.9, 0.9))
    # the hook's pickup: the arrow's rising air into the hit; the release swells (power, build) lead into launches
    gm.place(S["fx"], 0.0, swell(0.5, 800, 12000, 0.5))
    gm.place(S["fx"], 12.0, gm.riser(int(3.0 * SR), 200, 6000), 0.5)
    gm.place(S["fx"], 47.3, gm.riser(int(1.8 * SR), 250, 7000), 0.5)
    gm.place(S["fx"], 49.1, gm.riser(int(2.0 * SR), 600, 9000), 0.35)
    # the freeze: an icy shimmer and a reverse swell into the cut; the float: a held breath; gravity back: a hit
    gm.place(S["fx"], 3.0, metal(0.35, 880, 2.0)); gm.place(S["fx"], 3.65, swell(1.0, 400, 10000, 0.35))
    gm.place(S["fx"], 26.9, swell(2.2, 200, 4000, 0.3)); gm.place(S["fx"], 29.1, bighit(0.7, "cosmic")); hits.append(29.1)
    # the CODE -> PHYSICS -> MAGIC accents and the finale: the last hit, a long chord, the celestial chime
    for t in (55.62, 57.35): gm.place(S["fx"], t, taiko(0.6, 140))
    gm.place(S["fx"], 59.55, bighit(0.7, "vajra")); hits.append(59.55)
    gm.place(S["fx"], 61.0, bighit(0.9, "final")); hits.append(61.0)
    gm.place(S["lead"], 61.0, choir([62, 66, 69, 74], 4.0, 1.1))
    for j, m in enumerate((86, 93, 98)): gm.place(S["fx"], 64.1 + j * 0.09, pluck(m, 0.9, 7000, 0.3))

    # ---- the brief cinematic silence after the hook's hit: everything but the hit's tail drops out until 1.2 s
    for k in ("drone", "strings", "bass", "lead", "drums"):
        a, b = int(0.55 * SR), int(1.2 * SR); S[k][a:b] *= np.linspace(0, 1, b - a) ** 3
    # ---- the 0.25x time-scale slow motion: a tape stop into a low-passed, half-speed bed; a tape start out of it
    def tape(x, a, b, stop=True):
        i0, i1 = int(a * SR), int(b * SR); seg = x[i0:i1].copy(); n = len(seg)
        r = (np.linspace(1, 0.15, n) if stop else np.linspace(0.15, 1, n)) ** 1.5
        pos = np.cumsum(r); pos = pos / pos[-1] * (n - 1) * (0.55 if stop else 1)
        x[i0:i1] = np.interp(pos, np.arange(n), seg) * (np.linspace(1, 0.6, n) if stop else np.linspace(0.6, 1, n))
    for k in ("drums", "bass", "strings", "lead", "drone"):
        tape(S[k], 39.45, 39.85, True)
        a, b = int(39.85 * SR), int(41.4 * SR); S[k][a:b] = gm.onepole_lp(gm.onepole_lp(S[k][a:b], 450), 450) * 1.3
        tape(S[k], 41.4, 41.7, False)
    # ---- room and master shaping
    for k in ("drums", "strings", "lead", "fx", "drone"): S[k] = hall(S[k], 2.8 if k != "drums" else 2.0, 0.34 if k != "drums" else 0.22)
    for k in S:
        S[k][-int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR)) ** 1.5
    out = ROOT / "audio" / "astra" / "stems"; out.mkdir(parents=True, exist_ok=True)
    peak = max(np.abs(x).max() for x in S.values())
    for k, x in S.items():
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x / max(1, peak), -1, 1) * 32767 * 0.9).astype(np.int16).tobytes())
    beats = [round(PICKUP + i * BEAT, 4) for i in range(int((DURATION - PICKUP) / BEAT) + 1)]
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "pickup": PICKUP, "duration": DURATION, "beats": beats,
            "downbeats": [round(PICKUP + b * BAR, 4) for b in range(nbar) if PICKUP + b * BAR < DURATION], "hits": sorted(set(hits)), "kicks": sorted(round(k, 4) for k in set(kicks)),
            "sections": [{"name": s, "start": a, "end": (SEC[i + 1][0] if i + 1 < len(SEC) else DURATION)} for i, (a, s) in enumerate(SEC)],
            "slowmo": [[39.45, 41.7, "tape stop, low-passed bed, tape start (the 0.25x time-scale slider)"]], "silence": [0.55, 1.2, "the brief cinematic silence after the hook's hit"]}
    (ROOT / "data" / "astra").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "astra" / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"score: {DURATION:.2f} s at {BPM:g} BPM (first downbeat {PICKUP} s), {len(hits)} hits: {', '.join(f'{h:.2f}' for h in sorted(set(hits)))}")


if __name__ == "__main__":
    main()
