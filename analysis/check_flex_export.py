"""Check a finished Motion Flex export: streams, duration, and that the muxed audio still sits on the cue grid.

  python analysis/check_flex_export.py out/motion-flex_claude_reel.mp4 flex
Writes out/<name>_check.json and prints a summary. Numerical checks only; listening is still the final test.
"""
from pathlib import Path
import json
import subprocess
import sys

import numpy as np

from prepare_motion_music import ffmpeg_binary

ROOT = Path(__file__).resolve().parent.parent


def main():
    video, variant = Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "flex"
    ff = ffmpeg_binary()
    probe = str(Path(ff).with_name("ffprobe.exe" if ff.endswith(".exe") else "ffprobe"))
    info = json.loads(subprocess.run([probe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)],
                                     capture_output=True, text=True).stdout)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    cues = json.loads((ROOT / "data" / variant / "cues.json").read_text(encoding="utf-8"))
    # decode the muxed audio and the source mix; their cross-correlation gives the A/V offset of the file
    def pcm(path, extra=()):
        raw = subprocess.run([ff, "-v", "error", *extra, "-i", str(path), "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], capture_output=True).stdout
        return np.frombuffer(raw, dtype="<f4")
    muxed = pcm(video)
    ref = pcm(ROOT / "audio" / variant / "mix.wav")
    n = min(len(muxed), len(ref), 8000 * 12)
    x, y = muxed[:n] - muxed[:n].mean(), ref[:n] - ref[:n].mean()
    lags = range(-400, 401)
    corr = [float(np.dot(x[max(0, l):n + min(0, l)], y[max(0, -l):n - max(0, l)])) for l in lags]
    lag = list(lags)[int(np.argmax(corr))] / 8000
    report = {
        "file": str(video), "width": v["width"], "height": v["height"], "fps": v["r_frame_rate"], "pix_fmt": v["pix_fmt"],
        "color": [v.get("color_range"), v.get("color_space"), v.get("color_primaries"), v.get("color_transfer")],
        "profile": v.get("profile"), "frames": v.get("nb_frames"), "duration": float(info["format"]["duration"]),
        "audio": a and {"codec": a["codec_name"], "rate": a["sample_rate"], "channels": a["channels"]},
        "expected_duration": cues["duration"], "audio_offset_ms": round(lag * 1000, 2),
        "faststart": None,
        "verdict": "",
    }
    with open(video, "rb") as f:
        head = f.read(64 * 1024)
    report["faststart"] = head.find(b"moov") < head.find(b"mdat") if b"mdat" in head and b"moov" in head else (b"moov" in head)
    ok = abs(report["duration"] - cues["duration"]) < 0.05 and abs(report["audio_offset_ms"]) <= 2 and v["pix_fmt"] == "yuv420p"
    report["verdict"] = "PASS" if ok else "CHECK"
    out = ROOT / "out" / f"{video.stem}_check.json"
    out.write_text(json.dumps(report, indent=1) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()
