"""Mix the GitHub package firewall reel: voice (audio/pkgfw/voiceover.mp3) + the score stems (pkgfw_music.py) + synthesized
foley (data/pkgfw/cues.json `sfx`). The music ducks under the voice; the 0.20 s "but" stop is silent; the mix is levelled to
-14 LUFS with true peaks under -1 dBTP (a soft limiter, then the level re-measured). Writes audio/pkgfw/mix.mp3 + mix.wav,
data/pkgfw/audio.json (the engine's beat grid + features) and the beat map (projects/.../output/pkgfw_beatmap.json).

    python analysis/pkgfw_mix.py
"""
import json, pathlib, re, subprocess, sys, wave

import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import grokbot_mix as gx   # foley synthesis (tone, noise, sweeps), loader, ffmpeg path
from script_pkgfw_v1 import DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gx.SR
tone, noise, sweep, layer, lp, hp = gx.tone, gx.noise, gx.sweep_noise, gx.layer, gx.lp, gx.hp
rng = np.random.default_rng(91)


def sfx(kind):
    """This reel's own foley (all synthesized), falling back to the Grok Bot set."""
    n = lambda d: int(d * SR)
    if kind == "fall": return 0.35 * tone(2200, 260, 0.98, 2.0) * np.linspace(0.3, 1, n(0.98))           # the cube's whistle
    if kind == "glitch":
        out = np.zeros(n(0.32))
        for i in range(7):
            s = int(rng.uniform(0, 0.28) * SR); b = layer(tone(rng.uniform(300, 3000), rng.uniform(300, 3000), 0.03, 0.02, "square"), noise(0.02, 0.006, 2000, 9000))
            out[s:s + len(b)] += b[:len(out) - s]
        return 0.5 * out
    if kind == "enter": return 0.8 * layer(noise(0.02, 0.004, 1500, 9000), tone(220, 120, 0.09, 0.03))
    if kind == "shield": return np.tanh(1.5 * layer(0.6 * tone(80, 40, 1.1, 0.4), 0.35 * tone(1200, 1200, 1.2, 0.5), 0.25 * tone(1800, 1810, 1.2, 0.5), 0.4 * noise(0.3, 0.06, 500, 7000)))
    if kind == "scan":
        t = np.arange(n(0.9)) / SR
        return 0.3 * np.sin(2 * np.pi * (300 + 900 * t / t[-1]) * t) * np.sin(np.pi * t / t[-1]) * (1 + 0.5 * np.sin(2 * np.pi * 30 * t))
    if kind == "slide": return 0.6 * layer(sweep(0.22, 800, 7000), 0.4 * tone(400, 900, 0.12, 0.05))
    if kind == "deny": return 0.45 * np.concatenate([tone(150, 150, 0.16, 0.2, "square"), np.zeros(n(0.04)), tone(150, 150, 0.22, 0.2, "square")])
    return gx.sfx(kind)


def lufs_tp(x):
    """Integrated loudness and true peak of the mix as it ships: the mono signal on both channels (ffmpeg ebur128, peak=true;
    measured as stereo, since a dual-mono file reads about 3 dB louder than its mono signal)."""
    m = (np.clip(x, -1, 1) * 32767).astype(np.int16); s = np.stack([m, m], 1).tobytes()
    r = subprocess.run(["ffmpeg", "-nostats", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0", "-af", "ebur128=peak=true", "-f", "null", "-"],
                       input=s, capture_output=True)
    err = r.stderr.decode()
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", err)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS", err)[-1])


def limit(x, ceil=0.82, look=0.003, release=0.08):
    """A look-ahead peak limiter: the gain each sample needs to stay under the ceiling, held over the look-ahead window,
    released smoothly (only the brief hits are turned down; everything else passes untouched)."""
    from scipy.ndimage import minimum_filter1d
    need = np.minimum(1.0, ceil / (np.abs(x) + 1e-12))
    w = int(look * SR); g = minimum_filter1d(need, size=2 * w + 1)
    r = 1 - np.exp(-1 / (release * SR)); out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else cur + (g[i] - cur) * r
        out[i] = cur
    return x * out


