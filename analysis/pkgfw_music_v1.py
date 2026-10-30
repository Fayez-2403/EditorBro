"""Original 122 BPM electronic score for the GitHub package firewall reel, synthesized from scratch (no samples, no
third-party audio, so it is licensed by construction). A 2-beat pickup, then 19 bars: 38.361 s. Writes stems to
audio/pkgfw/stems/*.wav and the beat map to data/pkgfw/music.json. Sections follow the chapters (analysis/script_pkgfw.py):

  pickup      0.000-0.984   riser + ticking hats (the cube falls)
  bar 0       0.984-2.951   DROP on the slam; 2.459 tape-stop REWIND, the music cut out under it
  bars 1-3    2.951-8.852   tense groove (the fictional terminal): kick on 1 and 3, 16th hats, pulse bass, alarm stabs
  bars 4-7    8.852-16.721  build (the firewall): impacts on 8.852 and on the shield (12.787), snare roll into 16.721
  bars 8-12  16.721-26.557  DROP 2 (policy cards): four on the floor, claps on 2 and 4 (the cards' snare hits)
  bars 13-15 26.557-32.459  "but": 0.20 s of silence, then a breakdown (pads, kick on 1), riser into bar 16
  bars 16-17 32.459-36.393  final groove (the CTA)
  bar 18     36.393-38.361  impact, the D minor chord rings out

    python analysis/pkgfw_music.py
"""
import json, pathlib, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_pkgfw_v1 import BPM, BEAT, BAR, PICKUP, DURATION, bar, SLAM, REWIND
import grokbot_music as gm   # the synth voices (kick, clap, hats, supersaw, filters, riser, impact, sidechain)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gm.SR
N = int(round(DURATION * SR))
rng = np.random.default_rng(2026)

# D minor: Dm - Bb - F - C (i - VI - III - VII), one chord per bar
CHORDS = [[50, 53, 57, 62], [46, 50, 53, 58], [53, 57, 60, 65], [48, 52, 55, 60]]
ROOTS = [38, 34, 41, 36]
STOP = bar(13), bar(13) + 0.20          # the "but" silence


def section(b):
    if b < 0: return "pickup"
    if b == 0: return "hook"
    if b <= 3: return "terminal"
    if b <= 7: return "build"
    if b <= 12: return "drop"
    if b <= 15: return "breakdown"
    if b <= 17: return "final"
    return "outro"


def rewind_fx():
    """Tape stop then a rewind chatter: a pitch dive, then fast rising chirps under a reversed swoosh (0.49 s)."""
    n = int((bar(1) - REWIND) * SR); t = np.arange(n) / SR; d = t[-1]
    f = 700 * (60 / 700) ** np.clip(t / 0.16, 0, 1)
    dive = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * 0.6
    chatter = np.zeros(n)
    k, tc = 0, 0.12
    while tc < d - 0.02:
        m = int(0.022 * SR); tt = np.arange(m) / SR; fr = 500 + 2600 * (tc / d) ** 1.5
        s = int(tc * SR); m = min(m, n - s); chatter[s:s + m] += (np.sin(2 * np.pi * fr * tt) * np.hanning(len(tt)))[:m] * 0.35
        tc += 0.055 * (1 - 0.6 * tc / d); k += 1
    swoosh = gm.highpass(rng.standard_normal(n), 900) * (t / d) ** 2.5 * 0.35
    return np.tanh(1.3 * (dive + chatter + swoosh))


