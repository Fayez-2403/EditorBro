"""The Editor's Aura V4 music (the user, 2026-10-22: the renders only, no opening cinematic and no behind-the-scenes, posted before
V2; max 30 s, faster, exactly on Dubplate's beats; "see if u can improve music mathematics"). V1, V2, V2-51s and V3 are kept.
  A  song bar 23 -> 28 (159.05-171.68): "yes, I come... like a NUCLEAR BOMB", the fast run, "talk to the boys... the girls...
     the woman... the man... talk to the"
  C  song bar 32 -> the fade (181.79-197.5): "computer tongue. Go tell them... tougher than a lion. And if a sound test, them
     definitely going under... number one", the final slam, the song's own fade
  The join removes exactly one 4-bar phrase (bars 28-31). Both sides are phrase lines that open on the same bass slam, so V4's bar
  grid runs straight through it (bars at n x 2.526 s from 0). Heard across it: "...talk to the | computer tongue".
The music mathematics, new in V4 (V1-V3 used a 95.002 BPM grid fitted on 10 ms frames):
  1. Accent phase. The riddim's accents (the downbeat kick, the backbeat on 2 and 4), measured at 1 ms on a causal envelope, land
     ~30 ms before that grid: 2 frames at 60 fps, so every hit in V1-V3 trailed its drum. V4 reads the song early by the measured
     phase, so the accents sound on the frame they are drawn.
  2. Onsets at 1 ms (causal 2 ms RMS slope per band) instead of 10 ms frames; the cues snap every cut and hit to its transient.
  3. Caption syllables: whisper's word starts snapped to the nearest vocal-band onset within 60 ms.
  4. The splice: the bar-28 and bar-32 downbeats are cross-correlated (+-4 ms) so the two sides' drums line up to the sample,
     then a 12 ms equal-power crossfade (no tail: A's next word, "young", starts on the join).
Writes audio/aura_v4/song.wav, data/aura_v4/{audio,song_map,lyrics}.json; prints the measurements (kept in the song map).
    python analysis/aura_v4_audio.py
"""
import json, pathlib, subprocess, sys
import numpy as np, librosa, scipy.signal as ss

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from aura_audio import norm, peaks

ROOT = pathlib.Path(__file__).resolve().parent.parent
SM = json.loads((ROOT / "data/aura/song_map.json").read_text(encoding="utf-8"))
BAR, BEAT, E8, W0 = SM["bar"], SM["beat"], SM["eighth"], SM["window"][0]
FPS, SR, MS = 100, 48000, 48                    # features at 100 fps (as V1-V3); onsets at 1 ms (48 samples)
A_BAR, A_LEN, C_BAR = 23, 5, 32                 # A = V1 bars 23-27 (song bar numbers as V1 counts them), C = V1 bar 32 on
FADE_END = W0 + 96.55                           # the song's own fade (as V2/V3)
JOIN = round(A_LEN * BAR, 5)                    # V4 12.631: the join
DUR = round(JOIN + FADE_END - (W0 + C_BAR * BAR), 2)
XF = 0.012


def slope(y, lo=None, hi=None):
    """Causal 2 ms RMS envelope of a band, its log slope at 1 ms resolution (onset strength), and its group delay in ms."""
    if lo and hi: b, a = ss.butter(2, [lo / (SR / 2), hi / (SR / 2)], "band")
    elif lo: b, a = ss.butter(2, lo / (SR / 2), "high")
    else: b, a = ss.butter(2, hi / (SR / 2), "low")
    e = np.sqrt(ss.lfilter(np.ones(96) / 96, 1, ss.lfilter(b, a, y) ** 2))[::MS]
    le = np.log(e + 1e-5); s = np.maximum(0, np.diff(le, prepend=le[0]))
    return ss.lfilter(np.ones(3) / 3, 1, s), 2.0


def accent_phase(y, t0):
    """Median offset (ms) of the measured accents from the V1 grid over V4's source bars: the downbeat (broadband attack) and the
    backbeat on 2 and 4 (snare band). Negative = the drums land before the grid."""
    bb, lag_b = slope(y, 60, None); sn, lag_s = slope(y, 1800, 6000)
    offs = []
    for bk in list(range(A_BAR, A_BAR + A_LEN)) + list(range(C_BAR, C_BAR + 3)):
        for beat, (env, lag) in ((0, (bb, lag_b)), (1, (sn, lag_s)), (3, (sn, lag_s))):
            g = W0 + bk * BAR + beat * BEAT; i = int(round((g - t0) * 1000)); w = env[i - 60:i + 40]
            if len(w) == 100 and w.max() > np.percentile(env, 95): offs.append(int(np.argmax(w)) - 60 - lag)
    return float(np.median(offs)), offs


