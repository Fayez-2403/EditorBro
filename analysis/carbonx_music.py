"""Original 112 BPM score for the Carbon-X reel, synthesized from scratch (no samples, no third-party audio: licensed by
construction). D minor, Dm - Bb - F - C, one chord per bar: four-on-the-floor electronic drums, a synthesized dhol (a two-headed
bhangra-style drum: the low "dagga" and the stick "tilli") and a tabla-like "na" ring for the Bollywood-inspired percussion the
brief asks for, an octave bass, a glassy arpeggio and supersaw pads. The sections follow the chapters (data/carbonx/layout.json)
and the cue sheet (data/carbonx/cues.json):

  hook     the impact on frame 0, the full groove at once
  twist    a break: pads, arp and the dhol only, a riser into the model reveal
  model    the groove; both: the same, busier arp
  mutation tension: half-time kick, ticking sixteenths, no dhol
  answer   the groove again
  bench    a snare roll building into "66.7", the full groove from the number
  warn     the disclaimer: the whole bed low-passed (the brief), half-time, a sub boom under the NOT A DIAGNOSIS stamp
  open     the full groove, brighter (the lift); hw: lighter, sixteenth hats
  payoff   a build (riser, roll) into the CTA; cta: the drop on "comment", the dhol fill
  end      the stinger on the end card, the Dm chord rings to 50.0 s

Writes audio/carbonx/stems/{drums,bass,chords,fx}.wav and data/carbonx/music.json (the grid, kicks, snares, sections).

    python analysis/carbonx_music.py
"""
import json, pathlib, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_carbonx import BPM, BEAT, BAR, E8, DURATION
import grokbot_music as gm   # kick, clap, hats, supersaw, filters, riser, impact, sidechain (seeded)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gm.SR
CHORDS = [[50, 53, 57, 62], [46, 50, 53, 58], [45, 48, 53, 57], [48, 52, 55, 60]]   # Dm - Bb - F - C
ROOTS = [38, 34, 41, 36]
rng = np.random.default_rng(112)


def dagga(level=1.0):
    """The dhol's bass head: a pitch-dropping thump with a skin slap."""
    n = int(0.32 * SR); t = np.arange(n) / SR
    f = 62 + 70 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    slap = gm.bandpass(rng.standard_normal(n), 200, 1800) * np.exp(-t / 0.012) * 0.4
    return level * np.tanh(1.5 * (body + slap))


def tilli(level=1.0):
    """The dhol's treble head, hit with a thin stick: a bright crack and a short ring."""
    n = int(0.14 * SR); t = np.arange(n) / SR
    crack = gm.bandpass(rng.standard_normal(n), 1800, 8000) * np.exp(-t / 0.008)
    ring = np.sin(2 * np.pi * 410 * t) * np.exp(-t / 0.05) * 0.35
    return level * 0.7 * (crack + ring)


def na(level=1.0, f0=720):
    """A tabla-like "na": a pitched ring that bends down a little, with harmonics."""
    n = int(0.3 * SR); t = np.arange(n) / SR
    f = f0 * (1 + 0.06 * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + 0.45 * np.sin(2.01 * ph) + 0.2 * np.sin(3.02 * ph)) * np.exp(-t / 0.11)
    return level * 0.45 * (x + gm.bandpass(rng.standard_normal(n), 2000, 7000) * np.exp(-t / 0.004) * 0.5)


def snare(level=1.0):
    n = int(0.22 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 200 * t) * np.exp(-t / 0.035) * 0.5
    tail = gm.bandpass(rng.standard_normal(n), 900, 8000) * 0.25 * np.exp(-t / 0.07)
    c = np.pad(gm.clap(), (0, max(0, n - len(gm.clap()))))[:n]
    return level * np.tanh(1.2 * (c + body + tail))


