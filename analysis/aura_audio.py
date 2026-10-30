"""The Editor's Aura: the song is the timeline. Cuts the 90 s window of General Levy "Dubplate" (the Little Lion Sound upload,
build and sync copy only) and measures it for the engine -> audio/aura/song.wav, data/aura/audio.json, data/aura/lyrics.json.
The first phrase (0-10.105 s) is the Dhurandhar title track's "Ladies and gentlemen, you are not ready for this." (the user's
pick; data/aura/intro.json, analysis/aura_intro.py): from its last hit it sweeps down a low-pass and fades, while Dubplate rises
through a high-pass from the beat before its phrase line, its bass held back until its own slam at 10.105 s. Both loudness-matched.

  - grid: the measured constant fit (out/wip_aura/dubplate_grid.json, librosa beat tracking at the eighth level, 95.00 BPM),
    the window starting on the phrase-start slam at song 101.58 s (data/aura/song_map.json)
  - features at 100 fps (0..1): rms, low (<150 Hz), mid (150-3000 Hz), high (>3 kHz), flux (spectral onset strength); the shader
    world (render 03) is driven by these, not by guessed oscillators
  - onsets [t, strength]: kick (low-band flux peaks), snare (mid), hat (high), vocal (the speech-to-text word starts)

    python analysis/aura_audio.py
"""
import json, pathlib, re, subprocess, sys

import numpy as np
import librosa

ROOT = pathlib.Path(__file__).resolve().parent.parent
SM = json.loads((ROOT / "data" / "aura" / "song_map.json").read_text(encoding="utf-8"))
W0, W1 = SM["window"]; DUR = SM["duration"]; SRC = ROOT / SM["source"]
FPS = 100


def norm(x, p=98):
    return np.clip(x / (np.percentile(x, p) + 1e-9), 0, 1)


def peaks(env, thr, gap):
    """Local maxima of env above thr, at least gap frames apart (stronger first)."""
    idx = [i for i in range(1, len(env) - 1) if env[i] >= thr and env[i] >= env[i - 1] and env[i] > env[i + 1]]
    idx.sort(key=lambda i: -env[i]); keep = []
    for i in idx:
        if all(abs(i - j) >= gap for j in keep): keep.append(i)
    return sorted(keep)


def lufs(x):
    s = (np.clip(x.T, -1, 1) * 32767).astype(np.int16).tobytes()
    r = subprocess.run(["ffmpeg", "-nostats", "-f", "s16le", "-ar", "48000", "-ac", "2", "-i", "pipe:0", "-af", "ebur128", "-f", "null", "-"], input=s, capture_output=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr.decode())[-1])


def sweep(x, t0, t1, f0, f1, kind, curve=1.0):
    """A time-varying 4th-order low/high-pass (STFT mask): the cutoff moves from f0 to f1 (log) between t0 and t1."""
    hop = 512; X = librosa.stft(x, n_fft=4096, hop_length=hop)
    f = librosa.fft_frequencies(sr=48000, n_fft=4096)[:, None]; tt = librosa.frames_to_time(np.arange(X.shape[-1]), sr=48000, hop_length=hop)[None, :]
    k = np.clip((tt - t0) / (t1 - t0), 0, 1) ** curve; fc = f0 * (f1 / f0) ** k
    mask = 1 / (1 + (f / fc) ** 4) if kind == "low" else 1 / (1 + (fc / np.maximum(f, 1)) ** 4)
    return librosa.istft(X * mask[None], hop_length=hop, length=x.shape[-1])


