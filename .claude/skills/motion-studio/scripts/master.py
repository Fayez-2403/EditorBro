"""Master a mix with Pedalboard + pyloudnorm (the pack's master chain), as an alternative to ffmpeg loudnorm.

  python master.py mix_raw.wav mix.wav [--lufs -14] [--tp -2.0]

Chain: peak-normalise to -4 dBFS -> gentle compressor (2:1, -18 dB, 15/120 ms) -> +8 dB -> limiter -> gain to the
LUFS target -> a final true-peak trim (4x oversampled) so the peak stays under --tp. Prints integrated LUFS and peak.
"""
import argparse
import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from pedalboard import Compressor, Gain, Limiter, Pedalboard
from scipy.signal import resample_poly

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("dst")
ap.add_argument("--lufs", type=float, default=-14.0)
ap.add_argument("--tp", type=float, default=-2.0)
a = ap.parse_args()

x, sr = sf.read(a.src, always_2d=True, dtype="float32")
x = x * (10 ** (-4 / 20) / (np.abs(x).max() + 1e-12))
board = Pedalboard([Compressor(threshold_db=-18, ratio=2, attack_ms=15, release_ms=120), Gain(8), Limiter(threshold_db=-1.0, release_ms=80)])
y = board(x.T, sr).T

meter = pyln.Meter(sr)
y = pyln.normalize.loudness(y, meter.integrated_loudness(y), a.lufs)
tp = lambda s: 20 * np.log10(np.abs(resample_poly(s, 4, 1, axis=0)).max() + 1e-12)
# trim through the limiter rather than clipping. Pedalboard's Limiter (JUCE) adds make-up gain equal to its threshold,
# so after each pass re-measure and re-normalise; repeat until both the LUFS target and the true-peak ceiling hold.
for _ in range(4):
    if tp(y) <= a.tp:
        break
    y = Pedalboard([Limiter(threshold_db=a.tp - 0.3, release_ms=60)])(y.T.astype(np.float32), sr).T
    y = pyln.normalize.loudness(y, meter.integrated_loudness(y), a.lufs)
if tp(y) > a.tp:  # last resort: lower the whole file to the ceiling (the LUFS then lands slightly under target)
    y = y * 10 ** ((a.tp - 0.1 - tp(y)) / 20)
sf.write(a.dst, y, sr, subtype="PCM_24")
print(f"{a.dst}: {meter.integrated_loudness(y):.1f} LUFS, true peak {tp(y):.1f} dBTP")
