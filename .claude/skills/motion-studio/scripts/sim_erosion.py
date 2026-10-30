"""Numba example: hydraulic-erosion terrain, precomputed once to an .npz that plates sample by time (seek-safe).

  python sim_erosion.py --out data/<variant>/terrain.npz [--size 256 --drops 60000 --snapshots 12 --seed 7]

Stores `h` (snapshots x size x size float32 heights, from fresh noise to eroded) so a plate can show the land being
carved: pick snapshot floor(u * (n-1)) and blend to the next. Seeded: the same arguments always give the same file.
"""
import argparse, time
import numpy as np
from numba import njit

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--size", type=int, default=256)
ap.add_argument("--drops", type=int, default=60000, help="droplets per snapshot")
ap.add_argument("--snapshots", type=int, default=12)
ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()


def fbm(n, seed, octaves=6):
    rng = np.random.default_rng(seed)
    h = np.zeros((n, n), np.float32)
    for o in range(octaves):
        k = 2 ** (o + 2)
        g = rng.standard_normal((k + 1, k + 1)).astype(np.float32)
        x = np.linspace(0, k, n, endpoint=False)
        i = x.astype(int); f = x - i
        f = f * f * (3 - 2 * f)
        row = g[i][:, i] * (1 - f)[None, :] + g[i][:, i + 1] * f[None, :]
        row2 = g[i + 1][:, i] * (1 - f)[None, :] + g[i + 1][:, i + 1] * f[None, :]
        h += (row * (1 - f)[:, None] + row2 * f[:, None]) / 2 ** o
    return (h - h.min()) / (h.max() - h.min())


@njit(cache=True)
def erode(h, drops, seed, inertia=0.05, capacity=4.0, deposit=0.3, erosion=0.3, evap=0.02, steps=64):
    n = h.shape[0]
    np.random.seed(seed)
    for _ in range(drops):
        x = np.random.random() * (n - 2); y = np.random.random() * (n - 2)
        dx = 0.0; dy = 0.0; vel = 1.0; water = 1.0; sed = 0.0
        for _s in range(steps):
            ix = int(x); iy = int(y); fx = x - ix; fy = y - iy
            h00 = h[iy, ix]; h10 = h[iy, ix + 1]; h01 = h[iy + 1, ix]; h11 = h[iy + 1, ix + 1]
            gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy
            gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
            dx = dx * inertia - gx * (1 - inertia); dy = dy * inertia - gy * (1 - inertia)
            ln = np.sqrt(dx * dx + dy * dy)
            if ln < 1e-9:
                break
            dx /= ln; dy /= ln
            nx = x + dx; ny = y + dy
            if nx < 0 or ny < 0 or nx >= n - 2 or ny >= n - 2:
                break
            old = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
            jx = int(nx); jy = int(ny); gfx = nx - jx; gfy = ny - jy
            new = (h[jy, jx] * (1 - gfx) * (1 - gfy) + h[jy, jx + 1] * gfx * (1 - gfy)
                   + h[jy + 1, jx] * (1 - gfx) * gfy + h[jy + 1, jx + 1] * gfx * gfy)
            dh = new - old
            cap = max(-dh * vel * water * capacity, 0.0001)
            if sed > cap or dh > 0:
                amt = min(dh, sed) if dh > 0 else (sed - cap) * deposit
                sed -= amt
                h[iy, ix] += amt * (1 - fx) * (1 - fy); h[iy, ix + 1] += amt * fx * (1 - fy)
                h[iy + 1, ix] += amt * (1 - fx) * fy; h[iy + 1, ix + 1] += amt * fx * fy
            else:
                amt = min((cap - sed) * erosion, -dh)
                sed += amt
                h[iy, ix] -= amt * (1 - fx) * (1 - fy); h[iy, ix + 1] -= amt * fx * (1 - fy)
                h[iy + 1, ix] -= amt * (1 - fx) * fy; h[iy + 1, ix + 1] -= amt * fx * fy
            vel = np.sqrt(max(vel * vel + dh * -4.0, 0.0)); water *= 1 - evap
            x = nx; y = ny
    return h


t0 = time.time()
h = fbm(a.size, a.seed)
snaps = [h.copy()]
for s in range(1, a.snapshots):
    h = erode(h, a.drops, a.seed * 1000 + s)
    snaps.append(h.copy())
np.savez_compressed(a.out, h=np.stack(snaps).astype(np.float32))
print(f"{a.snapshots} snapshots of {a.size}^2 -> {a.out} in {time.time() - t0:.1f} s")
