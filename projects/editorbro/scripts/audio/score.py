"""Original score, sound design and final mix, all synthesized here (no samples, licence-clean), from SCENE_TIMINGS.json
and the cue sheet src/audio/cues.json.

  music: 132 BPM (SCENE_TIMINGS), D minor (Dm - Bb - F - C per bar) until the fix, then F major (F - C - Dm - Bb), additive analog-style pads, pulsing bass, plucked arpeggio with a
         dotted-eighth echo, restrained kick / hats / claps; per-scene energy from cues.json.
  sfx:   impacts, glass harmonics, mechanical clicks, typing, data pulses, magnetic locks, servo, heartbeat, paper,
         ticks, risers, acceleration sweep, the closing resolve.
  mix:   narration on top; music ducked under the voice by its envelope; then two-pass ffmpeg loudnorm to -14 LUFS
         integrated, -1.5 dBTP. Writes public/audio/mix_<variant>.wav (+ stems in audio/out/<variant>/) and points
         src/config/audioManifest.json at the mixes.

    python scripts/audio/score.py            # both cuts
"""
import json, math, pathlib, re, subprocess, sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SR = 48000
sys.path.insert(0, str(HERE))
from version import V as VER, SUFFIX, OUT as VOUT, TIMINGS, MANIFEST  # noqa: E402
TM = json.loads(TIMINGS.read_text(encoding="utf-8"))
_cues = ROOT / "src" / "audio" / f"cues.{VER}.json"   # per-version cue sheet if present (v2), else the v1 sheet
CUES = json.loads((_cues if _cues.exists() else ROOT / "src" / "audio" / "cues.json").read_text(encoding="utf-8"))
BPM = TM["bpm"]; BEAT = 60 / BPM; BAR = 4 * BEAT
RNG = np.random.default_rng(20261029)

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]      # Dm, Bb, Gm, A (D harmonic minor: the filmi cadence)
ROOTS = [38, 34, 43, 45]
CHORDS_MAJ = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]]  # F, C, Dm, Bb (after the fix)
ROOTS_MAJ = [41, 36, 38, 34]

def lp(x, fc, order=2): return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, min(hi, SR * 0.45)], "band", fs=SR, output="sos"), x)
def T(n): return np.arange(n) / SR
def env_exp(n, tau): return np.exp(-T(n) / tau)
def adsr(n, a, r):
    e = np.ones(n); na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e
def noise(n): return RNG.standard_normal(n)
def fit(x, n): return np.pad(x, (0, max(0, n - len(x))))[:n]
def saw(f, n, k=14, detune=0.0):
    t = T(n); y = np.zeros(n)
    for h in range(1, k + 1):
        if f * h > 15000: break
        y += np.sin(2 * np.pi * f * h * (1 + detune) * t + h) / h
    return y

