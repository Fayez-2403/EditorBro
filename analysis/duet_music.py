"""Original 124 BPM synth-pop score for the Claude Duet reel, synthesized from scratch (no samples: licensed by construction).
"Blinding Lights" was the brief's creative reference only (driving 80s energy); nothing of it is used. C minor,
Cm - Ab - Eb - Bb, one chord per bar: octave synth bass on eighths, a gated 80s snare, an echoing arpeggio, supersaw pads.
The sections follow the voice's chapters (data/duet/layout.json) and the cue sheet (data/duet/cues.json):

  hook    an impact on frame 0, then the full drive at once (the hook needs energy); a snare fill into "Ab AI khud bolega"
  duet    the drums drop out: pads, arp and a riser into the brief ("morph + rising synth")
  brief   the groove: four-on-the-floor kick, gated snare on 2 and 4, eighth hats, bass, arp
  tasks   the same, sixteenth hats (busier)
  twist   the record scratch stops everything; silence under "Lekin important twist:", then a tense half-time groove from "email"
  hours   a lighter groove with ticking sixteenths (the clock)
  avail   the full groove again (lift)
  india   filtered, a stutter on "nahi", then calm pads only
  cta     a build (snare roll, riser, the filter opening) to the drop on the bar line at "Comment DUET", then the full groove
  end     the last chord rings out to 50.0 s

Writes audio/duet/stems/{drums,bass,chords,fx}.wav and data/duet/music.json (the grid, kicks, snares, sections, the stop).

    python analysis/duet_music.py
"""
import json, pathlib, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_duet import BPM, BEAT, BAR, E8, DURATION
import grokbot_music as gm   # kick, clap, hats, supersaw, filters, riser, impact, sidechain (seeded)

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gm.SR
CHORDS = [[48, 51, 55, 60], [44, 48, 51, 56], [46, 51, 55, 58], [46, 50, 53, 58]]   # Cm - Ab - Eb/Bb - Bb
ROOTS = [36, 32, 39, 34]
rng = np.random.default_rng(124)


def snare(level=1.0):
    """A gated 80s snare: the clap, a tonal body, a flat noise tail cut off at 0.16 s (the gate)."""
    n = int(0.2 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04) * 0.5
    tail = gm.bandpass(rng.standard_normal(n), 600, 7000) * 0.22 * np.clip((0.16 - t) / 0.01, 0, 1)
    c = np.pad(gm.clap(), (0, max(0, n - len(gm.clap()))))[:n]
    return level * np.tanh(1.2 * (c + body + tail))


def pluck(m, d=0.16, fc=3200):
    n = int(d * SR); t = np.arange(n) / SR
    x = 0.6 * np.sign(np.sin(2 * np.pi * gm.hz(m) * t)) + 0.4 * gm.saw(gm.hz(m), n, 0.003)
    return gm.onepole_lp(x * np.minimum(1, t / 0.003) * np.exp(-t / 0.07), fc)


def bassnote(m, d, fc=900):
    n = int(d * SR); t = np.arange(n) / SR
    x = gm.saw(gm.hz(m), n, 0.0) + 0.5 * gm.saw(gm.hz(m), n, 0.004)
    return gm.onepole_lp(x * np.minimum(1, t / 0.004) * np.exp(-t / 0.16), fc) * 0.5