def pluck(m, d=0.2, fc=3600):
    n = int(d * SR); t = np.arange(n) / SR
    x = 0.55 * np.sin(2 * np.pi * gm.hz(m) * t) + 0.3 * np.sin(4 * np.pi * gm.hz(m) * t) + 0.25 * gm.saw(gm.hz(m), n, 0.002)
    return gm.onepole_lp(x * np.minimum(1, t / 0.002) * np.exp(-t / 0.09), fc)


def bassnote(m, d, fc=900):
    n = int(d * SR); t = np.arange(n) / SR
    x = gm.saw(gm.hz(m), n, 0.0) + 0.5 * gm.saw(gm.hz(m), n, 0.004) + 0.6 * np.sin(2 * np.pi * gm.hz(m) * t)
    return gm.onepole_lp(x * np.minimum(1, t / 0.004) * np.exp(-t / 0.18), fc) * 0.45


# the dhol "chaal" on sixteenths of a bar (original pattern): dagga (low) and tilli (stick)
DAGGA = {0: 1.0, 6: 0.7, 8: 0.85, 11: 0.5, 14: 0.7}
TILLI = {2: 0.7, 3: 0.4, 4: 0.8, 7: 0.6, 10: 0.7, 12: 0.8, 13: 0.4, 15: 0.6}