# ---------------------------------------------------------------- sfx
def sfx(kind, length=None, pitch=1.0):
    L = length
    if kind == "subImpact":
        n = int(1.6 * SR); t = T(n); f = 30 + 55 * np.exp(-t * 7)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.55) * 1.0 + lp(noise(n), 900) * env_exp(n, 0.05) * 0.5
        return y
    if kind == "impact":
        n = int(1.0 * SR); t = T(n); f = 42 + 70 * np.exp(-t * 14)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.32) * 0.8 + bp(noise(n), 200, 4000) * env_exp(n, 0.06) * 0.35
    if kind == "flashHit":
        n = int(0.9 * SR); return bp(noise(n), 1500, 9000) * env_exp(n, 0.12) * 0.5 + fit(sfx("impact"), n) * 0.6
    if kind == "glass":
        n = int(3.2 * SR); t = T(n); y = np.zeros(n); base = 1046.5 * pitch
        for r, a, d in [(1, 1, 2.4), (2.76, 0.55, 1.6), (5.40, 0.3, 1.0), (8.93, 0.18, 0.6), (1.5, 0.35, 2.0)]:
            y += a * np.sin(2 * np.pi * base * r * t + r) * np.exp(-t / d)
        return y * adsr(n, 0.004, 0.3) * 0.22
    if kind == "mechClick":
        n = int(0.35 * SR); t = T(n)
        return (bp(noise(n), 2500, 9000) * env_exp(n, 0.006) * 0.9 + np.sin(2 * np.pi * 3100 * t) * env_exp(n, 0.02) * 0.3
                + np.sin(2 * np.pi * (90 + 60 * np.exp(-t * 40)) * t) * env_exp(n, 0.07) * 0.7)
    if kind == "magLock":
        n = int(0.9 * SR); t = T(n)
        return (np.sin(2 * np.pi * (70 + 80 * np.exp(-t * 30)) * t) * env_exp(n, 0.12) * 0.8 + fit(sfx("mechClick"), n) * 0.6
                + np.sin(2 * np.pi * 1890 * t) * np.sin(2 * np.pi * 2311 * t) * env_exp(n, 0.25) * 0.15)
    if kind == "twang":   # a red string snapping taut on the board: tack click + short plucked tone (D4 x pitch)
        n = int(0.6 * SR); t = T(n); f0 = midi(62) * pitch
        tone = sum(g * np.sin(2 * np.pi * f0 * r * t + r) * np.exp(-t * d) for r, g, d in ((1, 1, 7), (2.01, 0.5, 11), (3.02, 0.25, 16)))
        return tone * adsr(n, 0.002, 0.05) * 0.32 + fit(sfx("mechClick"), n) * 0.35
    if kind == "alarm":   # two-tone warning (SAAVDHAN), 4 steps
        L = L or 0.8; n = int(L * SR); t = T(n); f = np.where((t // 0.16) % 2 == 0, midi(81), midi(76))
        y = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.5 + np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5
        return lp(y, 5000) * adsr(n, 0.005, 0.12) * 0.16
    if kind == "scratch":   # record scratch: everything stops (BAS?)
        n = int(0.42 * SR); t = T(n); f = 1400 * np.exp(-t * 9) + 120 * np.sin(2 * np.pi * 7 * t) ** 2
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + bp(noise(n), 700, 4500) * 0.6 * (0.5 + 0.5 * np.sin(2 * np.pi * 23 * t))
        return y * adsr(n, 0.003, 0.15) * 0.45
    if kind == "dataPulse":
        n = int(0.3 * SR); t = T(n); f = 1700 - 900 * t / 0.3
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.05) * 0.35
    if kind == "dataBurst":
        n = int(L * SR); y = np.zeros(n); k = 0
        while k < n:
            b = sfx("dataPulse") * RNG.uniform(0.3, 0.9); m = min(len(b), n - k); y[k:k + m] += b[:m] * (1 - k / n) ** 0.5
            k += int(RNG.uniform(0.045, 0.11) * SR)
        return y * 0.6
    if kind == "typing":
        n = int(L * SR); y = np.zeros(n); k = 0
        while k < n:
            c = bp(noise(int(0.012 * SR)), 2000, 8000) * env_exp(int(0.012 * SR), 0.003) * RNG.uniform(0.4, 1.0)
            m = min(len(c), n - k); y[k:k + m] += c[:m]; k += int(RNG.uniform(0.035, 0.09) * SR)
        return y * 0.5
    if kind == "disassembly":
        n = int(L * SR); y = np.zeros(n); k = 0
        while k < n:
            g = sfx("mechClick")[: int(0.08 * SR)] * RNG.uniform(0.15, 0.6) * (1 - k / n)
            m = min(len(g), n - k); y[k:k + m] += hp(g, 1500)[:m]; k += int(RNG.uniform(0.02, 0.07) * SR)
        return y
    if kind in ("whoosh", "suck"):
        n = int(L * SR); t = T(n); u = t / L
        sh = np.sin(np.pi * u) ** 2 if kind == "whoosh" else u ** 3
        x = noise(n); lo = bp(x, 150, 900); hi = bp(x, 900, 7000)
        mix = lo * (1 - u) + hi * u if kind == "whoosh" else lo * u + hi * (1 - u) * 0.5
        return mix * sh * 0.55
    if kind in ("riser", "riseTone"):
        n = int(L * SR); t = T(n); u = t / L
        f = (220 if kind == "riser" else 146.8) * 2 ** (u * (2.0 if kind == "riser" else 1.0))
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
        y = tone * u ** 2 * 0.28 + (bp(noise(n), 2000, 9000) * u ** 3 * 0.25 if kind == "riser" else 0)
        return y * adsr(n, 0.01, 0.03)
    if kind == "accelSweep":
        n = int(L * SR); t = T(n); u = t / L; f = 120 * 2 ** (u ** 2 * 4.2)
        y = (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.3 + bp(noise(n), 800, 8000) * 0.2 * u ** 2) * u ** 1.5
        return y * adsr(n, 0.02, 0.02)
    if kind == "servo":
        n = int(L * SR); t = T(n); u = t / L; f = 380 + 420 * np.sin(np.pi * u)
        y = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.6 + np.sin(2 * np.pi * np.cumsum(f * 2.01) / SR) * 0.2
        return bp(y, 250, 2500) * np.sin(np.pi * u) * 0.22
    if kind == "servoRhythm":
        n = int(L * SR); y = np.zeros(n); per = int(BEAT * SR)
        for k in range(0, n, per):
            s = sfx("servo", 0.32); m = min(len(s), n - k); y[k:k + m] += s[:m]
        return y * 0.8
    if kind == "heartbeat":
        n = int(L * SR); y = np.zeros(n); per = int(2 * BEAT * SR)
        thump = lambda: np.sin(2 * np.pi * (48 + 30 * np.exp(-T(int(0.25 * SR)) * 25)) * T(int(0.25 * SR))) * env_exp(int(0.25 * SR), 0.07)
        for k in range(0, n, per):
            for d, a in ((0, 1.0), (int(0.22 * SR), 0.7)):
                h = thump() * a; s0 = k + d; m = min(len(h), n - s0)
                if m > 0: y[s0:s0 + m] += h[:m]
        return y * 0.7
    if kind == "errorBlip":
        n = int(0.5 * SR); t = T(n)
        return (np.sign(np.sin(2 * np.pi * 330 * t)) * 0.15 + np.sin(2 * np.pi * 311 * t) * 0.2) * env_exp(n, 0.08) * (t < 0.12) + (np.sin(2 * np.pi * 311 * t) * 0.2 * env_exp(n, 0.08) * ((t > 0.16) & (t < 0.3)))
    if kind == "dhishoom":   # the filmi punch: thump + cloth crack + a falling whoosh tail
        n = int(0.9 * SR); t = T(n); f = 55 + 160 * np.exp(-t * 22)
        body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.18)
        crack = bp(noise(n), 900, 6000) * env_exp(n, 0.025)
        return body * 0.9 + crack * 0.7 + fit(sfx("whoosh", 0.5), n) * 0.35
    if kind == "fixChime":
        n = int(1.2 * SR); t = T(n)
        return sum(np.sin(2 * np.pi * midi(m) * t) * env_exp(n, 0.4) * (t > i * 0.09) for i, m in enumerate((74, 78, 81))) * 0.16
    if kind == "paper":
        n = int(0.6 * SR); u = T(n) / 0.6
        return bp(noise(n), 1200, 7000) * np.sin(np.pi * u) ** 1.5 * 0.35
    if kind == "ticks":
        n = int(L * SR); y = np.zeros(n); per = int(BEAT / 4 * SR)
        for i, k in enumerate(range(0, n, per)):
            c = sfx("mechClick")[: int(0.04 * SR)] * (0.6 if i % 4 else 1.0); m = min(len(c), n - k); y[k:k + m] += hp(c, 3000)[:m]
        return y * 0.5
    if kind == "chartSwell":
        n = int(L * SR); t = T(n); u = t / L
        return sum(np.sin(2 * np.pi * midi(m) * t) for m in (62, 69, 74)) * np.sin(np.pi * u) * 0.08
    if kind == "gearRatchet":
        n = int(L * SR); y = np.zeros(n); per = int(BEAT / 2 * SR)
        for k in range(0, n, per):
            c = sfx("mechClick")[: int(0.06 * SR)] * 0.5; m = min(len(c), n - k); y[k:k + m] += c[:m]
        return y
    if kind == "shimmer":
        n = int(L * SR); t = T(n); u = t / L
        return sum(np.sin(2 * np.pi * midi(m) * t + m) * (0.5 + 0.5 * np.sin(2 * np.pi * (3 + i) * t)) for i, m in enumerate((86, 90, 93, 98))) * np.sin(np.pi * u) * 0.04
    if kind == "unfold":
        n = int(L * SR); y = np.zeros(n)
        for i in range(6):
            s = sfx("magLock") * 0.5; k = int(i * L / 6 * SR); m = min(len(s), n - k); y[k:k + m] += s[:m]
        return y + fit(sfx("whoosh", L), n) * 0.5
    if kind == "nodeChain":
        n = int(L * SR); y = np.zeros(n)
        for i in range(7):
            k = int(i * L / 7 * SR); s = sfx("dataPulse") * 0.9 + sfx("mechClick")[: int(0.3 * SR)] * 0.25
            m = min(len(s), n - k); y[k:k + m] += s[:m]
        return y
    if kind == "resolve":
        n = int(5.0 * SR); t = T(n)
        pad = sum(saw(midi(m), n, 8, d) for m, d in ((38, 0), (50, 0.002), (57, -0.002), (62, 0.003), (69, 0)))
        pad = lp(pad, 2400) * adsr(n, 0.05, 2.5) * np.exp(-t / 3.5) * 0.16
        return pad + fit(sfx("subImpact"), n) * 0.8 + fit(sfx("glass", pitch=1.0), n) * 0.9
    raise ValueError(kind)


