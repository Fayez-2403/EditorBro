"""Shared helpers: decode audio with ffmpeg, tokenise the script."""
import os, re, subprocess, pathlib, shutil, glob
import numpy as np

if not shutil.which("ffmpeg"):
    candidates = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if candidates:
        os.environ["PATH"] = candidates[0] + os.pathsep + os.environ.get("PATH", "")

ROOT = pathlib.Path(__file__).resolve().parent.parent
# VARIANT=reel reads audio/reel/voiceover.mp3 and writes data/reel/*.json (unset: the 16:9 video)
VARIANT = os.environ.get("VARIANT", "")
VO = ROOT / "audio" / VARIANT / "voiceover.mp3"
DATA = ROOT / "data" / VARIANT


def load_audio(path=VO, sr=16000):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(sr), "pipe:1"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy(), sr


def core(word):
    """A display token without trailing punctuation: 'hai.' -> 'hai', '0.85.' -> '0.85'."""
    return re.sub(r"[,.!?;:…]+$", "", word)


def spoken_tokens(word, spoken):
    c = core(word)
    s = spoken.get(c, c)
    return [t for t in re.sub(r"[^a-z' ]", " ", s.lower()).split() if t]
