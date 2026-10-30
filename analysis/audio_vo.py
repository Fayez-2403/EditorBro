"""Voice envelopes, word onsets and a nominal beat grid -> data/audio.json.

    python -m uv run --no-project --with numpy python analysis/audio_vo.py

Run after align_vo.py (it reads data/lyrics.json for the word onsets).
"""
import json
import numpy as np
from common_vo import load_audio, DATA

FPS = 100
BPM = 120.0  # nominal grid; a voiceover has no beat, the grid only gives plates a steady pulse


def band_env(spec, freqs, lo, hi):
    sel = (freqs >= lo) & (freqs < hi)
    return np.sqrt(spec[:, sel].mean(1) + 1e-12)


def norm(x):
    x = x / (np.percentile(x, 98) + 1e-9)
    return np.clip(x, 0, 1)


def smooth(x, k=3):
    return np.convolve(x, np.ones(k) / k, mode="same")


def main():
    y, sr = load_audio(sr=16000)
    dur = len(y) / sr
    hop, win = sr // FPS, 1024
    n = int(dur * FPS)
    pad = np.pad(y, (win // 2, win))
    frames = np.stack([pad[i * hop: i * hop + win] * np.hanning(win) for i in range(n)])
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
    freqs = np.fft.rfftfreq(win, 1 / sr)
    rms = norm(smooth(np.sqrt((frames ** 2).mean(1) + 1e-12)))
    feats = {
        "rms": rms, "vocal": rms,
        "low": norm(smooth(band_env(spec, freqs, 60, 300))),
        "mid": norm(smooth(band_env(spec, freqs, 300, 2000))),
        "high": norm(smooth(band_env(spec, freqs, 2000, 7000))),
    }
    for k in ("drums", "bass", "other"):
        feats[k] = np.zeros(n)
    lyr = json.loads((DATA / "lyrics.json").read_text(encoding="utf-8"))
    words = [w for l in lyr["lines"] for w in l["words"]]
    vonset = [[round(w["start"], 3), round(float(rms[min(n - 1, int(w["start"] * FPS) + 3)]), 3)] for w in words]
    # line starts as stronger 'kick' pulses, so plates can punch on each new sentence
    kicks = [[round(l["start"], 3), 1.0] for l in lyr["lines"]]
    period = 60 / BPM
    beats = [round(i * period, 4) for i in range(int(dur / period) + 1)]
    out = {
        "duration": round(dur, 3), "bpm": BPM, "beat_period": period, "time_signature": 4, "fps": FPS,
        "beats": beats, "downbeats": beats[::4],
        "sections": [{"name": "vo", "start": 0.0, "end": round(dur, 3)}],
        **{k: [round(float(v), 4) for v in a] for k, a in feats.items()},
        "onsets": {"vocal": vonset, "kick": kicks, "snare": [], "hat": []},
        "notes": "voiceover analysis: rms/band envelopes at 100 fps, word onsets (vocal), line starts (kick), nominal 120 BPM grid",
    }
    (DATA / "audio.json").write_text(json.dumps(out))
    print(f"wrote data/audio.json: {dur:.2f} s, {len(vonset)} word onsets, {len(kicks)} line starts")


if __name__ == "__main__":
    main()
