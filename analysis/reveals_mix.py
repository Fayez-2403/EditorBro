"""Mix the Claude reveals reel (v2; v1: reveals_mix_v1.py): voice (audio/reveals/voiceover.mp3) + the score stems (reveals_music.py) + the comedy and
transition foley (data/reveals/cues.json `sfx`, synthesized here). The music ducks under the voice (sidechain from the voice's
envelope), levelled to -14 LUFS with true peaks under -1 dBTP. Writes audio/reveals/mix.{wav,mp3}, data/reveals/audio.json
(the engine's beat grid + features) and the beat map (projects/claude-reveals/output/reveals_beatmap.json).

    python analysis/reveals_mix.py
"""
import json, pathlib, subprocess, sys, wave

import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import grokbot_mix as gx          # tone, noise, sweeps, loader, envelope
from pkgfw_mix import limit, lufs_tp
from script_reveals import DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gx.SR
tone, noise, sweep, layer, lp, hp = gx.tone, gx.noise, gx.sweep_noise, gx.layer, gx.lp, gx.hp
rng = np.random.default_rng(1016)
n_ = lambda d: int(d * SR)


def sfx(kind):
    if kind == "slap": return 0.9 * np.tanh(2 * layer(noise(0.09, 0.02, 600, 9000), 0.6 * tone(180, 90, 0.12, 0.04)))
    if kind == "whoosh": return 0.7 * sweep(0.42, 300, 7000)
    if kind == "dive": return 0.8 * layer(sweep(0.6, 200, 9000), 0.4 * tone(300, 1400, 0.5, 0.3))
    if kind == "suck": return 0.7 * sweep(0.5, 6000, 300)
    if kind == "chair":
        t = np.arange(n_(0.55)) / SR
        return 0.35 * lp(rng.standard_normal(len(t)), 700) * np.sin(np.pi * t / t[-1]) * (1 + 0.6 * np.sin(2 * np.pi * 38 * t))
    if kind == "boing":   # the cartoon spring: a sine that wobbles and falls
        t = np.arange(n_(0.75)) / SR
        f = 160 + 260 * np.exp(-t / 0.25) * (1 + 0.35 * np.sin(2 * np.pi * 14 * t))
        return 0.7 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.3)
    if kind == "confetti":
        out = 0.6 * noise(0.06, 0.012, 800, 9000)
        out = np.pad(out, (0, n_(0.8)))
        for i in range(26):
            s = n_(0.05 + rng.uniform(0, 0.7)); b = 0.18 * tone(rng.uniform(2500, 6000), rng.uniform(2500, 6000), 0.025, 0.008)
            out[s:s + len(b)] += b[:len(out) - s]
        return out
    if kind == "thud": return 0.8 * np.tanh(1.8 * layer(tone(110, 45, 0.3, 0.09), 0.5 * noise(0.08, 0.02, 100, 1500)))
    if kind == "pop": return 0.6 * tone(500, 1200, 0.08, 0.025)
    if kind == "tick": return 0.45 * tone(2000, 2000, 0.04, 0.01)
    if kind == "scroll": return 0.4 * layer(*[np.pad(noise(0.012, 0.003, 2500, 8000), (n_(k * 0.03), 0)) for k in range(6)])
    if kind == "fizz":
        t = np.arange(n_(0.9)) / SR
        return 0.35 * hp(rng.standard_normal(len(t)), 3000) * np.sin(np.pi * t / t[-1]) * (0.5 + 0.5 * (rng.random(len(t)) > 0.97))
    if kind == "paper": return 0.6 * layer(sweep(0.5, 600, 4000), 0.3 * noise(0.4, 0.2, 1500, 6000))
    if kind == "scribble":
        out = np.zeros(n_(0.55))
        for k in range(7):
            b = noise(0.06, 0.03, 2500, 7000) * 0.5; s = n_(k * 0.075); out[s:s + len(b)] += b[:len(out) - s]
        return out
    if kind == "peek": return 0.55 * layer(tone(400, 900, 0.1, 0.04), np.pad(tone(900, 1300, 0.08, 0.03), (n_(0.06), 0)))
    if kind == "knock": return 0.9 * np.tanh(2.2 * layer(tone(420, 300, 0.12, 0.03), 0.5 * tone(1100, 900, 0.06, 0.015), 0.4 * noise(0.03, 0.006, 800, 5000)))
    if kind == "flutter":
        out = np.zeros(n_(0.9))
        for k in range(10):
            b = noise(0.05, 0.02, 900, 5000) * 0.35; s = n_(k * 0.08); out[s:s + len(b)] += b[:len(out) - s]
        return out
    if kind == "stamp": return 0.9 * np.tanh(2 * layer(tone(160, 70, 0.25, 0.07), noise(0.08, 0.015, 500, 5000)))
    if kind == "swish": return 0.5 * sweep(0.3, 800, 6000)
    if kind == "flap": return 0.45 * layer(*[np.pad(noise(0.05, 0.015, 400, 3000), (n_(k * 0.11), 0)) for k in range(4)])
    if kind == "zap":
        t = np.arange(n_(0.35)) / SR
        return 0.45 * np.sign(np.sin(2 * np.pi * (1800 - 1500 * t / t[-1]) * t)) * np.exp(-t / 0.1) * (0.6 + 0.4 * rng.random(len(t)))
    if kind == "crackle":
        out = np.zeros(n_(0.6))
        for i in range(14):
            s = n_(rng.uniform(0, 0.55)); b = 0.35 * noise(0.01, 0.002, 2000, 9000); out[s:s + len(b)] += b[:len(out) - s]
        return out
    if kind == "rip":   # paper tearing: rough noise bursts, high-passed, rising in pitch
        t = np.arange(n_(0.45)) / SR
        g = (rng.random(len(t)) > 0.55).astype(float); g = lp(g, 300) * 2
        return 0.9 * hp(rng.standard_normal(len(t)), 1500) * g * (0.6 + 0.4 * t / t[-1]) * np.minimum(1, (t[-1] - t) / 0.05)
    if kind == "beep": return 0.4 * tone(1000, 1000, 0.12, 0.2)
    if kind == "clink": return 0.5 * layer(tone(2600, 2600, 0.2, 0.06), 0.4 * tone(3900, 3900, 0.15, 0.04))
    return gx.sfx(kind)


