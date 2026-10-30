"""Mix the Grok Bot reel: voice (audio/grokbot/voiceover.mp3) + score stems (analysis/grokbot_music.py) + synthesized foley
(data/grokbot/cues.json `sfx`). Music ducks under the voice; the 42.00-42.25 s silence stays silent; the mix is levelled to
-14 LUFS. Writes out/mix_grokbot.wav, audio/grokbot/mix.mp3 and data/grokbot/audio.json (the engine's beat grid + features).

    python analysis/grokbot_mix.py
"""
import glob, json, os, pathlib, re, shutil, subprocess, wave

import numpy as np
from scipy.signal import lfilter

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 44100
rng = np.random.default_rng(77)


def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x)


def hp(x, fc): return x - lp(x, fc)


def tone(f0, f1, dur, decay, kind="sine"):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(ph) if kind == "sine" else np.sign(np.sin(ph)) * 0.5
    return w * np.exp(-t / decay) * np.minimum(1, t / 0.002)


def noise(dur, decay, lo=200, hi=8000):
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(lp(rng.standard_normal(n), hi), lo) * np.exp(-t / decay) * np.minimum(1, t / 0.003)


def sweep_noise(dur, f0, f1):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n); B = 1024
    x = rng.standard_normal(n)
    for s in range(0, n, B):
        fc = f0 * (f1 / f0) ** (s / n); out[s:s + B] = lp(x[s:s + B], fc)[:len(out[s:s + B])]
    return out * np.sin(np.pi * t / dur)


def layer(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)


def sfx(kind):
    """Synthesized foley: every sound is generated here, no samples."""
    if kind == "smash": return 0.9 * np.tanh(2 * layer(tone(140, 40, 0.6, 0.18), noise(0.4, 0.06, 300, 6000)))
    if kind == "drop": return layer(0.6 * tone(900, 300, 0.12, 0.04), 0.5 * tone(120, 60, 0.18, 0.06))
    if kind == "pop": return 0.6 * tone(500, 1100, 0.09, 0.03)
    if kind == "ping": return 0.5 * layer(tone(1760, 1760, 0.35, 0.12), 0.5 * tone(2640, 2640, 0.3, 0.08))
    if kind == "type": return np.concatenate([np.pad(noise(0.03, 0.006, 2000, 9000), (0, int(0.07 * SR))) for _ in range(10)]) * 0.5
    if kind == "whoosh": return 0.7 * sweep_noise(0.45, 400, 6000)
    if kind == "boom": return 0.8 * np.tanh(1.5 * tone(90, 35, 1.0, 0.35))
    if kind == "split": return 0.5 * layer(tone(600, 1200, 0.15, 0.06), tone(400, 900, 0.15, 0.06))
    if kind == "steps":
        out = np.zeros(int(0.9 * SR))
        for i in range(6): s = int(i * 0.14 * SR); f = layer(tone(180, 120, 0.06, 0.02), 0.3 * noise(0.04, 0.01, 1500, 6000)); out[s:s + len(f)] += f
        return 0.6 * out
    if kind == "servo":
        n = int(0.35 * SR); t = np.arange(n) / SR
        return 0.25 * np.sign(np.sin(2 * np.pi * (300 + 200 * np.sin(2 * np.pi * 9 * t)) * t)) * np.sin(np.pi * t / t[-1])
    if kind == "wobble": return 0.4 * tone(700, 300, 0.3, 0.2) * (1 + 0.6 * np.sin(2 * np.pi * 14 * np.arange(int(0.3 * SR)) / SR))
    if kind == "catch": return 0.7 * layer(tone(300, 160, 0.12, 0.05), 0.4 * noise(0.05, 0.01, 800, 5000))
    if kind == "chair": return 0.35 * lp(rng.standard_normal(int(0.5 * SR)), 900) * np.sin(np.pi * np.arange(int(0.5 * SR)) / int(0.5 * SR))
    if kind == "stack": return layer(*[np.pad(tone(400 + 150 * i, 400 + 150 * i, 0.08, 0.03), (int(i * 0.06 * SR), 0)) for i in range(4)]) * 0.5
    if kind == "shimmer": return 0.35 * layer(*[np.pad(tone(f, f, 0.6, 0.25), (int(i * 0.05 * SR), 0)) for i, f in enumerate([1568, 1976, 2349, 3136])])
    if kind == "save": return 0.5 * layer(tone(880, 880, 0.2, 0.08), np.pad(tone(1320, 1320, 0.3, 0.12), (int(0.09 * SR), 0)))
    if kind == "tick": return 0.5 * tone(2000, 2000, 0.04, 0.01)
    if kind == "hum": return 0.4 * tone(55, 55, 1.6, 0.9) * (1 + 0.3 * np.sin(2 * np.pi * 3 * np.arange(int(1.6 * SR)) / SR))
    if kind == "alert": return 0.5 * np.concatenate([tone(880, 880, 0.12, 0.08, "square"), tone(660, 660, 0.16, 0.1, "square")])
    if kind == "freeze": return 0.4 * sweep_noise(0.3, 6000, 300)
    if kind == "approve": return 0.6 * layer(tone(660, 660, 0.5, 0.25), np.pad(tone(990, 990, 0.6, 0.3), (int(0.08 * SR), 0)))
    if kind == "stamp": return 0.8 * np.tanh(2 * layer(tone(160, 70, 0.25, 0.07), noise(0.08, 0.015, 500, 5000)))
    if kind == "slam": return 1.0 * np.tanh(2.5 * layer(tone(110, 30, 1.2, 0.4), noise(0.5, 0.08, 200, 7000), 0.4 * tone(2400, 2400, 0.8, 0.4)))
    raise ValueError(kind)


