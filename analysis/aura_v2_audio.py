"""The Editor's Aura V2 music (89 s, the user's pick 2026-10-22: "~90 s, rearranged"). The 51.6 s first cut is frozen in
data/aura_v2_51s + audio/aura_v2_51s.
  0-10.105 s   Dhurandhar, "Ladies and gentlemen, you are not ready for this." (as V1, data/aura/intro.json); hand-over to:
  A 10.1-25.3  Dubplate's climax straight away: song 156.525 s (V1 bar 22) "...General Levy sound did you come... like a
               NUCLEAR BOMB", the fast run, to the phrase line at song 171.683 s
  B 25.3-65.7  Dubplate's verses: song 111.052-151.473 s (V1 bars 4-19, four phrases), from "...the people like how we flow"
  C 65.7-89.0  Dubplate's ending: song 174.209 s (V1 bar 29) to the song's own fade (197.5 s)
Every join is on a bar line of the same measured grid (the song is a constant 95.00 BPM and each phrase opens with the same
bass slam), so V2's bar lines stay at n x 2.526 s and every cut stays on the beat. A's last words ("...young generation")
cross its bar line, so A's tail rings 0.55 s under B's slam, high-passed (the vocal only). B -> C: a 30 ms crossfade.
Writes audio/aura_v2/song.wav, data/aura_v2/{audio,song_map,lyrics}.json.
    python analysis/aura_v2_audio.py
"""
import json, pathlib, subprocess, sys
import numpy as np, librosa

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from aura_audio import lufs, sweep, norm, peaks   # V1's measured helpers

ROOT = pathlib.Path(__file__).resolve().parent.parent
SM = json.loads((ROOT / "data/aura/song_map.json").read_text(encoding="utf-8"))
IN = json.loads((ROOT / "data/aura/intro.json").read_text())
BAR, BEAT, E8, W0 = SM["bar"], SM["beat"], SM["eighth"], SM["window"][0]
FPS, SR, DUR = 100, 48000, 89.0
# Dubplate segments: (V2 from, V2 to, V1 bar that plays at "from"); song time = W0 + V1 time
SEG = [(4 * BAR, 10 * BAR, 22), (10 * BAR, 26 * BAR, 4), (26 * BAR, DUR, 29)]
TAIL_A = 0.55


def v1_of(t):
    """The V1 time (so the song time) that V2 time t plays, for t in the Dubplate part."""
    for a, b, vb in SEG:
        if a <= t < b + 1e-9: return vb * BAR + (t - a)
    return None