def main():
    D = ROOT / "data" / "carbonx"
    lay = json.loads((D / "layout.json").read_text()); cues = json.loads((D / "cues.json").read_text()); ev = cues["events"]
    N = int(round(DURATION * SR)); nb = int(np.ceil(DURATION / BAR))
    chap = lambda t: next((c[2] for c in lay["chapters"] if c[0] <= t + 1e-6 < c[1]), "end")
    stems = {k: np.zeros(N) for k in ("drums", "bass", "chords", "fx")}
    arp = np.zeros(N)
    kicks, snares = [], []
    drop, num = ev["cta.drop"], ev["be.num"]
    ring = ev["end.in"]
    full = ("hook", "model", "both", "answer", "open", "cta", "end")
    # room for consonants: a snare, tilli or "na" landing 0-120 ms before a spoken word plays at 45% (its tail masked "hain,")
    onsets = np.array(sorted(w["start"] for l in json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"] for w in l["words"]))
    def room(t):
        i = np.searchsorted(onsets, t - 0.02); return 0.45 if i < len(onsets) and onsets[i] - t <= 0.12 else 1.0
    for b in range(nb):
        for s in range(16):
            t = b * BAR + s * BEAT / 4
            if t >= DURATION or t >= ring: continue
            ch = chap(t); q, sub = divmod(s, 4)
            groove = ch in full or (ch == "bench" and t >= num - 1e-6)
            build_b = ch == "bench" and t < num
            build_p = ch == "payoff" or (ch == "cta" and t < drop)
            # kick
            k = 0.0
            if sub == 0 and (groove or ch == "hw"): k = 0.78 if ch != "hw" else 0.58
            if ch == "mutation" and s in (0, 10): k = 0.7
            if ch == "warn" and s in (0, 8 + 2): k = 0.62
            if (build_b or build_p) and sub == 0: k = 0.5
            if ch == "twist" and s == 0 and t < ev["tw.twist"]: k = 0.0
            if k: gm.place(stems["drums"], t, gm.kick(k)); kicks.append(round(t, 4))
            # snare / clap on 2 and 4; the builds roll
            sn = 0.0
            if sub == 0 and q in (1, 3) and (groove or ch == "hw"): sn = 0.5
            if ch == "mutation" and s == 8: sn = 0.5
            if build_b:
                p = (t - ev["be.in"]) / max(0.1, num - ev["be.in"])
                if (sub % 2 == 0 and p < 0.55) or p >= 0.55: sn = 0.1 + 0.38 * p ** 1.4
            if build_p:
                p = (t - ev["pa.in"]) / max(0.1, drop - ev["pa.in"])
                if (sub % 2 == 0 and p < 0.5) or p >= 0.5: sn = 0.1 + 0.4 * p ** 1.4
            if sn: gm.place(stems["drums"], t, snare(sn * room(t))); snares.append(round(t, 4))
            # hats
            if groove and ch != "end":
                gm.place(stems["drums"], t, gm.hat(), 0.85 if sub == 2 else 0.35 if sub == 0 else 0.0)
            if ch in ("mutation", "hw") or (ch == "warn"):
                gm.place(stems["drums"], t, gm.hat(), 0.5 if sub == 2 else 0.25)
            # the dhol and the tabla ring: the hook, the twist break, the grooves, the CTA fill
            if ch in ("hook", "twist", "model", "both", "answer", "open", "cta") or (ch == "bench" and t >= num):
                lv = 0.5 if ch == "twist" else 0.42
                if s in DAGGA: gm.place(stems["drums"], t, dagga(DAGGA[s] * lv))
                if s in TILLI: gm.place(stems["drums"], t, tilli(TILLI[s] * lv * room(t)))
                if ch in ("twist", "open", "cta") and s in (6, 14): gm.place(stems["drums"], t, na(0.5 * room(t), 720 if s == 6 else 860))
            if ch == "cta" and t >= drop - BEAT - 1e-6 and t < drop:          # the dhol fill into the drop
                gm.place(stems["drums"], t, tilli(0.55)); gm.place(stems["drums"], t, dagga(0.4))
    g = gm.sidechain(kicks, N, depth=0.42, rel=0.2)
    for b in range(nb):
        t0 = b * BAR; c = b % 4; n = int(BAR * SR)
        if t0 >= DURATION: break
        ch = chap(t0 + 0.01)
        bright = {"hook": 2200, "twist": 1500, "model": 2400, "both": 2600, "mutation": 1100, "answer": 2400, "bench": 1800, "warn": 900,
                  "open": 3000, "hw": 1700, "payoff": 1400, "cta": 3000, "end": 3000}[ch]
        pad = gm.onepole_lp(gm.supersaw(CHORDS[c], n, voices=5, spread=0.008), bright) * 0.38
        gm.place(stems["chords"], t0, pad)
        for e8 in range(8):
            t = t0 + e8 * E8
            if t >= DURATION or t >= ring: continue
            ch8 = chap(t)
            if ch8 == "twist" and e8 % 4: continue
            if ch8 in ("mutation", "warn") and e8 % 2: continue                 # half-time
            m = ROOTS[c] + (12 if e8 % 2 else 0)
            gm.place(stems["bass"], t, bassnote(m, E8 * (0.92 if ch8 not in ("twist", "mutation", "warn") else 1.8), 700 if ch8 in ("mutation", "warn") else 1000))
        for s in range(16):
            t = t0 + s * BEAT / 4
            if t >= DURATION or t >= ring: continue
            ch16 = chap(t)
            if ch16 in ("mutation", "warn", "hw") or (ch16 in ("bench", "payoff") and s % 2) or (ch16 == "model" and s % 2): continue
            m = CHORDS[c][[0, 2, 3, 1, 2, 3, 1, 2][s % 8]] + 24 - (12 if s % 8 in (0, 4) else 0)
            gm.place(arp, t, pluck(m, fc=3200 if ch16 not in ("twist",) else 2200), 0.11)
    for d, gain in ((0.75 * BEAT, 0.3), (1.5 * BEAT, 0.13)):              # a dotted-eighth echo on the arp
        k = int(d * SR); arp[k:] += gain * arp[:-k].copy()
    stems["chords"] += arp
    # fx: the frame-0 impact, the riser into the model reveal, the riser into the drop, the drop impact, the warn boom
    gm.place(stems["fx"], 0.0, gm.impact(int(1.8 * SR)), 0.34)
    r1 = ev["mo.in"] - ev["tw.in"]; gm.place(stems["fx"], ev["tw.in"], gm.riser(int(r1 * SR), 300, 5000), 0.55)
    r2 = drop - ev["pa.in"]; gm.place(stems["fx"], ev["pa.in"], gm.riser(int(r2 * SR), 200, 6000), 0.5)
    r3 = num - ev["be.in"]; gm.place(stems["fx"], ev["be.in"], gm.riser(int(r3 * SR), 250, 4000), 0.35)
    gm.place(stems["fx"], drop, gm.impact(int(1.6 * SR)), 0.26)
    gm.place(stems["fx"], ev["wa.nahi"], gm.impact(int(1.4 * SR)), 0.22)
    stems["chords"] *= np.minimum(1, 0.55 + g); stems["bass"] *= g
    # the disclaimer: the whole bed low-passed (with 40 ms crossfades in and out)
    a, b_ = int((ev["wa.in"] - 0.02) * SR), int(ev["op.in"] * SR); f = int(0.04 * SR)
    for k in ("drums", "bass", "chords"):
        seg = stems[k][a - f:b_ + f].copy(); lpv = gm.onepole_lp(gm.onepole_lp(seg, 520), 520) * 1.6
        w = np.ones(len(seg)); w[:2 * f] = np.linspace(0, 1, 2 * f); w[-2 * f:] = np.linspace(1, 0, 2 * f)
        stems[k][a - f:b_ + f] = seg * (1 - w) + lpv * w
    # the end: the stinger (impact, a bright Dm stab, a high shimmer) on the end card, the chord rings to 50.0 s
    i0 = int(ring * SR); tail = N - i0; tt = np.arange(tail) / SR
    for k in ("drums", "bass", "chords"): stems[k][i0:] *= np.exp(-tt / 0.03)
    stab = gm.onepole_lp(gm.supersaw(CHORDS[0] + [65, 69, 74], tail, voices=5, spread=0.008), 3600) * np.exp(-tt / 1.0) * 0.6
    stems["chords"][i0:] += stab
    for j, m in enumerate([74, 81, 86]): gm.place(stems["chords"], ring + j * E8 / 2, pluck(m, 0.6, 5000), 0.22)
    stems["bass"][i0:] += 0.45 * np.sin(2 * np.pi * gm.hz(38) * tt) * np.exp(-tt / 0.9)
    gm.place(stems["fx"], ring, gm.impact(int(1.8 * SR)), 0.3)
    gm.place(stems["drums"], ring, gm.kick(0.85)); kicks.append(round(ring, 4))
    gm.place(stems["drums"], ring, dagga(0.7)); gm.place(stems["drums"], ring, na(0.6, 860))
    for k in stems:
        stems[k][-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
    out = ROOT / "audio" / "carbonx" / "stems"; out.mkdir(parents=True, exist_ok=True)
    peak = max(np.abs(x).max() for x in stems.values())
    for k, x in stems.items():
        with wave.open(str(out / f"{k}.wav"), "wb") as w_:
            w_.setnchannels(1); w_.setsampwidth(2); w_.setframerate(SR); w_.writeframes((np.clip(x / max(1, peak), -1, 1) * 32767 * 0.9).astype(np.int16).tobytes())
    beats = [round(i * BEAT, 4) for i in range(int(DURATION / BEAT) + 1)]
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "pickup": 0.0, "bars": nb, "duration": DURATION, "beats": beats,
            "downbeats": [round(b * BAR, 4) for b in range(nb) if b * BAR < DURATION], "kicks": sorted(set(kicks)), "snares": sorted(set(snares)),
            "sections": [{"name": c[2], "start": c[0], "end": c[1]} for c in lay["chapters"]],
            "lowpass": [ev["wa.in"] - 0.02, ev["op.in"], "the disclaimer: bed low-passed at about 520 Hz"], "silences": [],
            "impacts": [0.0, ev["wa.nahi"], drop, ring], "drop": drop, "ring": ring}
    (D / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"score: {DURATION:.2f} s, {nb} bars at {BPM:g} BPM; {len(set(kicks))} kicks, {len(set(snares))} snares; lowpass {ev['wa.in']:.2f}-{ev['op.in']:.2f}; drop {drop:.3f}; stinger {ring:.3f}")


if __name__ == "__main__":
    main()
