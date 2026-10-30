"""Motion curves as NumPy: quintic eases, damped springs, arcs and beat grids. Pure functions of t (seek-safe).

  from motion import quintic_in_out, land, leave, spring, arc, beat_grid, dotted_eighths
  y = spring(t - t0, freq=2.2, damping=0.45)       # 0 -> 1 with overshoot, settles
  p = arc(p0, p1, u, lift=0.2)                     # a flight that bulges toward the lens / up

Port the same formulas into TypeScript plates (Remotion kit.tsx, app/src/scenes/_vo.ts) when needed. Keep the numbers.
"""
import numpy as np


def clamp01(u):
    return np.clip(u, 0.0, 1.0)


def quintic_in_out(u):
    u = clamp01(u)
    return np.where(u < 0.5, 16 * u ** 5, 1 - (-2 * u + 2) ** 5 / 2)


def land(u):  # decelerate into place (ease-out quint)
    u = clamp01(u)
    return 1 - (1 - u) ** 5


def leave(u):  # accelerate away (ease-in quint)
    return clamp01(u) ** 5


def spring(t, freq=2.0, damping=0.5):
    """Damped spring from 0 to 1, t in seconds since the trigger (0 before it). freq in Hz, damping 0..1 (1 = no overshoot)."""
    t = np.maximum(np.asarray(t, float), 0.0)
    w = 2 * np.pi * freq
    if damping >= 1:
        return 1 - (1 + w * t) * np.exp(-w * t)
    wd = w * np.sqrt(1 - damping ** 2)
    return 1 - np.exp(-damping * w * t) * (np.cos(wd * t) + damping * w / wd * np.sin(wd * t))


def overshoot_peak(freq=2.0, damping=0.5):
    """Peak value of spring(): use it to check an overshoot is small for micro UI (~1.05) and bigger for mascots (~1.16 at damping 0.5)."""
    return 1 + np.exp(-np.pi * damping / np.sqrt(1 - damping ** 2)) if damping < 1 else 1.0


def arc(p0, p1, u, lift=0.2, axis=1):
    """Point on a flight from p0 to p1 (arrays), eased quintic, bulging by `lift` x distance along `axis`."""
    p0, p1 = np.asarray(p0, float), np.asarray(p1, float)
    e = quintic_in_out(u)
    p = p0 + (p1 - p0) * np.asarray(e)[..., None]
    bump = 4 * e * (1 - e) * lift * np.linalg.norm(p1 - p0)
    p[..., axis] += bump
    return p


def beat_grid(bpm, start=0.0, end=60.0, div=1):
    """Beat times from start to end; div=2 gives 8ths, 4 gives 16ths. Use a MEASURED bpm and start for real songs."""
    step = 60.0 / bpm / div
    return np.arange(start, end + 1e-9, step)


def dotted_eighths(bpm, start, n):
    """n events on dotted 8ths (0.75 beat apart): the pack's 'racing the music' rhythm (0.375 s at 120 BPM)."""
    return start + np.arange(n) * 0.75 * 60.0 / bpm


def frame_of(t, fps=60):
    return np.round(np.asarray(t) * fps).astype(int)


if __name__ == "__main__":
    print("spring peak  micro UI (3.0 Hz, 0.7):", round(overshoot_peak(3.0, 0.7), 3), "  mascot (2.0 Hz, 0.5):", round(overshoot_peak(2.0, 0.5), 3))
    print("dotted 8ths at 120 BPM from 2.125 s:", dotted_eighths(120, 2.125, 4), "-> frames", frame_of(dotted_eighths(120, 2.125, 4)))
