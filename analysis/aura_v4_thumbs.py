"""Thumbnails of the three V4 renders for the outro's 3x3 grid (R01-R06 keep analysis/aura_thumbs.py's): real stills of V4 with
the captions and tags off (VITE_AURA_COVER=1), at moments inside each render's own range. Re-run after a render changes:
    python analysis/aura_v4_thumbs.py
Writes app/public/aura/thumbs/r7.jpg, r8.jpg, r9.jpg (304x540)."""
import pathlib, subprocess, os
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP, OUT, TMP = ROOT / 'app', ROOT / 'app/public/aura/thumbs', ROOT / 'out/wip_aura_v4/thumbs'
AT = {'r7': 11.2, 'r8': 5.8, 'r9': 9.5}


def main():
    OUT.mkdir(parents=True, exist_ok=True); TMP.mkdir(parents=True, exist_ok=True)
    env = dict(os.environ, VITE_VARIANT='aura_v4', VITE_AURA_COVER='1')
    t = ','.join(f'{x:.2f}' for x in AT.values())
    subprocess.run(['bun', 'scripts/render.ts', 'stills', '--variant', 'aura_v4', '--t', t, '--out', str(TMP)], cwd=APP, env=env, check=True, shell=os.name == 'nt')
    for k, x in AT.items(): Image.open(TMP / f'f_{x:07.2f}.png').convert('RGB').resize((304, 540), Image.LANCZOS).save(OUT / f'{k}.jpg', quality=88)
    print('thumbs ->', OUT, [f'{k}.jpg' for k in AT])


if __name__ == '__main__':
    main()
