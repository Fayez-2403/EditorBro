"""The Editor's Aura song map -> data/aura/song_map.json (the reel's master timeline; every cut and event is placed on it).

Measured from the track, not assumed:
  1. beats: librosa's beat tracker at the eighth level (start 190, tightness 400), then a constant least-squares fit
     (95.00 BPM, 95% of beats within ~31 ms)
  2. bar phase: the bass (30-120 Hz) drops out on eighths 4-5 of every bar and slams back on eighth 6, the classic "cut on
     4, back on 1", so eighth 6 (mod 8) is the downbeat
  3. phrases: every 4 bars the bar-4 dropouts go deep in two bars running; the slam after the second deep dropout starts a
     phrase. The window starts on one: song 100.947 s ("Nuclear Bomb" then lands on the reel's 60.63 s phrase line)
  4. the ending: the final slam at song 189.37 (a bar line), the cut to black on beat 3 after it

    python analysis/aura_songmap.py
"""
import json, pathlib

import numpy as np
import librosa

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = "out/motion_references/dubplate/e2kIhlfmOJw.wav"
DUR = 90.0


def main():
    y, sr = librosa.load(ROOT / SRC, sr=22050, mono=True)
    env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
    _, beats = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=256, units="time", tightness=400, start_bpm=190)
    beats = np.array(beats); k = np.arange(len(beats))
    (per, off), *_ = np.linalg.lstsq(np.vstack([k, np.ones_like(k)]).T, beats, rcond=None)
    res = beats - (off + per * k)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=128)); f = librosa.fft_frequencies(sr=sr, n_fft=2048)
    t = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=128); low = S[(f > 30) & (f < 120)].sum(0)
    n8 = int((t[-1] - off) / per)
    e8 = np.array([low[(t >= off + i * per) & (t < off + (i + 1) * per)].mean() for i in range(n8)]); e8 /= np.percentile(e8, 95)
    # 2. the bar phase: the eighth (mod 8) where the bass is weakest on average, and the one after it where it slams back
    prof = np.array([e8[p::8].mean() for p in range(8)])
    gap = int(np.argmin(prof)); down = (gap + 2) % 8
    # 3. phrases: bars whose bar-4 dropout is deep (< 0.15), two in a row -> the next bar line starts a phrase
    bars = [i for i in range(n8) if i % 8 == down]
    deep = {b for b in bars if b - 2 >= 0 and e8[b - 2] < 0.15}
    phrase_starts = [b for b in bars if b in deep and (b - 8) in deep]
    i0 = min(phrase_starts, key=lambda b: abs(off + b * per - 100.95)); W0 = off + i0 * per; W1 = W0 + DUR
    r = lambda x: round(float(x - W0), 4)
    st = json.loads((ROOT / "out/motion_references/dubplate/stt.json").read_text(encoding="utf-8"))
    words = [w for w in st.get("words", []) if w.get("type", "word") == "word" and W0 <= w["start"] < W1]
    bar = 8 * per
    bl = [r(off + b * per) for b in bars if W0 - 1e-6 <= off + b * per <= W1 + 1e-6]
    ph = [r(off + b * per) for b in phrase_starts if W0 - 1e-6 <= off + b * per < W1]
    m = {"song": "General Levy - Dubplate (Little Lion Sound upload, youtu.be/e2kIhlfmOJw): a build and sync copy only. Post with Instagram's library 'Dubplate' from %d:%05.2f" % (int(W0 // 60), W0 % 60),
         "source": SRC, "window": [round(W0, 4), round(W1, 4)], "duration": DUR,
         "bpm": round(60 / (2 * per), 3), "eighth": round(per, 7), "beat": round(2 * per, 7), "bar": round(bar, 7),
         "fit_95ms": round(1000 * float(np.percentile(np.abs(res), 95)), 1), "bar_phase": {"gap_eighth": gap, "downbeat_eighth": down, "profile": np.round(prof, 3).tolist()},
         "bars": bl, "phrases": ph,
         "anchors": {"chopper_intro": r(161.6), "chopper_run": [r(162.207), r(172.0)], "gap1": r(off + 591 * per), "bass_back": r(off + 593 * per),
                     "gap2": r(off + 596 * per), "final_slam": r(off + 598 * per), "cut_to_black": r(off + 602 * per)},
         "words": [{"w": w["text"], "t": r(w["start"])} for w in words]}
    (ROOT / "data" / "aura").mkdir(parents=True, exist_ok=True)
    (ROOT / "data" / "aura" / "song_map.json").write_text(json.dumps(m, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"{m['bpm']} BPM, eighth {per:.5f} s, fit 95% within {m['fit_95ms']} ms; bass profile by eighth {m['bar_phase']['profile']} -> gap on {gap}, downbeat {down}")
    print(f"window {m['window']} (post from {m['song'][-7:]}); phrases {ph}")
    print(f"anchors {m['anchors']}")


if __name__ == "__main__":
    main()