# ---------------------------------------------------------------- music
def music(variant, total):
    v = TM["variants"][variant]; n = int(total * SR); out = {k: np.zeros(n) for k in ("pad", "bass", "arp", "drums", "drone")}
    E = CUES["energy"]
    def energy_at(t):
        for s in v["scenes"]:
            if s["start"] <= t < s["end"]: return E[s["id"]], s
        return E[v["scenes"][-1]["id"]], v["scenes"][-1]
    # silence windows (hook end) mute the bed
    mutes = []
    for s in v["scenes"]:
        for c in CUES["scenes"][s["id"]]:
            if c["kind"] == "silence": mutes.append((s["end"] - c["e"], s["end"]) if "e" in c else (cue_time(c, s), cue_time(c, s) + c["len"]))
    nb = int(total / BAR) + 2
    for b in range(nb):
        t0 = b * BAR; e, sc = energy_at(t0 + 0.01)
        if t0 >= total: break
        ch, root = (CHORDS_MAJ[b % 4], ROOTS_MAJ[b % 4]) if e.get("maj") else (CHORDS[b % 4], ROOTS[b % 4])
        k0 = int(t0 * SR); m = min(int(BAR * SR) + int(0.4 * SR), n - k0)
        if m <= 0: continue
        if e["pad"] > 0:
            pad = sum(saw(midi(x), m, 10, d) for x, d in zip(ch + [ch[0] + 12], (0.0, 0.0025, -0.002, 0.0015)))
            out["pad"][k0:k0 + m] += lp(pad, 1600 + 900 * e["pad"]) * adsr(m, 0.35, 0.5) * 0.05 * e["pad"]
        if e["drone"] > 0:
            dr = np.sin(2 * np.pi * midi(26) * T(m)) * 0.5 + np.sin(2 * np.pi * midi(38) * T(m) + 1) * 0.3 + lp(noise(m), 300) * 0.08
            out["drone"][k0:k0 + m] += dr * adsr(m, 0.6, 0.6) * 0.07 * e["drone"]
        for q in range(8):                                   # bass: eighths
            tq = t0 + q * BEAT / 2; eq, _ = energy_at(tq)
            if eq["bass"] <= 0: continue
            kq = int(tq * SR); mq = min(int(BEAT / 2 * SR), n - kq)
            if mq <= 0: continue
            f = midi(root); y = saw(f, mq, 6) * 0.6 + np.sin(2 * np.pi * f / 2 * T(mq)) * 0.7
            out["bass"][kq:kq + mq] += lp(y, 520) * env_exp(mq, 0.16) * 0.12 * eq["bass"]
        for q in range(16):                                  # arp: sixteenths
            tq = t0 + q * BEAT / 4; eq, _ = energy_at(tq)
            if eq["arp"] <= 0: continue
            note = (ch + [ch[0] + 12, ch[1] + 12])[[0, 2, 1, 3, 2, 4, 3, 1][q % 8]] + 12
            kq = int(tq * SR); mq = min(int(0.24 * SR), n - kq)
            if mq <= 0: continue
            f = midi(note); y = (np.sin(2 * np.pi * f * T(mq)) + 0.25 * np.sin(2 * np.pi * 3 * f * T(mq))) * env_exp(mq, 0.07)
            out["arp"][kq:kq + mq] += y * 0.045 * eq["arp"] * (1.0 if q % 4 == 0 else 0.7)
        for q in range(16):                                  # drums
            tq = t0 + q * BEAT / 4; eq, _ = energy_at(tq)
            kq = int(tq * SR)
            if kq >= n: continue
            if eq["kick"] and q % 4 == 0 and not (q % 16 == 12 and b % 4 == 3):
                kk = np.sin(2 * np.pi * np.cumsum(45 + 80 * np.exp(-T(int(0.4 * SR)) * 30)) / SR) * env_exp(int(0.4 * SR), 0.16)
                mm = min(len(kk), n - kq); out["drums"][kq:kq + mm] += kk[:mm] * 0.42
            if eq["hat"] and q % 2 == 1:
                hh = hp(noise(int(0.04 * SR)), 7000) * env_exp(int(0.04 * SR), 0.012)
                mm = min(len(hh), n - kq); out["drums"][kq:kq + mm] += hh[:mm] * (0.07 if q % 4 == 3 else 0.045)
            if eq.get("dhol") and [1,0,0,1,0,0,1,0,1,0,0,1,0,1,1,0][q]:   # dhol bass head: pitched thump (dha .. dhin)
                m2 = int(0.32 * SR); dh = np.sin(2 * np.pi * np.cumsum(62 + 70 * np.exp(-T(m2) * 22)) / SR) * env_exp(m2, 0.13)
                mm = min(m2, n - kq); out["drums"][kq:kq + mm] += dh[:mm] * 0.34 * eq["dhol"] * (1.0 if q % 4 == 0 else 0.75)
            if eq.get("dhol") and q % 4 == 2:                            # dhol treble head: slap (ta)
                m2 = int(0.09 * SR); sl = bp(noise(m2), 1400, 5200) * env_exp(m2, 0.022) + np.sin(2 * np.pi * 330 * T(m2)) * env_exp(m2, 0.03) * 0.4
                mm = min(m2, n - kq); out["drums"][kq:kq + mm] += sl[:mm] * 0.16 * eq["dhol"]
            if eq["clap"] and q % 8 == 4:
                cl = bp(noise(int(0.2 * SR)), 900, 5000) * env_exp(int(0.2 * SR), 0.05)
                mm = min(len(cl), n - kq); out["drums"][kq:kq + mm] += cl[:mm] * 0.12
    # arp echo (dotted eighth)
    d = int(0.75 * BEAT * SR); a = out["arp"].copy()
    for g in (0.35, 0.15): a[d:] += out["arp"][:-d] * g; d *= 2
    out["arp"] = lp(a, 6000)
    # sidechain pump from the kick grid
    beat_phase = (T(n) % BEAT) / BEAT; pump = 1 - 0.45 * np.exp(-beat_phase * 9)
    for k in ("pad", "bass", "arp"): out[k] *= pump
    for a0, a1 in mutes:
        k0, k1 = int(a0 * SR), int(a1 * SR)
        for k in out: out[k][k0:k1] *= np.linspace(1, 0, k1 - k0) ** 0.25 * 0 + 0.0
    return out