def main():
    A, D = ROOT / "audio/aura_v4", ROOT / "data/aura_v4"; A.mkdir(parents=True, exist_ok=True); D.mkdir(parents=True, exist_ok=True)
    src = ROOT / SM["source"]; T0 = W0 + A_BAR * BAR - 2.0
    y, _ = librosa.load(src, sr=SR, mono=False, offset=T0, duration=FADE_END - T0 + 1.0)
    m = librosa.to_mono(y)
    ph_ms, offs = accent_phase(m, T0); PH = ph_ms / 1000
    # the splice: line the bar-32 downbeat up with where bar 28's would be (onset envelopes cross-correlated, +-4 ms)
    bb, _ = slope(m, 60, None)
    seg = lambda s: bb[int(round((s - T0) * 1000)) - 150:int(round((s - T0) * 1000)) + 350]
    a28, c32 = seg(W0 + 28 * BAR), seg(W0 + C_BAR * BAR)
    lags = range(-4, 5); xc = [float(np.dot(a28[10:-10], np.roll(c32, -L)[10:-10])) for L in lags]; dC = list(lags)[int(np.argmax(xc))] / 1000
    sA, sC = W0 + A_BAR * BAR + PH, W0 + C_BAR * BAR + PH + dC          # song times read at V4 0 and at the join
    N = int(round(DUR * SR)); tN = np.arange(N) / SR
    def piece(s_from, v_from, v_to):
        i0 = int(round((s_from - T0) * SR)); n = int(round((v_to - v_from) * SR)); out = np.zeros((2, N)); j = int(round(v_from * SR))
        out[:, j:j + n] = y[:, i0:i0 + n][:, :N - j]; return out
    pa = piece(sA, 0, JOIN + XF / 2); pc = piece(sC - XF / 2, JOIN - XF / 2, DUR)
    k = np.clip((tN - (JOIN - XF / 2)) / XF, 0, 1)
    song = pa * np.cos(k * np.pi / 2) + pc * np.sin(k * np.pi / 2)
    song *= np.clip(tN / 0.002, 0, 1) * np.clip((DUR - tN) / 0.6, 0, 1)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0", "-c:a", "pcm_f32le", str(A / "song.wav")],
                   input=np.ascontiguousarray(song.T, dtype=np.float32).tobytes(), check=True)
    # ---- V4's own analysis, on V4's audio
    mono = librosa.to_mono(song); hop = SR // FPS
    S = np.abs(librosa.stft(mono, n_fft=2048, hop_length=hop)); f = librosa.fft_frequencies(sr=SR, n_fft=2048)
    n = int(round(DUR * FPS)); fit = lambda x: np.pad(x, (0, max(0, n - len(x))))[:n]
    band = lambda lo, hi: fit(S[(f >= lo) & (f < hi)].sum(0))
    rms = fit(librosa.feature.rms(y=mono, frame_length=2048, hop_length=hop)[0]); low, mid, high = band(30, 150), band(150, 3000), band(3000, 16000)
    fl = np.maximum(0, np.diff(np.log1p(low), prepend=np.log1p(low[0]))); fh = np.maximum(0, np.diff(np.log1p(high), prepend=np.log1p(high[0])))
    onset = fit(librosa.onset.onset_strength(y=mono, sr=SR, hop_length=hop))
    feats = {"rms": norm(rms), "low": norm(low), "mid": norm(mid), "high": norm(high), "flux": norm(onset), "bass": norm(low), "drums": norm(fl + fh), "vocal": norm(mid), "other": norm(high)}
    def onsets(lo, hi, thr, gap_ms):
        env, lag = slope(mono, lo, hi); e = norm(env, 99.5)
        return [[round((i - lag) / 1000, 4), round(float(e[i]), 3)] for i in peaks(e, thr, gap_ms) if i - lag >= 0]
    kick, snare, hat = onsets(None, 120, 0.35, 180), onsets(1800, 6000, 0.45, 220), onsets(7000, None, 0.4, 100)
    voc, vlag = slope(mono, 300, 3400); vn = norm(voc, 99.5)
    # words: whisper (V1's song map) -> V4 time, repeated hallucinations dropped (>= 3 words on one stamp: keep the last), snapped
    raw = SM["words"]; stamp = {}
    for w in raw: stamp.setdefault(w["t"], []).append(w)
    words, shifts = [], []
    for w in raw:
        grp = stamp[w["t"]]
        if len(grp) >= 3 and w is not grp[-1]: continue
        s = W0 + w["t"]
        if sA <= s < sA + JOIN: v = s - sA
        elif sC <= s < sC + (DUR - JOIN): v = JOIN + s - sC
        else: continue
        i = int(round(v * 1000)); lo_, hi_ = max(0, i - 60), min(len(vn), i + 61)
        j = lo_ + int(np.argmax(vn[lo_:hi_])) if hi_ > lo_ else i
        vs = (j - vlag) / 1000 if vn[j] > 0.25 else v
        shifts.append((vs - v) * 1000); words.append({"w": w["w"], "t": round(vs, 4), "whisper": round(v, 4)})
    # the bass drop-outs ("going under" ... "number one") measured at 1 ms on V4's sub band (causal envelope, < 120 Hz): out when it
    # falls under 30 % of the bar before's median, back when it climbs over 50 % (V1's grid anchors put them up to 0.23 s off)
    b_, a_ = ss.butter(2, 120 / (SR / 2), "low"); sub = np.sqrt(ss.lfilter(np.ones(480) / 480, 1, ss.lfilter(b_, a_, mono) ** 2))[::MS]
    ref = float(np.median(sub[int((JOIN + 1 * BAR) * 1000):int((JOIN + 2 * BAR) * 1000)])); runs, i, i1 = [], int((JOIN + 2 * BAR) * 1000), int((JOIN + 3 * BAR) * 1000) + 30
    while i < i1:
        if sub[i] < 0.3 * ref:
            j = i
            while j < len(sub) - 1 and sub[j] < 0.5 * ref: j += 1
            if j - i > 80: runs.append([round(i / 1000 - 0.005, 3), round(j / 1000 - 0.005, 3)])   # - the 10 ms window's half lag
            i = j
        i += 1
    bars = [round(k * BAR, 5) for k in range(int(DUR / BAR) + 1)]
    v4bar = lambda v1bar: round((v1bar - A_BAR) * BAR, 5) if v1bar < A_BAR + A_LEN else round(JOIN + (v1bar - C_BAR) * BAR, 5)
    anchors = {"drop": v4bar(24), "bomb": v4bar(24.25), "join": JOIN, "gap1": v4bar(34.125), "bass_back": v4bar(34.375), "gap2": v4bar(34.75),
               "final_slam": v4bar(35), "chopper_run": [v4bar(24.25), JOIN], "measured_dropouts": runs}
    audio = {"duration": DUR, "bpm": SM["bpm"], "fps": FPS, "beats": [round(b, 4) for b in np.arange(0, DUR + 1e-6, BEAT)], "downbeats": bars,
             "sections": [{"name": "A", "start": 0, "end": JOIN}, {"name": "C", "start": JOIN, "end": DUR}],
             "features": {k: np.round(v, 4).tolist() for k, v in feats.items()},
             "onsets": {"kick": kick, "snare": snare, "hat": hat, "vocal": [[w["t"], 1.0] for w in words]},
             "notes": "V4: Dubplate V1 bars 23-27 + 32 to the fade, read early by the measured accent phase; onsets at 1 ms; build/sync copy"}
    (D / "audio.json").write_text(json.dumps(audio))
    (D / "lyrics.json").write_text(json.dumps({"lines": [], "notes": "no narration"}))
    math = {"accent_phase_ms": round(ph_ms, 1), "accent_samples": len(offs), "accent_iqr_ms": [round(float(np.percentile(offs, 25)), 1), round(float(np.percentile(offs, 75)), 1)],
            "splice_xcorr_ms": round(dC * 1000, 1), "word_snap_ms_median_abs": round(float(np.median(np.abs(shifts))), 1), "onset_resolution_ms": 1,
            "frame_ms_60fps": round(1000 / 60, 2)}
    (D / "song_map.json").write_text(json.dumps({"duration": DUR, "bpm": SM["bpm"], "eighth": E8, "beat": BEAT, "bar": BAR, "join": JOIN,
        "song_read": {"A": [round(sA, 5), 0, JOIN], "C": [round(sC, 5), JOIN, DUR]}, "v1_bars": {"A": [A_BAR, A_BAR + A_LEN], "C": [C_BAR, None]},
        "bars": bars, "anchors": anchors, "words": words, "math": math, "dubplate_source": SM["source"]}, indent=1))
    print(f"V4 song {DUR} s; join {JOIN}; accent phase {ph_ms:+.1f} ms (n {len(offs)}, IQR {math['accent_iqr_ms']}); splice {dC * 1000:+.1f} ms; "
          f"words {len(words)} (snap median |{math['word_snap_ms_median_abs']}| ms); onsets k{len(kick)} s{len(snare)} h{len(hat)}; dropouts {runs}")


if __name__ == "__main__":
    main()
