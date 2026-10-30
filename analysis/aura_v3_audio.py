"""The Editor's Aura V3 music (the user, 2026-10-22: start from the side shot of the developer, no face reveal, he cracks his neck
and his knuckles, then it begins; the cinematic cut down; proper sync). V1 and both V2 cuts are kept.
  0-5.30 s     Dhurandhar, "Ladies and gentlemen, you are not ready for this." + its two hits (data/aura/intro.json), shortened:
               from the second hit (4.71 s) it sweeps down a low-pass while Dubplate rises through a high-pass, slam at 5.30 s
  A            Dubplate's build + climax: V1 bars 22-27 (song 156.53-171.68), the major prompt, then the robot dance on the drop
  B            Dubplate's verses in V1's own order: V1 bars 4-21 (song 111.05-156.53), so V1's renders land on their own bars
  C            Dubplate's ending: V1 bar 28 (song 171.68) to the song's fade (197.5 s): the pit stop, the editor finale, the outro
V3's bar lines are at 5.30 + n x 2.526 s. A's tail ("...young generation") rings 0.55 s under B's slam, high-passed (the vocal
only); B -> C and the A -> C ordering keep every join on a bar line. Writes audio/aura_v3/song.wav, data/aura_v3/{audio,song_map,lyrics}.json.
    python analysis/aura_v3_audio.py
"""
import json, pathlib, subprocess, sys
import numpy as np, librosa

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from aura_audio import lufs, sweep, norm, peaks

ROOT = pathlib.Path(__file__).resolve().parent.parent
SM = json.loads((ROOT / "data/aura/song_map.json").read_text(encoding="utf-8"))
IN = json.loads((ROOT / "data/aura/intro.json").read_text())
BAR, BEAT, E8, W0 = SM["bar"], SM["beat"], SM["eighth"], SM["window"][0]
FPS, SR = 100, 48000
I = 5.30                                   # the slam: the intro is cut down to the line and its two hits
DUR = round(I + 24 * BAR + (W0 + 96.55 - (W0 + 28 * BAR)), 2)   # C runs to the song's fade (V1 96.55 = song 197.5)
SEG = [(I, I + 6 * BAR, 22), (I + 6 * BAR, I + 24 * BAR, 4), (I + 24 * BAR, DUR, 28)]   # (V3 from, V3 to, V1 bar at "from")
TAIL_A = 0.55
XF = {"dh_lowpass_from": IN["hits"][1], "dub_in_from": round(I - BEAT, 4), "slam": I, "dh_gone": round(I + 0.2, 4)}