def main():
    D = ROOT / "data" / "duet"
    lay = json.loads((D / "layout.json").read_text()); cues = json.loads((D / "cues.json").read_text()); ev = cues["events"]
    N = int(round(DURATION * SR)); nb = int(np.ceil(DURATION / BAR))
    chap = lambda t: next((c[2] for c in lay["chapters"] if c[0] <= t + 1e-6 < c[1]), "end")
    stems = {k: np.zeros(N) for k in ("drums", "bass", "chords", "fx")}
    arp = np.zeros(N)
    kicks, snares = [], []
    stop0, stop1 = ev["tw.in"], ev["tw.email"]                       # the myth-bust stop: no music from the scratch to "email"
    drop, ring = ev["cta.drop"], round(np.floor((DURATION - 1.2) / BAR) * BAR, 4)   # the last chord rings from the bar line
    stut = ev["in.nahi"]
    stopped = lambda t: stop0 - 0.01 <= t < stop1 or t >= ring
    full = ("hook", "brief", "tasks", "avail")
    for b in range(nb):
        for s in range(16):                                           # sixteenths
            t = b * BAR + s * BEAT / 4
            if t >= DURATION or stopped(t): continue
            ch = chap(t); q, sub = divmod(s, 4)
            build = ch == "cta" and t < drop; dropped = ch in ("cta", "end") and t >= drop
            # kick
            k = 0.0
            if sub == 0 and (ch in full + ("hours",) or dropped): k = 0.75 if ch != "hours" else 0.55
            if ch == "twist" and t >= stop1 and (s in (0, 6) or (q == 2 and sub == 0 and False)): k = 0.7
            if build and sub == 0: k = 0.35 + 0.35 * (t - ev["cta.in"]) / max(0.1, drop - ev["cta.in"])
            if ch == "india" and t < stut and sub == 0: k = 0.45
            if k: gm.place(stems["drums"], t, gm.kick(k)); kicks.append(round(t, 4))
            # snare: 2 and 4 in the groove; beat 3 in the half-time twist; a fill into the reversal; the CTA roll
            sn = 0.0
            if sub == 0 and q in (1, 3) and (ch in full or dropped): sn = 0.55
            if ch == "twist" and t >= stop1 and s == 8: sn = 0.6
            if ch == "hook" and ev["hook.ab"] - BEAT - 1e-6 <= t < ev["hook.ab"] - 1e-6: sn = 0.22 + 0.25 * (t - (ev["hook.ab"] - BEAT)) / BEAT
            if build:
                p = (t - ev["cta.in"]) / max(0.1, drop - ev["cta.in"])
                if (sub % 2 == 0 and p < 0.5) or p >= 0.5: sn = 0.12 + 0.4 * p ** 1.5
            if sn: gm.place(stems["drums"], t, snare(sn)); snares.append(round(t, 4))
            # hats
            if ch in ("hook", "brief", "avail") or dropped:
                if sub == 2: gm.place(stems["drums"], t, gm.hat(), 0.9)
                elif sub == 0: gm.place(stems["drums"], t, gm.hat(), 0.45)
            if ch in ("tasks", "hours") or (ch == "twist" and t >= stop1):
                gm.place(stems["drums"], t, gm.hat(), 0.55 if sub == 2 else 0.3)
    g = gm.sidechain(kicks, N, depth=0.45, rel=0.2)
    for b in range(nb):
        t0 = b * BAR; c = b % 4; n = int(BAR * SR)
        if t0 >= DURATION: break
        ch = chap(t0 + 0.01)
        bright = {"hook": 1900, "duet": 1300, "brief": 2300, "tasks": 2300, "twist": 900, "hours": 1500, "avail": 2500, "india": 700,
                  "cta": 2600, "end": 2600}[ch]
        if ch == "cta" and t0 < drop: bright = 900 + 1700 * (t0 - ev["cta.in"]) / max(0.1, drop - ev["cta.in"])
        pad = gm.onepole_lp(gm.supersaw(CHORDS[c], n, voices=5, spread=0.007), bright) * 0.4
        gm.place(stems["chords"], t0, pad)
        for e8 in range(8):                                           # bass: root and octave on eighths
            t = t0 + e8 * E8
            if t >= DURATION or stopped(t): continue
            ch8 = chap(t)
            if ch8 == "india" and t >= stut: continue
            if ch8 == "duet" and e8 % 4: continue                     # held quarter-bar notes under the morph
            if ch8 == "twist" and e8 % 2: continue                    # half-time
            m = ROOTS[c] + (12 if e8 % 2 else 0)
            gm.place(stems["bass"], t, bassnote(m, E8 * (0.92 if ch8 not in ("duet", "twist") else 1.8), 700 if ch8 in ("twist", "india") else 1000))
        for s in range(16):                                           # the arp on sixteenths (with the echo below)
            t = t0 + s * BEAT / 4
            if t >= DURATION or stopped(t): continue
            ch16 = chap(t)
            if ch16 not in ("hook", "duet", "brief", "avail", "cta", "end") or (ch16 == "cta" and t < drop and s % 2): continue
            m = CHORDS[c][[0, 2, 3, 1, 2, 3, 1, 2][s % 8]] + 24 - (12 if s % 8 in (0, 4) else 0)
            gm.place(arp, t, pluck(m, fc=2400 if ch16 != "duet" else 1800), 0.12)
    for d, gain in ((0.75 * BEAT, 0.32), (1.5 * BEAT, 0.14)):         # a dotted-eighth echo on the arp
        k = int(d * SR); arp[k:] += gain * arp[:-k].copy()
    stems["chords"] += arp
    # the stop: everything tonal ends at the scratch (a 25 ms fade), and comes back on "email"
    for k in ("bass", "chords"):
        a, b_ = int(stop0 * SR), int(stop1 * SR); f = int(0.025 * SR)
        stems[k][a:a + f] *= np.linspace(1, 0, f); stems[k][a + f:b_] = 0; stems[k][b_:b_ + f] *= np.linspace(0, 1, f)
    # India: a stutter on "nahi" (the last sixteenth repeated four times, filtered), then pads only
    a = int(stut * SR); sl = int(BEAT / 4 * SR)
    for k in ("drums", "bass", "chords"):
        grain = stems[k][a - sl:a].copy()
        for r in range(4): stems[k][a + r * sl:a + (r + 1) * sl] = grain * (0.8 ** r)
        if k == "drums": stems[k][a + 4 * sl:int(ev["cta.in"] * SR)] = 0
    stems["chords"][a + 4 * sl:int(ev["cta.in"] * SR)] = gm.onepole_lp(stems["chords"][a + 4 * sl:int(ev["cta.in"] * SR)], 900)
    # fx: the frame-0 impact, the riser into the brief, the riser into the drop, the drop impact
    gm.place(stems["fx"], 0.0, gm.impact(int(1.6 * SR)), 0.3)
    r1 = ev["brief.in"] - ev["duet.in"]; gm.place(stems["fx"], ev["duet.in"], gm.riser(int(r1 * SR), 300, 5000), 0.8)
    r2 = drop - ev["cta.in"]; gm.place(stems["fx"], ev["cta.in"], gm.riser(int(r2 * SR), 200, 6000), 0.5)
    gm.place(stems["fx"], drop, gm.impact(int(1.8 * SR)), 0.28)
    stems["chords"] *= np.minimum(1, 0.55 + g); stems["bass"] *= g
    # the end: the Cm chord rings from the last bar line to 50.0 s
    i0 = int(ring * SR); tail = N - i0; tt = np.arange(tail) / SR
    for k in ("drums", "bass", "chords"): stems[k][i0:] = 0
    ringc = gm.onepole_lp(gm.supersaw(CHORDS[0] + [63, 67], tail, voices=5, spread=0.007), 2200) * np.exp(-tt / 1.1) * 0.5
    stems["chords"][i0:] += ringc
    stems["bass"][i0:] += 0.4 * np.sin(2 * np.pi * gm.hz(36) * tt) * np.exp(-tt / 0.9)
    gm.place(stems["drums"], ring, gm.kick(0.8)); kicks.append(round(ring, 4))
    for k in stems:
        stems[k][-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
    out = ROOT / "audio" / "duet" / "stems"; out.mkdir(parents=True, exist_ok=True)
    peak = max(np.abs(x).max() for x in stems.values())
    for k, x in stems.items():
        with wave.open(str(out / f"{k}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x / max(1, peak), -1, 1) * 32767 * 0.9).astype(np.int16).tobytes())
    beats = [round(i * BEAT, 4) for i in range(int(DURATION / BEAT) + 1)]
    grid = {"bpm": BPM, "beat": BEAT, "bar": BAR, "pickup": 0.0, "bars": nb, "duration": DURATION, "beats": beats,
            "downbeats": [round(b * BAR, 4) for b in range(nb) if b * BAR < DURATION], "kicks": sorted(set(kicks)), "snares": sorted(set(snares)),
            "sections": [{"name": c[2], "start": c[0], "end": c[1]} for c in lay["chapters"]],
            "music_stops": [[stop0, stop1, "record scratch: no music under 'Lekin important twist:'"]], "silences": [],
            "impacts": [0.0, drop], "drop": drop, "ring": ring}
    (D / "music.json").write_text(json.dumps(grid, indent=1))
    print(f"score: {DURATION:.2f} s, {nb} bars at {BPM:g} BPM; {len(set(kicks))} kicks, {len(set(snares))} snares; stop {stop0:.2f}-{stop1:.2f}; drop {drop:.3f}; ring {ring:.3f}")


if __name__ == "__main__":
    main()
