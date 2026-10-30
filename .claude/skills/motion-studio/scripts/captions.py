"""Captions from the voice track with faster-whisper (local, free). A second opinion next to ElevenLabs Scribe.

  python captions.py voiceover.mp3 --out captions [--model small] [--lang hi|en] [--prompt "Tech पे Trek, Genie 4"]

Writes <out>.words.json ({word, start, end}) and <out>.srt (lines of up to 6 words, broken on pauses > 0.35 s).
The first run downloads the model (small is ~460 MB) into the Hugging Face cache. CPU, int8.
"""
import argparse, json, subprocess
import numpy as np
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("audio"); ap.add_argument("--out", default="captions")
ap.add_argument("--model", default="small"); ap.add_argument("--lang", default=None)
ap.add_argument("--prompt", default=None, help="names and terms to bias the decoder toward")
a = ap.parse_args()

model = WhisperModel(a.model, device="cpu", compute_type="int8")
# decode with ffmpeg (16 kHz mono float) instead of faster-whisper's PyAV path, which breaks on some av versions
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
segs, info = model.transcribe(np.frombuffer(pcm, np.float32), language=a.lang, word_timestamps=True, initial_prompt=a.prompt, vad_filter=True)
words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in s.words]
json.dump(words, open(f"{a.out}.words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

def ts(t):
    h, r = divmod(t, 3600); m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{int(s):02},{int(round((s % 1) * 1000)):03}"

lines, cur = [], []
for w in words:
    if cur and (len(cur) >= 6 or w["start"] - cur[-1]["end"] > 0.35):
        lines.append(cur); cur = []
    cur.append(w)
if cur: lines.append(cur)
with open(f"{a.out}.srt", "w", encoding="utf-8") as f:
    for i, l in enumerate(lines, 1):
        f.write(f"{i}\n{ts(l[0]['start'])} --> {ts(l[-1]['end'])}\n{' '.join(w['word'] for w in l)}\n\n")
print(f"{info.language} ({info.language_probability:.2f}): {len(words)} words, {len(lines)} lines -> {a.out}.srt")