def main():
    A, D = ROOT / "audio/aura_v3", ROOT / "data/aura_v3"; A.mkdir(parents=True, exist_ok=True); D.mkdir(parents=True, exist_ok=True)
    N = int(round(DUR * SR)); tN = np.arange(N) / SR; src = ROOT / SM["source"]
    def piece(v3_from, v3_to, v1_from):
        y, _ = librosa.load(src, sr=SR, mono=False, offset=W0 + v1_from, duration=v3_to - v3_from + 0.05)
        out = np.zeros((2, N)); i0 = int(round(v3_from * SR)); m = min(y.shape[1], N - i0); out[:, i0:i0 + m] = y[:, :m]; return out
    a0, a1, ab = SEG[0]
    dubA = piece(XF["dub_in_from"], a1 + TAIL_A, ab * BAR - (a0 - XF["dub_in_from"]))
    up = np.clip((tN - XF["dub_in_from"]) / (I - XF["dub_in_from"]), 0, 1)
    dubA = sweep(dubA, XF["dub_in_from"], I, 1400, 20, "high", curve=2.5) * (np.sin(up * np.pi / 2) ** 2)
    tail = np.clip((tN - a1) / TAIL_A, 0, 1)
    dubA = dubA * (tN < a1) + sweep(dubA, a1, a1 + 0.08, 20, 260, "high") * (tN >= a1) * np.cos(tail * np.pi / 2) ** 2
    b0, b1, bb = SEG[1]; dubB = piece(b0 - 0.015, b1 + 0.015, bb * BAR - 0.015)
    dubB *= np.clip((tN - (b0 - 0.015)) / 0.03, 0, 1) * np.clip((b1 + 0.015 - tN) / 0.03, 0, 1)
    c0, c1, cb = SEG[2]; dubC = piece(c0 - 0.015, c1, cb * BAR - 0.015) * np.clip((tN - (c0 - 0.015)) / 0.03, 0, 1)
    dub = dubA + dubB + dubC
    dh, _ = librosa.load(ROOT / IN["source"], sr=SR, mono=False, offset=IN["s0"], duration=XF["dh_gone"] + 0.05)
    dh = np.pad(dh, ((0, 0), (0, max(0, N - dh.shape[1]))))[:, :N]
    g_dh = 10 ** ((lufs(dub[:, int(6 * SR):int(36 * SR)]) - 4.0 - lufs(dh[:, :int(XF["dh_lowpass_from"] * SR)])) / 20)
    dh = sweep(dh, XF["dh_lowpass_from"], I, 18000, 320, "low") * g_dh
    dh *= np.clip((XF["dh_gone"] - tN) / (XF["dh_gone"] - I + 0.3), 0, 1) ** 1.5
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
    v3_of = lambda v1: next((round(a + v1 - vb * BAR, 4) for a, b, vb in SEG if a <= a + v1 - vb * BAR < b), None)
    an = SM["anchors"]
    anchors = {"chopper_intro": v3_of(an["chopper_intro"]), "chopper_run": [v3_of(an["chopper_run"][0]), round(SEG[0][1], 4)],
               "gap1": v3_of(an["gap1"]), "bass_back": v3_of(an["bass_back"]), "gap2": v3_of(an["gap2"]), "final_slam": v3_of(an["final_slam"])}
    bars = [round(I + k * BAR, 4) for k in range(int((DUR - I) / BAR) + 1)]
    audio = {"duration": DUR, "bpm": SM["bpm"], "fps": FPS, "beats": [round(I + b, 4) for b in np.arange(0, DUR - I + 1e-6, BEAT)], "downbeats": bars,
             "sections": [{"name": "intro", "start": 0, "end": I}, {"name": "A", "start": SEG[0][0], "end": SEG[0][1]}, {"name": "B", "start": SEG[1][0], "end": SEG[1][1]}, {"name": "C", "start": SEG[2][0], "end": DUR}],
             "features": {k: np.round(v, 4).tolist() for k, v in feats.items()}, "onsets": {"kick": kick, "snare": snare, "hat": hat, "vocal": [[w["t"], 1.0] for w in words]},
             "notes": "V3: Dhurandhar line cut down (0-5.3 s), then Dubplate: build + climax (V1 bars 22-27), verses (V1 4-21), ending (V1 28-) to the fade; build/sync copies"}
    (D / "audio.json").write_text(json.dumps(audio))
    (D / "lyrics.json").write_text(json.dumps({"lines": [], "notes": "no narration"}))
    (D / "song_map.json").write_text(json.dumps({"duration": DUR, "bpm": SM["bpm"], "eighth": E8, "beat": BEAT, "bar": BAR, "intro_len": I, "xfade": XF,
        "segments_v3_from_to_v1bar": SEG, "tail_a": TAIL_A, "bars": bars, "anchors": anchors, "words": words, "intro": IN, "dubplate_source": SM["source"],
        "song_times": [[a, b, round(W0 + vb * BAR, 4)] for a, b, vb in SEG]}, indent=1))
    print(f"V3 song {DUR} s; intro {I} s; segments {[(round(a, 3), round(b, 3), vb) for a, b, vb in SEG]}; anchors {anchors}; dh {20 * np.log10(g_dh):+.1f} dB")


if __name__ == "__main__":
    main()
