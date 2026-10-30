"""Mix the DOTS short (stereo): narrator + mascot voices (analysis/dots_vo.py), the original score stems
(analysis/dots_music.py) and synthesized foley (data/dots/cues.json `sfx`).

The bed is CARVED under the voices (hyperframes-audio): while anyone speaks, the score's speech band (250 Hz - 2.5 kHz)
dips up to ~9 dB and the rest ~3 dB, both following the voices' own envelope with a slow release, so the music keeps its
low end and sparkle. 53.00-54.00 s is true silence (the launch-disaster freeze). Levelled to -14 LUFS.
Writes audio/dots/mix.mp3 and data/dots/audio.json (the engine's beat grid + features).

    python analysis/dots_mix.py
"""
import glob, json, os, pathlib, re, shutil, subprocess, wave

import numpy as np
from scipy.signal import lfilter

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 44100
rng = np.random.default_rng(96)
SIL = (53.0, 54.0)


def load(path, ch=2):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "pipe:1"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).copy()
    return x.reshape(-1, ch).T if ch == 2 else x


def lp(x, fc): a = np.exp(-2 * np.pi * fc / SR); return lfilter([1 - a], [1, -a], x, axis=-1)
def hp(x, fc): return x - lp(x, fc)


def tone(f0, f1, dur, decay, kind="sine"):
    n = int(dur * SR); t = np.arange(n) / SR; f = f0 * (f1 / f0) ** (t / dur); ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(ph) if kind == "sine" else (np.sign(np.sin(ph)) * 0.5 if kind == "square" else 2 * ((ph / (2 * np.pi)) % 1) - 1)
    return w * np.exp(-t / decay) * np.minimum(1, t / 0.002)


def noise(dur, decay, lo=200, hi=8000):
    n = int(dur * SR); t = np.arange(n) / SR
    return hp(lp(rng.standard_normal(n), hi), lo) * np.exp(-t / decay) * np.minimum(1, t / 0.003)


def sweep(dur, f0, f1, q=1.0):
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros(n); x = rng.standard_normal(n); B = 512
    for s in range(0, n, B):
        fc = f0 * (f1 / f0) ** (s / n); seg = x[s:s + B]; out[s:s + B] = hp(lp(seg, fc * (1 + q)), fc / (1 + q))[:len(seg)]
    return out * np.sin(np.pi * t / dur)


def layer(*xs):
    n = max(len(x) for x in xs); return sum(np.pad(x, (0, n - len(x))) for x in xs)


def seq(parts, gap):
    out = []
    for p in parts: out += [p, np.zeros(int(gap * SR))]
    return np.concatenate(out)