def main():
    y, sr = librosa.load(SRC, sr=48000, mono=False, offset=W0, duration=DUR)
    A = ROOT / "audio" / "aura"; D = ROOT / "data" / "aura"; A.mkdir(parents=True, exist_ok=True)
    # the intro: Dhurandhar, then the hand-over to Dubplate on its phrase line
    IN = json.loads((D / "intro.json").read_text()); xf = IN["xfade"]; N = y.shape[1]; tN = np.arange(N) / 48000
    dh, _ = librosa.load(ROOT / IN["source"], sr=48000, mono=False, offset=IN["s0"], duration=xf["dh_gone"] + 0.05)
    dh = np.pad(dh, ((0, 0), (0, max(0, N - dh.shape[1]))))[:, :N]
    g_dh = 10 ** ((lufs(y[:, int(10.2 * 48000):int(40 * 48000)]) - 4.0 - lufs(dh[:, :int(xf["dh_lowpass_from"] * 48000)])) / 20)   # 4 dB under Dubplate: the slam lifts
    # (song.wav is float, so the intro's hits are not clipped here; the mix's look-ahead limiter takes the peaks)
    dh = sweep(dh, xf["dh_lowpass_from"], xf["slam"], 18000, 320, "low") * g_dh
    dh *= np.clip((xf["dh_gone"] - tN) / (xf["dh_gone"] - xf["slam"] + 0.3), 0, 1) ** 1.5
    up = np.clip((tN - xf["dub_in_from"]) / (xf["slam"] - xf["dub_in_from"]), 0, 1)
    dub = sweep(y, xf["dub_in_from"], xf["slam"], 1400, 20, "high", curve=2.5) * (np.sin(up * np.pi / 2) ** 2)
    y = dh + dub
    print(f"intro: Dhurandhar {IN['s0']:.2f}+ at {20 * np.log10(g_dh):+.1f} dB (loudness-matched), low-pass from {xf['dh_lowpass_from']} s; Dubplate in from {xf['dub_in_from']} s, slam {xf['slam']} s")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", "48000", "-ac", "2", "-i", "pipe:0", "-c:a", "pcm_f32le", str(A / "song.wav")],
                   input=np.ascontiguousarray(y.T, dtype=np.float32).tobytes(), check=True)
    m = librosa.to_mono(y); hop = 480                     # 48000 / 480 = 100 frames a second
    S = np.abs(librosa.stft(m, n_fft=2048, hop_length=hop)); f = librosa.fft_frequencies(sr=48000, n_fft=2048)
    n = int(round(DUR * FPS)); fit = lambda x: np.pad(x, (0, max(0, n - len(x))))[:n]
    band = lambda lo, hi: fit(S[(f >= lo) & (f < hi)].sum(0))
    rms = fit(librosa.feature.rms(y=m, frame_length=2048, hop_length=hop)[0])
    low, mid, high = band(30, 150), band(150, 3000), band(3000, 16000)
    flux = lambda b: np.maximum(0, np.diff(np.log1p(b), prepend=np.log1p(b[0])))
    fl, fm, fh = flux(low), flux(mid), flux(high)
    onset = fit(librosa.onset.onset_strength(y=m, sr=48000, hop_length=hop))
    feats = {"rms": norm(rms), "low": norm(low), "mid": norm(mid), "high": norm(high), "flux": norm(onset), "bass": norm(low),
             "drums": norm(fl + fh), "vocal": norm(mid), "other": norm(high)}
    kick = [[round(i / FPS, 3), round(float(norm(fl)[i]), 3)] for i in peaks(norm(fl), 0.35, 18)]
    snare = [[round(i / FPS, 3), round(float(norm(fm)[i]), 3)] for i in peaks(norm(fm), 0.45, 22)]
    hat = [[round(i / FPS, 3), round(float(norm(fh)[i]), 3)] for i in peaks(norm(fh), 0.4, 10)]
    vocal = [[w["t"], 1.0] for w in IN["words"]] + [[w["t"], 1.0] for w in SM["words"] if w["t"] >= xf["slam"]]
    beats = [round(b, 4) for b in np.arange(0, DUR + 1e-6, SM["beat"]) if b <= DUR]
    audio = {"duration": DUR, "bpm": SM["bpm"], "fps": FPS, "beats": beats, "downbeats": SM["bars"],
             "sections": [{"name": f"phrase{i + 1}", "start": p, "end": (SM["phrases"] + [DUR])[i + 1]} for i, p in enumerate(SM["phrases"])],
             "features": {k: np.round(v, 4).tolist() for k, v in feats.items()},
             "onsets": {"kick": kick, "snare": snare, "hat": hat, "vocal": vocal},
             "notes": f"0-{xf['slam']} s Dhurandhar title track ({IN['url']}, from {IN['s0']} s), then General Levy - Dubplate, song {W0}-{W1} s (build/sync copies); measured by analysis/aura_audio.py"}
    (D / "audio.json").write_text(json.dumps(audio))
    (D / "lyrics.json").write_text(json.dumps({"lines": [], "notes": "no narration"}))
    print(f"song.wav {DUR} s; {len(beats)} beats, {len(SM['bars'])} bar lines; onsets: {len(kick)} kick, {len(snare)} snare, {len(hat)} hat, {len(vocal)} vocal")
    on_grid = [k for k, _ in kick if abs(k / SM["eighth"] - round(k / SM["eighth"])) * SM["eighth"] < 0.035]
    print(f"kicks within 35 ms of the eighth grid: {len(on_grid)}/{len(kick)}")


if __name__ == "__main__":
    main()