def main():
    A, D = ROOT / "audio/aura_v2", ROOT / "data/aura_v2"; A.mkdir(parents=True, exist_ok=True); D.mkdir(parents=True, exist_ok=True)
    N = int(round(DUR * SR)); tN = np.arange(N) / SR; xf = IN["xfade"]; src = ROOT / SM["source"]
    def piece(v2_from, v2_to, v1_from):   # the song from V1 time v1_from, placed at V2 time v2_from
        y, _ = librosa.load(src, sr=SR, mono=False, offset=W0 + v1_from, duration=v2_to - v2_from + 0.05)
        out = np.zeros((2, N)); i0 = int(round(v2_from * SR)); m = min(y.shape[1], N - i0); out[:, i0:i0 + m] = y[:, :m]; return out
    # A starts one beat early (the high-pass rise into the slam, as V1's hand-over) and rings TAIL_A past its end
    a0, a1, ab = SEG[0]
    dubA = piece(xf["dub_in_from"], a1 + TAIL_A, ab * BAR - (a0 - xf["dub_in_from"]))
    up = np.clip((tN - xf["dub_in_from"]) / (xf["slam"] - xf["dub_in_from"]), 0, 1)
    dubA = sweep(dubA, xf["dub_in_from"], xf["slam"], 1400, 20, "high", curve=2.5) * (np.sin(up * np.pi / 2) ** 2)
    tail = np.clip((tN - a1) / TAIL_A, 0, 1)
    dubA = dubA * (tN < a1) + sweep(dubA, a1, a1 + 0.08, 20, 260, "high") * (tN >= a1) * np.cos(tail * np.pi / 2) ** 2
    b0, b1, bb = SEG[1]; dubB = piece(b0 - 0.015, b1 + 0.015, bb * BAR - 0.015)
    fadeB = np.clip((tN - (b0 - 0.015)) / 0.03, 0, 1) * np.clip((b1 + 0.015 - tN) / 0.03, 0, 1); dubB *= fadeB
    c0, c1, cb = SEG[2]; dubC = piece(c0 - 0.015, c1, cb * BAR - 0.015) * np.clip((tN - (c0 - 0.015)) / 0.03, 0, 1)
    dub = dubA + dubB + dubC
    dh, _ = librosa.load(ROOT / IN["source"], sr=SR, mono=False, offset=IN["s0"], duration=xf["dh_gone"] + 0.05)
    dh = np.pad(dh, ((0, 0), (0, max(0, N - dh.shape[1]))))[:, :N]
    g_dh = 10 ** ((lufs(dub[:, int(10.2 * SR):int(40 * SR)]) - 4.0 - lufs(dh[:, :int(xf["dh_lowpass_from"] * SR)])) / 20)
    dh = sweep(dh, xf["dh_lowpass_from"], xf["slam"], 18000, 320, "low") * g_dh
    dh *= np.clip((xf["dh_gone"] - tN) / (xf["dh_gone"] - xf["slam"] + 0.3), 0, 1) ** 1.5
    y = (dh + dub) * np.clip((DUR - tN) / 0.6, 0, 1)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0", "-c:a", "pcm_f32le", str(A / "song.wav")],
                   input=np.ascontiguousarray(y.T, dtype=np.float32).tobytes(), check=True)
    m = librosa.to_mono(y); hop = SR // FPS
    S = np.abs(librosa.stft(m, n_fft=2048, hop_length=hop)); f = librosa.fft_frequencies(sr=SR, n_fft=2048)
    n = int(round(DUR * FPS)); fit = lambda x: np.pad(x, (0, max(0, n - len(x))))[:n]
    band = lambda lo, hi: fit(S[(f >= lo) & (f < hi)].sum(0))
    rms = fit(librosa.feature.rms(y=m, frame_length=2048, hop_length=hop)[0]); low, mid, high = band(30, 150), band(150, 3000), band(3000, 16000)
    flux = lambda b: np.maximum(0, np.diff(np.log1p(b), prepend=np.log1p(b[0]))); fl, fm, fh = flux(low), flux(mid), flux(high)
    onset = fit(librosa.onset.onset_strength(y=m, sr=SR, hop_length=hop))
    feats = {"rms": norm(rms), "low": norm(low), "mid": norm(mid), "high": norm(high), "flux": norm(onset), "bass": norm(low), "drums": norm(fl + fh), "vocal": norm(mid), "other": norm(high)}
    kick = [[round(i / FPS, 3), round(float(norm(fl)[i]), 3)] for i in peaks(norm(fl), 0.35, 18)]
    snare = [[round(i / FPS, 3), round(float(norm(fm)[i]), 3)] for i in peaks(norm(fm), 0.45, 22)]
    hat = [[round(i / FPS, 3), round(float(norm(fh)[i]), 3)] for i in peaks(norm(fh), 0.4, 10)]
    words = [{"w": w["w"], "t": w["t"]} for w in IN["words"]]
    for a, b, vb in SEG:
        for w in SM["words"]:
            t = a + (w["t"] - vb * BAR)
            if a <= t < b: words.append({"w": w.get("w", w.get("word")), "t": round(t, 3)})
    words.sort(key=lambda w: w["t"])
    v2_of = lambda v1: next((round(a + v1 - vb * BAR, 4) for a, b, vb in SEG if a <= a + v1 - vb * BAR < b), None)
    an = SM["anchors"]
    anchors = {"chopper_intro": v2_of(an["chopper_intro"]), "chopper_run": [v2_of(an["chopper_run"][0]), round(SEG[0][1], 4)],
               "gap1": v2_of(an["gap1"]), "bass_back": v2_of(an["bass_back"]), "gap2": v2_of(an["gap2"]), "final_slam": v2_of(an["final_slam"])}
    bars = [round(k * BAR, 4) for k in range(int(DUR / BAR) + 1)]
    phrases = [0.0, round(4 * BAR, 4), round(6 * BAR, 4), *[round(k * BAR, 4) for k in (10, 14, 18, 22)], round(29 * BAR, 4), round(33 * BAR, 4)]
    audio = {"duration": DUR, "bpm": SM["bpm"], "fps": FPS, "beats": [round(b, 4) for b in np.arange(0, DUR + 1e-6, BEAT)], "downbeats": bars,
             "sections": [{"name": f"phrase{i + 1}", "start": p, "end": (phrases + [DUR])[i + 1]} for i, p in enumerate(phrases)],
             "features": {k: np.round(v, 4).tolist() for k, v in feats.items()}, "onsets": {"kick": kick, "snare": snare, "hat": hat, "vocal": [[w["t"], 1.0] for w in words]},
             "notes": "V2 (89 s): Dhurandhar intro, then Dubplate rearranged on its phrase lines: climax (song 156.5-171.7), verses (111.1-151.5), ending (174.2-197.5); build/sync copies"}
    (D / "audio.json").write_text(json.dumps(audio))
    (D / "lyrics.json").write_text(json.dumps({"lines": [], "notes": "no narration"}))
    (D / "song_map.json").write_text(json.dumps({"duration": DUR, "bpm": SM["bpm"], "eighth": E8, "beat": BEAT, "bar": BAR, "segments_v2_from_to_v1bar": SEG,
        "tail_a": TAIL_A, "bars": bars, "phrases": phrases, "anchors": anchors, "words": words, "intro": IN, "dubplate_source": SM["source"],
        "song_times": [[a, b, round(W0 + vb * BAR, 4)] for a, b, vb in SEG]}, indent=1))
    print(f"V2 song {DUR} s; Dubplate segments (V2 from-to <- song): {[(round(a, 3), round(b, 3), round(W0 + vb * BAR, 3)) for a, b, vb in SEG]}")
    print(f"anchors {anchors}; onsets {len(kick)} kick / {len(snare)} snare / {len(hat)} hat; dh {20 * np.log10(g_dh):+.1f} dB")


if __name__ == "__main__":
    main()
