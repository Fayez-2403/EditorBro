"""The Editor's Aura intro (reel 0-10.105 s): the Dhurandhar title track, the user's pick (2026-10-22): "Ladies and gentlemen, you
are not ready for this." Source: the Saregama Music upload "Dhurandhar - Title Track Video" (youtu.be/7IBDa53IsvI), the line at
0:12. That copy is only for building and syncing (like the Dubplate copy); see projects/editors-aura/PLAN.md for posting.

The intro has no steady beat to fit (a sub drone and hits under the spoken line, then a groove), so the cuts go on what is
measured: the words (local speech-to-text, faster-whisper base, out/motion_references/dhurandhar/stt_video.json) and the
strongest onsets after the line, each snapped to its onset peak. The window starts 0.36 s before "Ladies" and runs one reel
phrase (10.105 s) so Dubplate takes over on its own phrase-line slam at 10.105 s (data/aura/song_map.json).
Writes data/aura/intro.json.
    python analysis/aura_intro.py
"""
import json, pathlib
import numpy as np
import librosa

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "out/motion_references/dhurandhar/7IBDa53IsvI.wav"
STT = ROOT / "out/motion_references/dhurandhar/stt_video.json"
S0 = 11.90                     # source time at reel 0
HITS = [16.05, 16.62, 18.94, 19.90, 21.39]   # the strongest accents after the line (onset strength 3-4.6, analysis below)


def main():
    SM = json.loads((ROOT / "data/aura/song_map.json").read_text(encoding="utf-8"))
    dur = SM["phrases"][1]   # the reel's first phrase: Dubplate takes over on the phrase line
    y, sr = librosa.load(SRC, sr=22050, mono=True, offset=S0 - 1, duration=dur + 2)
    H = 128; o = librosa.onset.onset_strength(y=y, sr=sr, hop_length=H); t = librosa.frames_to_time(np.arange(len(o)), sr=sr, hop_length=H) + S0 - 1
    def snap(x, w=0.06):
        m = (t >= x - w) & (t <= x + w); i = np.argmax(np.where(m, o, -1)); return float(t[i])
    hits = [round(snap(h) - S0, 4) for h in HITS]
    line = next(s for s in json.loads(STT.read_text()) if "Ladies" in s["text"])
    words = [{"w": w["w"].strip(" ,."), "t": round(w["s"] - S0, 3), "end": round(w["e"] - S0, 3)} for w in line["words"]]
    out = {"source": str(SRC.relative_to(ROOT)).replace("\\", "/"), "url": "https://youtu.be/7IBDa53IsvI (Saregama Music, 'Dhurandhar - Title Track Video')",
           "s0": S0, "duration": dur, "line": line["text"].strip(), "words": words, "hits": hits,
           "xfade": {"dh_lowpass_from": hits[-1], "dub_in_from": round(dur - SM["beat"], 4), "slam": dur, "dh_gone": round(dur + 0.2, 4)},
           "notes": "cuts on the measured words and hits (no fitted grid: the intro is rubato); Dubplate enters on its phrase line"}
    (ROOT / "data/aura/intro.json").write_text(json.dumps(out, indent=1))
    print(f"intro: source {S0:.2f}-{S0 + dur:.2f} s; words {[(w['w'], w['t']) for w in words]}; hits {hits}")


if __name__ == "__main__":
    main()
