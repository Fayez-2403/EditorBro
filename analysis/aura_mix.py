"""Sound for The Editor's Aura: the song window (audio/aura/song.wav, General Levy "Dubplate", for building and syncing only) plus
synthesized foley from the cue sheet (data/aura/cues.json `sfx`: 120 cues, every one on a measured eighth). No samples: every
sound is generated here. Writes
  audio/aura/sfx.wav        the foley stem alone (the POST version's audio: on Instagram the song comes from its library)
  audio/aura/mix.wav/.mp3   song + foley at -14 LUFS, true peak under -1 dBTP (the build/preview copy, and the animatic)
  projects/editors-aura/output/aura_beatmap.json   the beat map: grid, bars, phrases, anchors, every event and foley cue
data/aura/audio.json (the song's measured features, which the renders react to) is left as aura_audio.py made it.
    python analysis/aura_mix.py
"""
import json, pathlib, re, subprocess, sys, wave
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import grokbot_mix as gx

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
gx.SR = SR                      # the helpers read their module's SR at call time
gx.rng = np.random.default_rng(5505)
tone, noise, sweep, layer, lp, hp = gx.tone, gx.noise, gx.sweep_noise, gx.layer, gx.lp, gx.hp
rng = np.random.default_rng(955)
n_ = lambda d: int(d * SR)