_norm = lambda w: re.sub(r"[^0-9a-z-]", "", w.lower())
def word_time(s, word, nth=0):
    """time of the nth spoken `word` inside scene s (captions of the reel), so sound hits follow the voice like the picture"""
    ws = [w["t0"] for cap in TM["variants"]["reel"]["captions"] for w in cap["words"] if s["start"] <= w["t0"] < s["end"] and _norm(w["w"]) == _norm(word)]
    if len(ws) <= nth: raise ValueError(f"word cue '{word}' #{nth} not spoken in {s['id']}")
    return ws[nth]
def cue_time(c, s):
    if "w" in c: t = word_time(s, c["w"], c.get("nth", 0))
    elif "s" in c: t = s["start"] + c["s"]
    elif "p" in c: t = s["start"] + c["p"] * (s["end"] - s["start"])
    elif "e" in c: t = s["end"] - c["e"]
    else: return None
    t += c.get("offset", 0)
    if c.get("snap"): t = round(t / BEAT) * BEAT
    return t


def payoff_times(variant):
    """montage cut times and the end-card time, mirroring FinalMontage.tsx"""
    v = TM["variants"][variant]; s = next(x for x in v["scenes"] if x["id"] == "payoff")
    if variant == "reel": return [s["start"] + f / 30 for f in (10, 20, 30, 40)], s["start"] + 78 / 30
    line = next(x for x in v["vo"] if x["scene"] == "payoff")["id"]
    ws = [(re.sub(r"[,.?!:]+$", "", w["w"]), w["t0"] - s["start"]) for c in v["captions"] if c["line"] == line for w in c["words"]]
    words = [t for _, t in ws]
    w = lambda i, fb: words[i] if 0 <= i < len(words) else fb
    find = lambda rx, after=0: next((j for j, (x, _) in enumerate(ws) if j >= after and re.match(rx, x, re.I)), -1)
    ia = find(r"^agents$"); it = find(r"^(kaam|but)$", ia + 1); ie = find(r"^(Aap|So)$", it + 1)
    cuts = [w(1, .75), w(2, 1.5), w(3, 2.2), w(3, 2.2) + 16 / 30, w(3, 2.2) + 30 / 30]
    return [s["start"] + round(x * 30) / 30 for x in cuts], s["start"] + (round(w(ie, 8.4) * 30) - 6) / 30