def sfx(kind):
    """Synthesized foley (no samples)."""
    if kind == "paper": return 0.6 * layer(sweep(0.35, 1500, 6000, 1.5), 0.5 * noise(0.25, 0.05, 2000, 9000))
    if kind == "pop": return 0.6 * tone(420, 1100, 0.09, 0.03)
    if kind == "ding": return 0.45 * layer(tone(1568, 1568, 0.5, 0.18), 0.4 * tone(2352, 2352, 0.4, 0.12))
    if kind == "roar":
        n = int(1.4 * SR); t = np.arange(n) / SR; f = 90 + 40 * np.sin(2 * np.pi * 6 * t) * np.exp(-t / 0.8)
        g = np.tanh(3 * (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.6 * np.sin(4 * np.pi * np.cumsum(f * 1.01) / SR)))
        return 0.8 * (g * (0.6 + 0.4 * rng.standard_normal(n) * 0.3) + 0.5 * lp(rng.standard_normal(n), 900)) * np.minimum(1, t / 0.08) * np.exp(-t / 0.7)
    if kind == "stamp": return 0.8 * np.tanh(2 * layer(tone(160, 60, 0.25, 0.07), noise(0.08, 0.015, 500, 5000)))
    if kind == "boing":
        n = int(0.45 * SR); t = np.arange(n) / SR; f = 220 * (1 + 0.5 * np.exp(-t / 0.1)) * (1 + 0.08 * np.sin(2 * np.pi * 14 * t))
        return 0.5 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    if kind == "whoosh": return 0.7 * sweep(0.45, 300, 5000)
    if kind == "chomp": return 0.9 * np.tanh(2.5 * layer(tone(120, 40, 0.3, 0.08), noise(0.06, 0.012, 300, 4000), np.pad(noise(0.05, 0.01, 800, 6000), (int(0.07 * SR), 0))))
    if kind == "thud": return 0.8 * layer(tone(110, 50, 0.25, 0.07), 0.3 * noise(0.06, 0.02, 200, 1500))   # felt landing: soft, low
    if kind == "sparkle": return 0.3 * layer(*[np.pad(tone(f, f, 0.5, 0.15), (int(i * 0.04 * SR), 0)) for i, f in enumerate([2093, 2637, 3136, 3951, 4186])])
    if kind == "shimmer": return 0.3 * layer(*[np.pad(tone(f, f, 0.9, 0.35), (int(i * 0.06 * SR), 0)) for i, f in enumerate([1047, 1319, 1568, 2093])])
    if kind == "zip": return 0.5 * tone(500, 2600, 0.18, 0.12, "saw") * 0.5
    if kind == "tick": return 0.5 * tone(2200, 2200, 0.04, 0.01)
    if kind == "glint": return 0.35 * layer(tone(3520, 3520, 0.5, 0.15), np.pad(tone(5274, 5274, 0.4, 0.1), (int(0.05 * SR), 0)))
    if kind == "door": return 0.6 * layer(tone(140, 90, 0.3, 0.1), 0.4 * sweep(0.5, 400, 1200), np.pad(tone(90, 60, 0.15, 0.05), (int(0.45 * SR), 0)))
    if kind == "boot": return 0.4 * layer(tone(220, 880, 0.35, 0.3), np.pad(tone(1320, 1320, 0.4, 0.2), (int(0.3 * SR), 0)))
    if kind == "type": return 0.4 * seq([noise(0.025, 0.006, 2000, 9000) for _ in range(9)], 0.06)
    if kind == "tiptoe": return 0.5 * seq([layer(tone(700, 500, 0.05, 0.015), 0.3 * noise(0.03, 0.008, 2000, 6000)) for _ in range(5)], 0.14)
    if kind == "scan": return 0.25 * tone(800, 1600, 0.8, 0.6, "square") * (1 + 0.5 * np.sin(2 * np.pi * 18 * np.arange(int(0.8 * SR)) / SR))
    if kind == "scuttle": return 0.4 * seq([noise(0.012, 0.004, 3000, 9000) for _ in range(28)], 0.035)
    if kind == "splat": return 1.0 * np.tanh(2.5 * layer(tone(180, 40, 0.35, 0.09), noise(0.25, 0.05, 150, 3000), 0.5 * sweep(0.3, 2000, 300)))
    if kind == "card": return 0.5 * layer(sweep(0.18, 2500, 7000, 1.2), np.pad(tone(900, 900, 0.05, 0.015), (int(0.15 * SR), 0)))
    if kind == "melt":   # descending slide whistle
        n = int(1.4 * SR); t = np.arange(n) / SR; f = 1400 * (0.3 ** (t / 1.4)) * (1 + 0.02 * np.sin(2 * np.pi * 6 * t))
        return 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.05) * np.minimum(1, (1.4 - t) / 0.2)
    if kind == "slide":  # rising slide whistle (the save)
        n = int(0.6 * SR); t = np.arange(n) / SR; f = 500 * (4 ** (t / 0.6))
        return 0.35 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.03) * np.minimum(1, (0.6 - t) / 0.1)
    if kind == "buzzer": return 0.4 * tone(140, 130, 0.45, 0.4, "square")
    if kind == "scratch": return 0.5 * sweep(0.3, 3000, 600, 0.5)
    if kind == "beep": return 0.4 * seq([tone(1000, 1000, 0.08, 0.06, "square")] * 3, 0.17)
    if kind == "crash": return 1.0 * np.tanh(2 * layer(tone(120, 30, 1.0, 0.3), noise(0.8, 0.2, 200, 9000), 0.5 * seq([noise(0.05, 0.02, 2000, 8000)] * 6, 0.07)))
    if kind == "alarm": return 0.4 * seq([tone(880, 880, 0.18, 0.15, "square"), tone(660, 660, 0.18, 0.15, "square")] * 3, 0.02)
    if kind == "rocket": return 0.8 * layer(lp(rng.standard_normal(int(1.0 * SR)), 1200) * np.minimum(1, np.arange(int(1.0 * SR)) / SR / 0.2) * np.exp(-np.arange(int(1.0 * SR)) / SR / 0.6), 0.5 * sweep(1.0, 200, 3000))
    if kind == "dock": return 0.6 * layer(tone(300, 160, 0.12, 0.05), 0.5 * np.pad(tone(1200, 1200, 0.15, 0.05), (int(0.04 * SR), 0)))
    if kind == "swarm": return 0.4 * seq([tone(1200 + 80 * i, 1600 + 80 * i, 0.05, 0.02) for i in range(12)], 0.03)
    if kind == "page": return 0.5 * sweep(0.3, 1000, 5000, 1.0)
    if kind == "lock": return 0.6 * layer(tone(1800, 1800, 0.05, 0.015), np.pad(tone(900, 700, 0.08, 0.03), (int(0.06 * SR), 0)))
    if kind == "nope": return 0.35 * seq([tone(330, 300, 0.12, 0.09, "square")] * 2, 0.04)
    if kind == "chirp": return 0.3 * seq([tone(3000, 4200, 0.07, 0.05), tone(3400, 4600, 0.06, 0.04)], 0.05)
    if kind == "hum": return 0.25 * tone(60, 60, 1.6, 0.9) * (1 + 0.3 * np.sin(2 * np.pi * 4 * np.arange(int(1.6 * SR)) / SR))
    if kind == "approve": return 0.6 * layer(tone(660, 660, 0.5, 0.25), np.pad(tone(990, 990, 0.6, 0.3), (int(0.08 * SR), 0)), np.pad(tone(1320, 1320, 0.7, 0.3), (int(0.16 * SR), 0)))
    if kind == "confetti": return 0.35 * seq([noise(0.02, 0.006, 2500, 9000) * (0.5 + rng.random()) for _ in range(20)], 0.03)
    if kind == "fold": return 0.6 * layer(sweep(0.3, 800, 4000), np.pad(tone(400, 200, 0.12, 0.04), (int(0.2 * SR), 0)))
    raise ValueError(kind)