def sfx(kind, i=0):
    r = np.random.default_rng(1000 + i)
    if kind == "key":       # a keyboard key: a bright click, varied per keystroke
        f = r.uniform(3200, 5200); return 0.5 * layer(noise(0.018, 0.004, 2200, 9500), 0.25 * tone(f, f * 0.9, 0.02, 0.005))
    if kind == "enter": return 0.8 * np.tanh(1.6 * layer(noise(0.03, 0.006, 1200, 8000), 0.7 * tone(190, 85, 0.14, 0.05)))
    if kind == "tick": return 0.45 * layer(tone(2100, 2100, 0.04, 0.009), 0.2 * tone(4200, 4200, 0.02, 0.004))
    if kind == "click": return 0.6 * layer(noise(0.012, 0.003, 1500, 9000), 0.4 * tone(1400, 900, 0.03, 0.008))
    if kind == "whoosh": return 0.7 * sweep(0.42, 300, 7000)
    if kind == "crack":     # a neck crack: a dry, sharp pop with a little low body
        return 0.7 * layer(noise(0.012, 0.0025, 2500, 11000), 0.5 * tone(320, 140, 0.05, 0.012), np.pad(0.35 * noise(0.008, 0.002, 3000, 10000), (n_(0.018), 0)))
    if kind == "knuckle":   # knuckles: a quick ripple of small pops
        out = np.zeros(n_(0.12))
        for k in range(4):
            q = 0.45 * layer(noise(0.006, 0.0015, 2500, 10000), 0.3 * tone(r.uniform(500, 900), 300, 0.02, 0.006)); s0 = n_(k * 0.026 + r.uniform(0, 0.006)); out[s0:s0 + len(q)] += q[:len(out) - s0]
        return out
    if kind == "boing":     # a springy jump: a sine that wobbles and rises
        t = np.arange(n_(0.45)) / SR; f = 220 + 380 * (1 - np.exp(-t / 0.12)) * (1 + 0.3 * np.sin(2 * np.pi * 16 * t))
        return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.22)
    if kind == "riser":     # into the Dubplate slam: rising filtered noise + a rising tone, cut dead at the slam
        t = np.arange(n_(0.95)) / SR; x = sweep(0.95, 300, 9000) * (t / t[-1]) ** 1.5
        return 0.8 * layer(x, 0.25 * tone(220, 1760, 0.95, 2.0) * (t / t[-1]) ** 2)
    if kind == "dive": return 0.8 * layer(sweep(0.7, 200, 9000), 0.35 * tone(260, 1600, 0.6, 0.35))
    if kind == "sub":       # the opening hit: a sub drop
        return 0.9 * np.tanh(1.4 * layer(tone(62, 30, 1.4, 0.55), 0.3 * noise(0.12, 0.04, 80, 900)))
    if kind == "drop": return 0.8 * np.tanh(1.8 * layer(tone(140, 55, 0.25, 0.07), 0.5 * noise(0.04, 0.01, 900, 6000)))
    if kind == "flash":     # an export flash: a bright metallic shing
        return 0.55 * layer(noise(0.25, 0.05, 3000, 12000), 0.4 * tone(5200, 4800, 0.2, 0.06), 0.3 * tone(3100, 3000, 0.25, 0.08))
    if kind == "ping": return 0.5 * layer(tone(1760, 1760, 0.45, 0.14), 0.45 * tone(2640, 2640, 0.35, 0.09))
    if kind == "scrub":     # tape scrub: modulated noise with pitch sweeps
        t = np.arange(n_(0.6)) / SR; x = hp(lp(r.standard_normal(len(t)), 3500), 300)
        return 0.45 * x * (0.5 + 0.5 * np.sin(2 * np.pi * (9 + 14 * t) * t)) * np.sin(np.pi * t / t[-1])
    if kind == "clank":     # metal on metal: inharmonic partials
        return 0.6 * np.tanh(1.5 * layer(*[a * tone(f, f * 0.98, 0.35, d) for f, a, d in [(1320, .5, .09), (2110, .4, .06), (3420, .3, .04), (520, .5, .05)]], 0.4 * noise(0.03, 0.006, 1500, 9000)))
    if kind == "gun":       # a wheel gun: a fast rattle with a motor whine
        t = np.arange(n_(0.42)) / SR; out = 0.25 * np.sign(np.sin(2 * np.pi * (380 + 180 * t / t[-1]) * t)) * np.exp(-t / 0.3)
        for k in range(int(0.42 * 70)):
            s = n_(k / 70); b = 0.5 * noise(0.01, 0.0025, 1500, 9000); out[s:s + len(b)] += b[:len(out) - s]
        return 0.8 * out
    if kind == "rumble":    # the volcano: low swelling noise, crackle on top
        t = np.arange(n_(2.4)) / SR; base = lp(lp(r.standard_normal(len(t)), 140), 140) * 6 * np.minimum(1, t / 0.15) * np.exp(-t / 1.2)
        cr = np.zeros(len(t))
        for k in range(40):
            s = int(r.uniform(0, 2.2) * SR); b = 0.25 * noise(0.012, 0.003, 1500, 9000); cr[s:s + len(b)] += b[:len(cr) - s]
        return 0.9 * np.tanh(1.5 * (base + cr))
    if kind == "screech":   # tyres: a band of noise, frequency-modulated
        t = np.arange(n_(0.85)) / SR; x = r.standard_normal(len(t)); x = hp(lp(x, 4200), 1800)
        return 0.5 * x * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * np.minimum(1, t / t[-1]))
    if kind == "launch":    # the engine: a rising saw with harmonics, driven
        t = np.arange(n_(1.8)) / SR; f = 70 + 260 * (1 - np.exp(-t / 0.6)); ph = 2 * np.pi * np.cumsum(f) / SR
        saw = sum(np.sin(k * ph) / k for k in range(1, 9))
        return layer(0.7 * np.tanh(2.2 * saw * np.minimum(1, t / 0.04) * np.exp(-t / 1.6)), 0.2 * sweep(1.0, 400, 6000))
    raise ValueError(kind)


