"""THE ACTUAL AUDIO FILE IS THE TIMELINE. Analyse the exact supplied track (or the final mix) into audio/beats.json.

  python scripts/analyze_audio.py audio/music.wav [--offset 0.0] [--vocals audio/vocals.wav] [--out audio/beats.json]

Writes the master-studio fields: tempo_estimate, tempo_confidence, beat_times, downbeat_times, transient_times,
vocal_attack_times, phrase_boundaries, scene_anchors, sfx_cues, audio_start_offset_seconds (+ the frame of each, at 60 fps).
The beat grid is a HYPOTHESIS: check the downbeats by ear (play a click over them, --click writes audio/beats_click.wav),
note half-time feel, and fix downbeat_phase in the file if bar 1 is wrong. Never invent a BPM for a song.
"""
import argparse, json, pathlib
import numpy as np
import librosa
import soundfile as sf

ap = argparse.ArgumentParser()
ap.add_argument("audio")
ap.add_argument("--offset", type=float, default=0.0, help="seconds into the file where the film's audio starts")
ap.add_argument("--vocals", default=None, help="an isolated vocal/VO stem for vocal attacks (else onsets of the full mix above 1 kHz)")
ap.add_argument("--out", default=None)
ap.add_argument("--beats-per-bar", type=int, default=4)
ap.add_argument("--click", action="store_true", help="also write audio/beats_click.wav: the track with clicks on beats (louder on downbeats)")
a = ap.parse_args()

FPS = 60
src = pathlib.Path(a.audio)
out = pathlib.Path(a.out) if a.out else src.parent / "beats.json"
y, sr = librosa.load(src, sr=44100, mono=True, offset=a.offset)
hop = 512

# tempo + beats (dynamic programming tracker); confidence = how peaked the tempogram is at the chosen tempo
onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop, units="time")
tempo = float(np.atleast_1d(tempo)[0])
tg = librosa.autocorrelate(onset, max_size=len(onset))
lag = int(round(60 / tempo * sr / hop))
conf = float(tg[lag] / (tg[1:].max() + 1e-9)) if 0 < lag < len(tg) else 0.0

# downbeats: the beat phase whose beats carry the most low-end energy (kick on 1) -- a hypothesis to verify by ear
S = np.abs(librosa.stft(y, hop_length=hop)); low = S[librosa.fft_frequencies(sr=sr) < 150].sum(axis=0)
bf = librosa.time_to_frames(beats, sr=sr, hop_length=hop).clip(0, len(low) - 1)
phase = int(np.argmax([low[bf[p::a.beats_per_bar]].mean() if len(bf[p::a.beats_per_bar]) else 0 for p in range(a.beats_per_bar)]))
downbeats = beats[phase::a.beats_per_bar]

transients = librosa.onset.onset_detect(onset_envelope=onset, sr=sr, hop_length=hop, units="time", backtrack=True)
if a.vocals:
    yv, _ = librosa.load(a.vocals, sr=sr, mono=True, offset=a.offset)
else:
    yv = librosa.effects.preemphasis(y)  # tilt toward the vocal / attack band
vocal = librosa.onset.onset_detect(y=yv, sr=sr, hop_length=hop, units="time", backtrack=True, delta=0.12)

# phrase boundaries: structural changes (chroma + MFCC novelty), snapped to the nearest downbeat
feat = np.vstack([librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop), librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)])
k = max(2, min(12, int(len(y) / sr / 8)))
bounds = librosa.frames_to_time(librosa.segment.agglomerative(feat, k), sr=sr, hop_length=hop)
snap = lambda t: float(downbeats[np.argmin(np.abs(downbeats - t))]) if len(downbeats) else float(t)
phrases = sorted({round(snap(t), 3) for t in bounds})

r = lambda v: [round(float(t), 3) for t in v]
fr = lambda v: [int(round(float(t) * FPS)) for t in v]
data = {
    "_doc": "Measured from the actual file by scripts/analyze_audio.py. Times in seconds from audio_start_offset_seconds; *_frames at 60 fps. "
            "Beat grid = hypothesis: verify downbeats by ear (--click), then fill scene_anchors / sfx_cues by hand from these lists.",
    "source": str(src).replace("\\", "/"), "duration": round(len(y) / sr, 3), "audio_start_offset_seconds": a.offset,
    "tempo_estimate": round(tempo, 2), "tempo_confidence": round(conf, 3), "beats_per_bar": a.beats_per_bar, "downbeat_phase": phase,
    "beat_times": r(beats), "downbeat_times": r(downbeats), "transient_times": r(transients), "vocal_attack_times": r(vocal),
    "phrase_boundaries": phrases,
    "beat_frames": fr(beats), "downbeat_frames": fr(downbeats), "phrase_frames": fr(phrases),
    "scene_anchors": [], "sfx_cues": [],
}
out.write_text(json.dumps(data, indent=1), encoding="utf-8")
print(f"{src.name}: {data['duration']} s, tempo ~{tempo:.1f} BPM (confidence {conf:.2f}), {len(beats)} beats, {len(downbeats)} downbeats "
      f"(phase {phase}), {len(transients)} transients, {len(vocal)} vocal attacks, {len(phrases)} phrase boundaries -> {out}")
if conf < 0.5:
    print("  LOW CONFIDENCE: check half/double time by ear before cutting to this grid")
if a.click:
    clk = librosa.clicks(times=beats, sr=sr, length=len(y), click_freq=1500) * 0.5 + librosa.clicks(times=downbeats, sr=sr, length=len(y), click_freq=3000)
    sf.write(out.parent / "beats_click.wav", np.stack([y * 0.7 + clk * 0.6] * 2, axis=1), sr)
    print(f"  click track -> {out.parent / 'beats_click.wav'} (listen: are the high clicks on bar 1?)")