def main():
    D = ROOT / "data" / "pkgfw"; A = ROOT / "audio" / "pkgfw"; O = ROOT / "projects" / "github-package-firewall" / "output"
    music = json.loads((D / "music.json").read_text()); cues = json.loads((D / "cues.json").read_text())
    N = int(round(DURATION * SR)); fit = lambda x: np.pad(x, (0, max(0, N - len(x))))[:N]
    vo = fit(gx.load(A / "voiceover.mp3"))
    st = {k: fit(gx.load(A / "stems" / f"{k}.wav")) for k in ("drums", "bass", "chords", "fx")}
    fx = np.zeros(N)
    for t, kind, g in cues["sfx"]: gx.place(fx, t, sfx(kind), g)
    v = gx.envelope(vo); duck = 1 - 0.6 * np.clip(v / (np.percentile(v[v > 1e-4], 90) + 1e-9), 0, 1)   # up to about -8 dB under speech
    duck = lfilter([0.002], [1, -0.998], duck) / (0.002 / (1 - 0.998))
    MUSIC = 0.62
    mix = 1.0 * vo + MUSIC * ((0.55 * st["drums"] + 0.6 * st["bass"] + 0.42 * st["chords"]) * duck + 0.6 * st["fx"]) + 0.45 * fx
    a, b = [int(x * SR) for x in music["silences"][1][:2]]; mix[a:b] = 0          # the "but" stop is true silence
    gain, ceil = 1.0, 0.82
    for _ in range(7):                                                            # -14 LUFS with the true peak under -1 dBTP
        out = limit(mix * gain, ceil); L, TP = lufs_tp(out)
        if TP > -1.3: ceil *= 10 ** ((-1.45 - TP) / 20)                           # inter-sample peaks: lower the ceiling
        gain *= 10 ** ((-14.0 - L) / 20)
        if abs(L + 14) < 0.15 and TP <= -1.2: break
    out = limit(mix * gain, ceil); L, TP = lufs_tp(out)
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(A / "mix.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.stack([pcm, pcm], 1).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(A / "mix.wav"), "-c:a", "libmp3lame", "-b:a", "256k", str(A / "mix.mp3")], check=True)
    hop = SR // 100; frames = N // hop
    def feat(x):
        e = np.sqrt(np.mean(x[:frames * hop].reshape(frames, hop) ** 2, 1)); return np.round(e / (e.max() + 1e-9), 4).tolist()
    L_ = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    audio = {"duration": DURATION, "bpm": music["bpm"], "fps": 100, "beats": music["beats"], "downbeats": music["downbeats"],
             "sections": music["sections"],
             "features": {"rms": feat(out), "low": feat(lp(out, 200)), "mid": feat(hp(lp(out, 3000), 200)), "high": feat(hp(out, 3000)),
                          "vocal": feat(vo), "drums": feat(st["drums"]), "bass": feat(st["bass"]), "other": feat(st["chords"] + fx)},
             "onsets": {"kick": music["kicks"], "snare": music["snares"], "hat": [], "vocal": [w["start"] for l in L_ for w in l["words"]]},
             "notes": "GitHub package firewall reel: synthesized 122 BPM score (exact grid), Liam voice, synthesized foley; mixed by analysis/pkgfw_mix.py"}
    (D / "audio.json").write_text(json.dumps(audio))
    O.mkdir(parents=True, exist_ok=True)
    (O / "pkgfw_beatmap.json").write_text(json.dumps({
        "bpm": music["bpm"], "beat_s": music["beat"], "bar_s": music["bar"], "pickup_s": music["pickup"], "duration_s": DURATION,
        "source": "original score synthesized by analysis/pkgfw_music.py (exact grid, no third-party audio)",
        "downbeats": music["downbeats"], "beats": music["beats"], "kicks": music["kicks"], "snares": music["snares"],
        "chapters": cues["chapters"], "cuts_on_bar_lines": [c[0] for c in cues["chapters"]], "events": cues["events"],
        "foley": cues["sfx"], "silences": music["silences"],
        "voice_lines": [{"i": l["i"], "start": l["start"], "end": l["end"], "text": l["text"]} for l in L_]}, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"mix: {DURATION:.3f} s, {L:.1f} LUFS, true peak {TP:.1f} dBTP, {len(cues['sfx'])} foley cues")


if __name__ == "__main__":
    main()