def main():
    stems = {k: np.zeros(N) for k in ("drums", "bass", "chords", "fx")}
    kicks, snares = [], []
    nb = 19
    for b in range(-1, nb):                              # b = -1 is the pickup (its last 2 beats)
        sec = section(b)
        t0 = bar(b) if b >= 0 else 0.0
        beats = range(4) if b >= 0 else range(2)
        for q in beats:
            t = t0 + q * BEAT if b >= 0 else q * BEAT
            if REWIND <= t < bar(1) or STOP[0] <= t < STOP[1]: continue
            k = None
            if sec == "hook" and q == 0: k = 1.0
            elif sec == "hook" and q in (1, 2): k = 0.8
            elif sec == "terminal" and q in (0, 2): k = 0.8
            elif sec == "build" and (b >= 5 or q in (0, 2)): k = 0.85
            elif sec in ("drop", "final"): k = 0.95
            elif sec == "breakdown" and q == 0: k = 0.7
            elif sec == "outro" and q == 0: k = 1.0
            if k: gm.place(stems["drums"], t, gm.kick(k)); kicks.append(round(t, 4))
            if q in (1, 3) and sec in ("terminal", "build", "drop", "final"):
                gm.place(stems["drums"], t, gm.clap(), 0.95 if sec in ("drop", "final") else 0.55); snares.append(round(t, 4))
            # hats: 16ths in the terminal (tension), 8ths elsewhere, open on the off-beats in the drops
            sub = 4 if sec == "terminal" else 2
            if sec in ("pickup", "terminal", "build", "drop", "final", "hook"):
                for e in range(sub):
                    th = t + e * BEAT / sub
                    if REWIND <= th < bar(1): continue
                    op = sub == 2 and e == 1 and sec in ("drop", "final")
                    gm.place(stems["drums"], th, gm.hat(open_=op), (0.55 if e else 0.4) * (0.6 if sec == "pickup" else 1))
    for i in range(16):                                  # snare roll into the drop (bar 7) and into the final groove (bar 15)
        for start in (bar(7) + 2 * BEAT, bar(15) + 2 * BEAT):
            gm.place(stems["drums"], start + i * BEAT / 8, gm.clap(), 0.22 + 0.04 * i)
    g = gm.sidechain(kicks, N)
    for b in range(nb):
        c = b % 4; t0 = bar(b); n = int(BAR * SR); sec = section(b)
        if sec == "hook":   # a stab on the slam, then a glitch stutter on the chord until the rewind
            stab = gm.supersaw([m + 12 for m in CHORDS[0]], int(0.9 * SR)) * gm.env_ad(int(0.9 * SR), 0.002, 0.3)
            gm.place(stems["chords"], t0, stab, 0.9)
            for j in range(4):
                gm.place(stems["chords"], t0 + BEAT + j * BEAT / 4, stab[:int(0.06 * SR)] * gm.env_ad(int(0.06 * SR), 0.001, 0.03), 0.5)
        elif sec in ("drop", "final"):
            gm.place(stems["chords"], t0, gm.lowpass_sweep(gm.supersaw(CHORDS[c], n), 2200, 8000) * 0.62)
        elif sec in ("build", "breakdown"):
            pad = gm.onepole_lp(gm.supersaw(CHORDS[c], n, voices=5, spread=0.006), 900 + (b - 4) * 260 if sec == "build" else 1300) * 0.5
            gm.place(stems["chords"], t0, pad)
        elif sec == "terminal" and b >= 2:   # alarm stabs: a minor second, on the downbeat and beat 3
            for q in (0, 2):
                al = gm.supersaw([62, 63], int(0.25 * SR), voices=3, spread=0.003) * gm.env_ad(int(0.25 * SR), 0.002, 0.12)
                gm.place(stems["chords"], t0 + q * BEAT, gm.onepole_lp(al, 3500), 0.45)
        if sec in ("terminal", "build", "drop", "final", "breakdown"):   # pluck arpeggio on eighths
            for e in range(8):
                te = t0 + e * BEAT / 2
                if STOP[0] <= te < STOP[1]: continue
                m = CHORDS[c][[0, 2, 1, 3, 2, 1, 3, 2][e]] + 12
                pl = gm.supersaw([m], int(0.16 * SR), voices=3, spread=0.004) * gm.env_ad(int(0.16 * SR), 0.002, 0.06)
                gm.place(stems["chords"], te, gm.onepole_lp(pl, 2400 if sec == "terminal" else 4200), {"terminal": 0.28, "drop": 0.22, "final": 0.22}.get(sec, 0.3))
        if sec in ("hook", "terminal", "build", "drop", "final"):   # bass: off-beat pulses, sustained sub in the drops
            if sec in ("drop", "final"):
                tt = np.arange(n) / SR; sb = np.sin(2 * np.pi * gm.hz(ROOTS[c]) * tt) + 0.3 * np.sin(4 * np.pi * gm.hz(ROOTS[c]) * tt)
                gm.place(stems["bass"], t0, 0.55 * sb)
            else:
                for e in range(8 if sec == "terminal" else 4):
                    step = BEAT / 2 if sec == "terminal" else BEAT
                    tb = t0 + e * step + (0 if sec == "terminal" else BEAT / 2)
                    if REWIND <= tb < bar(1): continue
                    m2 = int(0.2 * SR); tt = np.arange(m2) / SR
                    gm.place(stems["bass"], tb, 0.42 * np.sin(2 * np.pi * gm.hz(ROOTS[c if sec != 'hook' else 0]) * tt) * gm.env_ad(m2, 0.004, 0.1))
    stems["chords"] *= np.minimum(1, 0.35 + g); stems["bass"] *= g
    # fx: the pickup riser into the slam, impacts, the rewind, risers into the drops
    gm.place(stems["fx"], 0.0, gm.riser(int(SLAM * SR), 300, 5000), 1.1)
    gm.place(stems["fx"], SLAM, gm.impact(), 1.0)
    gm.place(stems["fx"], REWIND, rewind_fx(), 0.9)
    gm.place(stems["fx"], bar(4), gm.impact(int(1.4 * SR)), 0.6)
    gm.place(stems["fx"], bar(6), gm.impact(int(1.6 * SR)), 0.75)          # the shield
    gm.place(stems["fx"], bar(8) - 3.0, gm.riser(int(3.0 * SR)), 0.9)
    gm.place(stems["fx"], bar(8), gm.impact(int(1.4 * SR)), 0.7)
    gm.place(stems["fx"], bar(16) - 3.0, gm.riser(int(3.0 * SR)), 0.9)
    gm.place(stems["fx"], bar(16), gm.impact(int(1.4 * SR)), 0.7)
    gm.place(stems["fx"], bar(18), gm.impact(), 1.0)
    t = np.arange(int((DURATION - bar(18)) * SR)) / SR                     # the final Dm chord rings out
    gm.place(stems["chords"], bar(18), gm.onepole_lp(gm.supersaw([m + 12 for m in CHORDS[0]], len(t)), 2500) * np.exp(-t / 0.7) * 0.6)
    for k in stems:                                                         # the rewind and the "but": the music cut out
        if k != "fx": stems[k][int(REWIND * SR):int(bar(1) * SR)] *= 0.0
        stems[k][int(STOP[0] * SR):int(STOP[1] * SR)] = 0
        stems[k][-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))
    out = ROOT / "audio" / "pkgfw" / "stems"; out.mkdir(parents=True, exist_ok=True)
    for k, x in stems.items():
        x = np.clip(x, -1, 1)
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767 * 0.9).astype(np.int16).tobytes())
    beats = [round(q * BEAT, 4) for q in range(2)] + [round(bar(b) + q * BEAT, 4) for b in range(nb) for q in range(4)]
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "pickup": PICKUP, "bars": nb, "duration": DURATION,
            "beats": beats, "downbeats": [round(bar(b), 4) for b in range(nb)], "kicks": kicks, "snares": snares,
            "sections": [{"name": s, "start": round(a, 4), "end": round(b_, 4)} for s, a, b_ in
                         [("pickup", 0, SLAM), ("hook", SLAM, bar(1)), ("terminal", bar(1), bar(4)), ("build", bar(4), bar(8)),
                          ("drop", bar(8), bar(13)), ("breakdown", bar(13), bar(16)), ("final", bar(16), bar(18)), ("outro", bar(18), DURATION)]],
            "silences": [[round(REWIND, 4), round(bar(1), 4), "music only (the rewind fx plays)"], [round(STOP[0], 4), round(STOP[1], 4), "all"]],
            "impacts": [round(x, 4) for x in (SLAM, bar(4), bar(6), bar(8), bar(16), bar(18))]}
    (ROOT / "data" / "pkgfw").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "pkgfw" / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"wrote {len(stems)} stems ({DURATION:.3f} s, pickup + {nb} bars at {BPM:g} BPM), {len(kicks)} kicks, {len(snares)} snares")


if __name__ == "__main__":
    main()