def sfx_track(variant, total):
    v = TM["variants"][variant]; n = int(total * SR); y = np.zeros(n); log = []
    def put(t, x, g):
        k = int(t * SR); m = min(len(x), n - k)
        if m > 0 and k >= 0: y[k:k + m] += x[:m] * g
    for s in v["scenes"]:
        for c in CUES["scenes"][s["id"]]:
            if c["kind"] == "silence": continue
            if c["kind"] == "clip":   # real clip audio (audio/clips/<clip>.wav from clip time ct0), e.g. a demo's own dialogue
                t = cue_time(c, s); a, sr0 = sf.read(ROOT / "audio" / "clips" / f"{c['clip']}.wav", dtype="float64")
                a = a.mean(1) if a.ndim > 1 else a
                if sr0 != SR: a = resample_poly(a, SR, sr0)
                x = a[int(c["ct0"] * SR):int((c["ct0"] + c["len"]) * SR)].copy(); fd = min(len(x) // 4, int(0.08 * SR))
                x[:fd] *= np.linspace(0, 1, fd); x[-fd:] *= np.linspace(1, 0, fd)
                put(t, x, c["gain"]); log.append((t, f"{s['id']}:clip {c['clip']}")); continue
            if c["kind"] == "montageHits":
                cuts, _ = payoff_times(variant)
                for t in cuts: put(t, sfx("impact"), c["gain"] * 0.7); put(t, sfx("whoosh", 0.35), c["gain"] * 0.5); log.append((t, "montage hit"))
                continue
            if c["kind"] == "resolve" and not any(k in c for k in ("s", "p", "e", "w")):
                _, te = payoff_times(variant); put(te, sfx("resolve"), c["gain"]); log.append((te, "resolve")); continue
            t = cue_time(c, s); L = c.get("len")
            if L == 99: L = s["end"] - t - 0.2
            put(t, sfx(c["kind"], L, c.get("pitch", 1.0)), c["gain"]); log.append((t, f"{s['id']}:{c['kind']}"))
    return y, log


def load_vo(variant, n):
    a, sr = sf.read(ROOT / "public" / "audio" / f"vo_{variant}{SUFFIX}.wav", dtype="float64")
    if a.ndim > 1: a = a.mean(1)
    if sr != SR: a = resample_poly(a, SR, sr)
    return np.pad(a, (0, max(0, n - len(a))))[:n]


def envelope(x, att=0.01, rel=0.25):
    e = np.abs(x); out = np.zeros_like(e); a, r = math.exp(-1 / (att * SR)), math.exp(-1 / (rel * SR)); v = 0.0
    # cheap block-wise follower (5 ms blocks) to keep this fast in numpy
    B = int(0.005 * SR); blocks = e[: len(e) // B * B].reshape(-1, B).max(1); ob = np.zeros_like(blocks)
    a, r = math.exp(-1 / (att * 200)), math.exp(-1 / (rel * 200))
    for i, b in enumerate(blocks):
        v = a * v + (1 - a) * b if b > v else r * v + (1 - r) * b; ob[i] = v
    out[: len(ob) * B] = np.repeat(ob, B); out[len(ob) * B:] = ob[-1] if len(ob) else 0
    return out


def loudnorm(inp, outp):
    a = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(inp), "-af", "loudnorm=I=-14:TP=-2.0:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(a[a.rindex("{"):a.rindex("}") + 1])
    af = (f"loudnorm=I=-14:TP=-2.0:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=summary")
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(inp), "-af", af, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", str(outp)], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(outp), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    I = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1]); tp = float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r)[-1])
    return I, tp


def build(variant):
    v = TM["variants"][variant]; total = v["durationInFrames"] / TM["fps"]; n = int(total * SR)
    mus = music(variant, total); fx, log = sfx_track(variant, total); vo = load_vo(variant, n)
    bed = mus["pad"] + mus["bass"] + mus["arp"] + mus["drums"] + mus["drone"]
    for s in v["scenes"]:                                     # "lp": the caveat plays under a low-passed bed
        if CUES["energy"][s["id"]].get("lp"):
            k0, k1, xf = int(s["start"] * SR), int(s["end"] * SR), int(0.25 * SR)
            w = np.zeros(n); w[k0:k1] = 1; w[k0:k0 + xf] = np.linspace(0, 1, xf); w[k1 - xf:k1] = np.linspace(1, 0, xf)
            bed = bed * (1 - w) + lp(bed, 650) * w
    e = envelope(vo); duck = 1 - 0.72 * np.clip(e / 0.05, 0, 1)            # about -11 dB under speech (brief: 10-14 dB)
    fxduck = 1 - 0.5 * np.clip(e / 0.05, 0, 1)
    mix = vo * 1.0 + bed * duck * 0.45 + fx * fxduck * 0.8      # bed ~10 dB under the voice while it speaks
    mix = np.tanh(mix * 1.1) / 1.1
    O = VOUT / variant; O.mkdir(parents=True, exist_ok=True)
    for k, x in (("music", bed), ("sfx", fx), ("vo", vo)): sf.write(O / f"stem_{k}.wav", x.astype(np.float32), SR)
    raw = O / "mix_raw.wav"; sf.write(raw, np.stack([mix, mix], 1).astype(np.float32), SR)
    outp = ROOT / "public" / "audio" / f"mix_{variant}{SUFFIX}.wav"
    I, tp = loudnorm(raw, outp)
    print(f"{variant}: {total:.2f} s, {len(log)} cues, integrated {I:.1f} LUFS, true peak {tp:.1f} dBFS -> {outp.relative_to(ROOT)}")
    (O / "cue_log.json").write_text(json.dumps([{"t": round(t, 3), "cue": c} for t, c in sorted(log)], indent=0))
    return f"audio/mix_{variant}{SUFFIX}.wav"


if __name__ == "__main__":
    man = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"_doc": f"Soundtracks of version {VER}. Written by scripts/audio/score.py."}
    for var in [a for a in sys.argv[1:] if a in ("master", "reel")] or ["reel"]:
        man[var] = build(var)
    MANIFEST.write_text(json.dumps(man, indent=1))