def main():
    D = ROOT / "data" / "reveals"; A = ROOT / "audio" / "reveals"; O = ROOT / "projects" / "claude-reveals" / "output"
    music = json.loads((D / "music.json").read_text()); cues = json.loads((D / "cues.json").read_text())
    N = int(round(DURATION * SR)); fit = lambda x: np.pad(x, (0, max(0, N - len(x))))[:N]
    vo = fit(gx.load(A / "voiceover.mp3"))
    st = {k: fit(gx.load(A / "stems" / f"{k}.wav")) for k in ("drums", "bass", "chords", "fx")}
    fx = np.zeros(N)
    for t, kind, g in cues["sfx"]: gx.place(fx, t, sfx(kind), g)
    v = gx.envelope(vo); duck = 1 - 0.82 * np.clip(v / (np.percentile(v[v > 1e-4], 90) + 1e-9), 0, 1)   # v2: about -15 dB under speech (v1: -8)
    duck = lfilter([0.002], [1, -0.998], duck) / (0.002 / (1 - 0.998))
    MUSIC = 0.26   # v2 (user, 2026-10-21: the narration must be clear): about -7.6 dB under v1 (0.62); voice ~11.7 dB over the bed
    mix = 1.0 * vo + MUSIC * ((0.6 * st["drums"] + 0.62 * st["bass"] + 0.5 * st["chords"]) * duck + 0.6 * st["fx"]) + 0.30 * fx
    for a_, b_ in music["silences"]: mix[int(a_ * SR):int(b_ * SR)] *= 0.0 + (vo[int(a_ * SR):int(b_ * SR)] != 0)   # the black after the rip
    gain, ceil = 1.0, 0.82
    for _ in range(7):
        out = limit(mix * gain, ceil); L, TP = lufs_tp(out)
        if TP > -1.3: ceil *= 10 ** ((-1.45 - TP) / 20)
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
             "notes": "Claude reveals reel: synthesized 120 BPM score (exact grid), Liam voice, synthesized foley; mixed by analysis/reveals_mix.py"}
    (D / "audio.json").write_text(json.dumps(audio))
    O.mkdir(parents=True, exist_ok=True)
    (O / "reveals_beatmap.json").write_text(json.dumps({
        "bpm": music["bpm"], "beat_s": music["beat"], "bar_s": music["bar"], "duration_s": DURATION,
        "source": "original score synthesized by analysis/reveals_music.py (exact grid, no third-party audio)",
        "downbeats": music["downbeats"], "beats": music["beats"], "kicks": music["kicks"], "snares": music["snares"], "impacts": music["impacts"],
        "chapters": cues["chapters"], "cards": cues["cards"], "events": cues["events"], "foley": cues["sfx"], "silences": music["silences"],
        "voice_lines": [{"i": l["i"], "who": l["who"], "start": l["start"], "end": l["end"], "text": l["text"]} for l in L_]}, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"mix: {DURATION:.1f} s, {L:.1f} LUFS, true peak {TP:.1f} dBTP, {len(cues['sfx'])} foley cues")


if __name__ == "__main__":
    main()
