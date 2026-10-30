"""Scratch voiceover: speaks SCRIPT with espeak-ng so the plates can be timed before you record.

Replace audio/voiceover.mp3 with your own recording, then re-run align_vo.py and audio_vo.py.
Needs espeak-ng and ffmpeg on PATH.
"""
import re, subprocess, tempfile, wave, pathlib
import numpy as np
from script_vo import SCRIPT, SPOKEN

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "audio" / "voiceover.mp3"
SR = 22050
# pause after each line (s); a longer pause before a new plate's first line
PLATE_FIRST = {4, 8, 14, 18, 22}
SPEED = 178  # words per minute for espeak


def speakable(line):
    toks = [SPOKEN.get(re.sub(r"[^\w.]+$", "", w).rstrip("."), w) if re.sub(r"[^\w.]+$", "", w).rstrip(".") in SPOKEN else w for w in line.split()]
    return " ".join(toks)


def synth(text):
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        subprocess.run(["espeak-ng", "-v", "en-us", "-s", str(SPEED), "-p", "45", "-w", f.name, text], check=True)
        with wave.open(f.name) as w:
            sr = w.getframerate()
            y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if sr != SR:
        y = np.interp(np.linspace(0, len(y), int(len(y) * SR / sr), endpoint=False), np.arange(len(y)), y)
    nz = np.nonzero(np.abs(y) > 0.01)[0]
    return y[nz[0]:nz[-1] + 1] if len(nz) else y


def main():
    parts = [np.zeros(int(0.35 * SR), np.float32)]
    for i, line in enumerate(SCRIPT):
        if i in PLATE_FIRST:
            parts.append(np.zeros(int(0.4 * SR), np.float32))
        parts.append(synth(speakable(line)))
        parts.append(np.zeros(int(0.34 * SR), np.float32))
    parts.append(np.zeros(int(1.2 * SR), np.float32))
    y = np.concatenate(parts)
    y = 0.9 * y / (np.abs(y).max() + 1e-9)
    pcm = (y * 32767).astype(np.int16).tobytes()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                    "-c:a", "libmp3lame", "-b:a", "160k", str(OUT)], input=pcm, check=True)
    print(f"wrote {OUT}  {len(y)/SR:.2f} s")


if __name__ == "__main__":
    main()