def envelope(x, win=0.05):
    n = int(win * SR); e = np.sqrt(np.convolve(x ** 2, np.ones(n) / n, "same")); return e


def place(buf, t, x, g):
    i = int(round(t * SR))
    if i < len(buf): m = min(len(x), len(buf) - i); buf[i:i + m] += g * x[:m]


def lufs(path):
    r = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


def main():
    D = ROOT / "data" / "grokbot"; music = json.loads((D / "music.json").read_text()); cues = json.loads((D / "cues.json").read_text())
    dur = music["duration"]; N = int(round(dur * SR))
    fit = lambda x: np.pad(x, (0, max(0, N - len(x))))[:N]
    vo = fit(load(ROOT / "audio" / "grokbot" / "voiceover.mp3"))
    st = {k: fit(load(ROOT / "audio" / "grokbot" / "stems" / f"{k}.wav")) for k in ("drums", "bass", "chords", "fx")}
    fx = np.zeros(N)
    for t, kind, g in cues["sfx"]: place(fx, t, sfx(kind), g)
    # frame 0: keep the hit's sub thump but clear the speech band for "Bro" (it was masked: heard as "I built")
    k0 = int(0.6 * SR); fade = np.linspace(0, 1, int(0.15 * SR))
    for x in (st["fx"], fx):
        low = lp(lp(x[:k0], 150), 150); x[:k0] = low
        x[k0:k0 + len(fade)] *= fade
    v = envelope(vo); duck = 1 - 0.65 * np.clip(v / (np.percentile(v[v > 1e-4], 90) + 1e-9), 0, 1)   # up to about -9 dB under speech
    duck = lfilter([0.002], [1, -0.998], duck) / (0.002 / (1 - 0.998))
    MUSIC = 0.6   # user 2026-10-19: music a little lower (about -4.4 dB) so the narration sits clearly on top
    music_mix = MUSIC * ((0.55 * st["drums"] + 0.6 * st["bass"] + 0.42 * st["chords"]) * duck + 0.55 * st["fx"])
    mix = 1.0 * vo + music_mix + 0.45 * fx
    mix[int(42.0 * SR):int(42.25 * SR)] = 0                      # the pattern interrupt is true silence
    mix = np.tanh(1.1 * mix) / np.tanh(1.1)                      # gentle soft clip
    tmp = ROOT / "out" / "mix_grokbot.wav"; tmp.parent.mkdir(exist_ok=True)
    def write(x, p):
        with wave.open(str(p), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            s = (np.clip(x, -1, 1) * 32767).astype(np.int16); w.writeframes(np.stack([s, s], 1).tobytes())
    write(mix * 0.5, tmp); gain = 10 ** ((-14.0 - lufs(tmp)) / 20) * 0.5
    peak = np.abs(mix * gain).max()
    if peak > 0.97: mix = np.tanh(mix * gain / 0.97 * 1.2) / np.tanh(1.2) * 0.97; gain = 1.0
    write(mix * gain, tmp); level = lufs(tmp)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-c:a", "libmp3lame", "-b:a", "256k", str(ROOT / "audio" / "grokbot" / "mix.mp3")], check=True)
    # engine features at 100 fps
    hop = SR // 100; frames = N // hop
    def feat(x):
        e = np.sqrt(np.mean(x[:frames * hop].reshape(frames, hop) ** 2, 1)); return np.round(e / (e.max() + 1e-9), 4).tolist()
    total = mix * gain
    audio = {"duration": dur, "bpm": music["bpm"], "fps": 100, "beats": music["beats"], "downbeats": music["downbeats"],
             "sections": music["sections"],
             "features": {"rms": feat(total), "low": feat(lp(total, 200)), "mid": feat(hp(lp(total, 3000), 200)), "high": feat(hp(total, 3000)),
                          "vocal": feat(vo), "drums": feat(st["drums"]), "bass": feat(st["bass"]), "other": feat(st["chords"] + fx)},
             "onsets": {"kick": music["kicks"], "snare": [b for b in music["beats"] if round(b / music["beat"]) % 4 in (1, 3)],
                        "hat": [], "vocal": [w["start"] for l in json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"] for w in l["words"]]},
             "notes": "Grok Bot reel: synthesized 120 BPM score (exact grid), Liam voice, synthesized foley; mixed by analysis/grokbot_mix.py"}
    (D / "audio.json").write_text(json.dumps(audio))
    print(f"mix: {dur:.3f} s, {level:.1f} LUFS, peak {np.abs(mix * gain).max():.2f}, {len(cues['sfx'])} foley cues")


if __name__ == "__main__":
    main()