def load_stereo(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "pipe:1"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def lufs_tp(x):
    s = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
    r = subprocess.run(["ffmpeg", "-nostats", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0", "-af", "ebur128=peak=true", "-f", "null", "-"], input=s, capture_output=True)
    e = r.stderr.decode(); return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", e)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", e)[-1])


def limit(x, ceil=0.85, look=0.003, release=0.08):
    from scipy.ndimage import minimum_filter1d
    need = np.minimum(1.0, ceil / (np.abs(x).max(1) + 1e-12)); w = int(look * SR); g = minimum_filter1d(need, size=2 * w + 1)
    r = 1 - np.exp(-1 / (release * SR)); out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else cur + (g[i] - cur) * r; out[i] = cur
    return x * out[:, None]


def write(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def main():
    D, Au, O = ROOT / "data/aura", ROOT / "audio/aura", ROOT / "projects/editors-aura/output"
    cues = json.loads((D / "cues.json").read_text()); song_map = json.loads((D / "song_map.json").read_text())
    song = load_stereo(Au / "song.wav"); N = int(round(cues["duration"] * SR)); song = np.pad(song, ((0, max(0, N - len(song))), (0, 0)))[:N]
    fx = np.zeros(N)
    TRIM = {"sub": 0.35, "rumble": 0.4, "ping": 0.45, "flash": 0.6, "launch": 0.25}   # measured against the song: none may bury it
    run = song_map["anchors"]["chopper_run"]   # the fast vocal stays in front: foley a further -3 dB there
    for i, (t, kind, g) in enumerate(cues["sfx"]): gx.place(fx, t, sfx(kind, i), g * TRIM.get(kind, 1.0) * (0.7 if run[0] <= t < run[1] else 1.0))
    FX = 6.0                                    # keys ~8 dB under the song, ticks ~5 dB under, the big hits on top (measured)
    mix = song + FX * fx[:, None]
    # the cut to black: the song's own bass dropout; everything fades over 60 ms after fin.black
    b = int(cues["events"]["fin.black"] * SR); fade = np.ones(N); fade[b:] = np.maximum(0, 1 - (np.arange(N - b) / (0.06 * SR))); mix *= fade[:, None]
    gain, ceil = 1.0, 0.85
    for _ in range(8):
        out = limit(mix * gain, ceil); L, TP = lufs_tp(out)
        if TP > -1.2: ceil *= 10 ** ((-1.4 - TP) / 20)
        gain *= 10 ** ((-14.0 - L) / 20)
        if abs(L + 14) < 0.15 and TP <= -1.1: break
    out = limit(mix * gain, ceil); L, TP = lufs_tp(out)
    write(Au / "mix.wav", out)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(Au / "mix.wav"), "-c:a", "libmp3lame", "-b:a", "256k", str(Au / "mix.mp3")], check=True)
    stem = limit(np.stack([FX * fx * gain * fade] * 2, 1), ceil); Ls, TPs = lufs_tp(stem)
    write(Au / "sfx.wav", stem)
    O.mkdir(parents=True, exist_ok=True)
    (O / "aura_beatmap.json").write_text(json.dumps({
        "song": "0-10.105 s: Dhurandhar title track (Saregama, youtu.be/7IBDa53IsvI, from 11.90 s); then General Levy - Dubplate (Little Lion Sound upload) from song 100.947 s. Build/sync copies only.",
        "window_s": song_map["window"], "bpm": song_map["bpm"], "eighth_s": song_map["eighth"], "beat_s": song_map["beat"], "bar_s": song_map["bar"],
        "fit_95_ms": song_map["fit_95ms"], "bar_phase": song_map["bar_phase"], "bars": song_map["bars"], "phrases": song_map["phrases"], "anchors": song_map["anchors"],
        "intro": json.loads((D / "intro.json").read_text()),
        "segments": cues["segments"], "events": cues["events"], "montage": cues["montage"], "flashes": cues["flashes"], "foley": cues["sfx"]}, indent=1), encoding="utf-8")
    print(f"mix: {cues['duration']:.1f} s, {L:.1f} LUFS, true peak {TP:.1f} dBTP; foley stem {Ls:.1f} LUFS; {len(cues['sfx'])} cues")


if __name__ == "__main__":
    main()
