"""Thumbnails of the six Editor's Aura renders for the reel's own editor (its timeline filmstrips and the contact sheet in the
fix scene). They are real stills of the renders, made by the engine (app/scripts/render.ts stills), so re-run this after a
render changes:  python analysis/aura_thumbs.py
Writes app/public/aura/thumbs/r1..r6.jpg (304x540), sheet_0..7.jpg (Render 04 frames) and keeps r4_artifact.jpg (a real frame
of Render 04 from before its reflection fix, out/wip_aura/r4/f_0055.40.png, when that file exists)."""
import pathlib, shutil, subprocess, os
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
APP, OUT = ROOT / 'app', ROOT / 'app/public/aura/thumbs'
TMP = ROOT / 'out/wip_aura/thumbs'
HERO = {'r1': 25.6, 'r2': 34.3, 'r3': 43.1, 'r4': 56.4, 'r5': 67.9, 'r6': 78.9}
SHEET = [50.6, 51.3, 51.9, 52.6, 54.7, 55.4, 56.4, 57.8]   # Render 04: macro, lock, hero, reflect

def stills(times):
    env = dict(os.environ, VITE_VARIANT='aura')
    t = ','.join(f'{x:.2f}' for x in times)
    subprocess.run(['bun', 'scripts/render.ts', 'stills', '--variant', 'aura', '--t', t, '--out', str(TMP)], cwd=APP, env=env, check=True, shell=os.name == 'nt')

def main():
    OUT.mkdir(parents=True, exist_ok=True); TMP.mkdir(parents=True, exist_ok=True)
    stills(list(HERO.values()) + SHEET)
    def save(t, name):
        Image.open(TMP / f'f_{t:07.2f}.png').convert('RGB').resize((304, 540), Image.LANCZOS).save(OUT / name, quality=88)
    for k, t in HERO.items(): save(t, f'{k}.jpg')
    for i, t in enumerate(SHEET): save(t, f'sheet_{i}.jpg')
    art = ROOT / 'out/wip_aura/r4/f_0055.40.png'
    if art.exists(): Image.open(art).convert('RGB').resize((304, 540), Image.LANCZOS).save(OUT / 'r4_artifact.jpg', quality=88)
    print('thumbs ->', OUT, sorted(p.name for p in OUT.iterdir()))

if __name__ == '__main__':
    main()