def envelope(x, win=0.05):
    n = int(win * SR); return np.sqrt(np.convolve(x ** 2, np.ones(n) / n, "same"))


def place(buf, t, x, g, pan=0.0):
    i = int(round(t * SR))
    if i >= buf.shape[1]: return
    m = min(len(x), buf.shape[1] - i); L, R = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    buf[0, i:i + m] += g * L * x[:m]; buf[1, i:i + m] += g * R * x[:m]


def lufs(path):
    r = subprocess.run(["ffmpeg", "-nostats", "-i", str(path), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)[-1])


def follower(env, att=0.02, rel=0.45):
    """Envelope follower with a fast attack and a slow release (the bed comes back gently between phrases)."""
    out = np.zeros_like(env); a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); y = 0.0
    step = 64
    for i in range(0, len(env), step):
        v = env[i]; k = a if v > y else r; y = k ** step * y + (1 - k ** step) * v; out[i:i + step] = y
    return out


def main():
    D = ROOT / "data" / "dots"; A = ROOT / "audio" / "dots"
    music = json.loads((D / "music.json").read_text()); cues = json.loads((D / "cues.json").read_text(encoding="utf-8"))
    dur = music["duration"]; N = int(round(dur * SR))
    fit2 = lambda x: np.pad(x, ((0, 0), (0, max(0, N - x.shape[1]))))[:, :N]
    fit1 = lambda x: np.pad(x, (0, max(0, N - len(x))))[:N]
    nar = fit1(load(A / "vo_narrator.wav", 1)); mas = fit1(load(A / "vo_mascots.wav", 1))
    st = {k: fit2(load(A / "stems" / f"{k}.wav")) for k in ("drums", "bass", "music", "lead", "fx")}
    fx = np.zeros((2, N)); r2 = np.random.default_rng(5)
    for t, kind, g in cues["sfx"]: place(fx, t, sfx(kind), g, pan=float(r2.uniform(-0.35, 0.35)))
    voice = nar + 1.2 * mas   # mascots a little hotter: short whispered words ("plan ready", "yaar") stay clear over the bed
    # carve the bed under the voices: band dip (250 Hz - 2.5 kHz) + a gentle broadband duck, both on a slow-release follower
    v = envelope(voice); v = v / (np.percentile(v[v > 1e-4], 90) + 1e-9)
    ctl = np.clip(follower(np.clip(v, 0, 1.2)), 0, 1)
    band_g = 10 ** (-9 * ctl / 20); broad_g = 10 ** (-3 * ctl / 20)
    def carve(x):
        band = hp(lp(x, 2500), 250); return (x - band) * broad_g + band * band_g * broad_g
    bed = carve(0.62 * st["drums"] + 0.7 * st["bass"] + 0.55 * st["music"] + 0.5 * st["lead"])
    MUSIC = 0.48   # user 2026-10-20: bg music a little lower (was 0.62, about -2.2 dB); the voice sits clearly on top
    mix = MUSIC * (bed + 0.6 * st["fx"]) + np.stack([voice, voice]) + 0.42 * fx
    mix[:, int(SIL[0] * SR):int(SIL[1] * SR)] = 0                    # the freeze is true silence
    mix = np.tanh(1.1 * mix) / np.tanh(1.1)
    tmp = ROOT / "out" / "mix_dots.wav"; tmp.parent.mkdir(exist_ok=True)
    def write(x, p):
        with wave.open(str(p), "wb") as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1).T * 32767).astype(np.int16).tobytes())
    write(mix * 0.5, tmp); gain = 10 ** ((-14.0 - lufs(tmp)) / 20) * 0.5
    if np.abs(mix * gain).max() > 0.97: mix = np.tanh(mix * gain / 0.97 * 1.2) / np.tanh(1.2) * 0.97; gain = 1.0
    write(mix * gain, tmp)
    if abs(lufs(tmp) + 14) > 0.3: g2 = 10 ** ((-14.0 - lufs(tmp)) / 20); mix = np.clip(mix * gain * g2, -0.98, 0.98); gain = 1.0; write(mix, tmp)
    level = lufs(tmp)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-c:a", "libmp3lame", "-b:a", "256k", str(A / "mix.mp3")], check=True)
    total = (mix * gain).mean(0); hop = SR // 100; frames = N // hop
    def feat(x):
        e = np.sqrt(np.mean(x[:frames * hop].reshape(frames, hop) ** 2, 1)); return np.round(e / (e.max() + 1e-9), 4).tolist()
    ly = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    audio = {"duration": dur, "bpm": music["bpm"], "fps": 100, "beats": music["beats"], "downbeats": music["downbeats"], "sections": music["sections"],
             "features": {"rms": feat(total), "low": feat(lp(total, 200)), "mid": feat(hp(lp(total, 3000), 200)), "high": feat(hp(total, 3000)),
                          "vocal": feat(voice), "drums": feat(st["drums"].mean(0)), "bass": feat(st["bass"].mean(0)), "other": feat((st["music"] + fx).mean(0))},
             "onsets": {"kick": music["kicks"], "snare": music["snares"], "hat": [], "vocal": [w["start"] for l in ly for w in l["words"]]},
             "notes": "DOTS short: original 120 BPM heist score (exact grid), six ElevenLabs voices, synthesized foley; carved mix by analysis/dots_mix.py"}
    (D / "audio.json").write_text(json.dumps(audio))
    print(f"mix: {dur:.3f} s, {level:.1f} LUFS, peak {np.abs(mix * gain).max():.2f}, {len(cues['sfx'])} foley cues; bed carve up to -9 dB (band) / -3 dB (broad)")


if __name__ == "__main__":
    main()
