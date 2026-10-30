"""The Editor's Aura V2 cover (1080x1920 + a 4:5 crop): the programmer from V2's stock-footage opening (Mixkit 41650 at 2.0 s,
Free License, a 9:16 crop around his face), with the glowing timeline and the title, as V1's cover (aura_cover.py).
(The 51.6 s cut's cover used a clean engine still of the masked intro: VITE_AURA_COVER=1, see intro_v2.ts.)
    python analysis/aura_cover_v2.py
    python analysis/aura_cover_v2.py v3   (V3: the side shot from the user's frame, backshot frame 148, no face reveal)
"""
import math, pathlib
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent.parent
O = ROOT / "projects/editors-aura/output/v2"
F = lambda w, wt, s: ImageFont.truetype(str(ROOT / f"app/public/fonts/Archivo-w{w}-{wt}.ttf"), s)
TEAL, VIOLET, AMBER, LIME, TEXT = (63, 214, 224), (155, 123, 255), (255, 181, 71), (200, 243, 29), (232, 238, 246)


def main():
    import sys
    v3 = len(sys.argv) > 1 and sys.argv[1] == "v3"
    W, H = 1080, 1920
    import subprocess
    src = ROOT / "out/wip_aura_v2/cover/f_stock.png"; src.parent.mkdir(parents=True, exist_ok=True)
    if v3: src = ROOT / "app/public/aura/frames/ph/00148.jpg"
    else: subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "2.0", "-i", str(ROOT / "projects/editors-aura/references/stock/free720/mixkit_41650.mp4"),
                          "-frames:v", "1", "-vf", "crop=405:720:144:0,scale=608:1080:flags=lanczos", str(src)], check=True)
    bg = Image.open(src).convert("RGB").resize((W, H), Image.LANCZOS)
    bg = ImageEnhance.Contrast(bg.filter(ImageFilter.UnsharpMask(2, 70, 2))).enhance(1.06)
    shifted = Image.new("RGB", (W, H), (3, 4, 6)); shifted.paste(bg, (0, 150)); bg = shifted
    sh = Image.new("L", (W, H), 0); d = ImageDraw.Draw(sh)
    for y in range(H): d.line([(0, y), (W, y)], fill=int(min(235, max(0.0, 1 - y / 640) * 230 + max(0.0, (y - 1520) / 400) * 210)))
    bg = Image.composite(Image.new("RGB", (W, H), (3, 4, 6)), bg, sh)
    tl = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(tl); CX = W / 2
    proj = lambda x, y: (CX + (x - CX) * (0.86 + 0.28 * (y - 1260) / 420), y)
    rows = [[(0, 210), (230, 420), (440, 700), (720, 980)], [(60, 300), (330, 520), (560, 1000)], [(0, 150), (170, 520), (540, 760), (790, 1060)], [(100, 380), (400, 640), (680, 900)], [(0, 1080)]]
    for r, row in enumerate(rows):
        y0 = 1270 + r * 58
        for a, b in row:
            (x0, _), (x1, _) = proj(a, y0), proj(b, y0)
            if r == 4:
                for xx in range(int(x0) + 4, int(x1) - 4, 6): v = 10 + 16 * abs(math.sin(xx * 0.05) * math.cos(xx * 0.013)); d.rectangle([xx, y0 + 22 - v, xx + 3, y0 + 22 + v], fill=(67, 213, 138))
            else: d.rounded_rectangle([x0 + 3, y0, x1 - 3, y0 + 42], 10, fill=tuple(int(c * 0.55) for c in [TEAL, VIOLET, AMBER, LIME][r]), outline=[TEAL, VIOLET, AMBER, LIME][r], width=3)
    d.rectangle([CX + 120, 1232, CX + 126, 1565], fill=AMBER); d.polygon([(CX + 108, 1222), (CX + 138, 1222), (CX + 123, 1244)], fill=AMBER)
    img = ImageChops.screen(bg, ImageEnhance.Brightness(tl.filter(ImageFilter.GaussianBlur(22))).enhance(1.8)); img = ImageChops.screen(img, tl.filter(ImageFilter.GaussianBlur(6))); img = ImageChops.screen(img, tl)
    d = ImageDraw.Draw(img)
    def ctext(s, y, font, fill, track=0):
        w = sum(font.getlength(ch) for ch in s) + track * (len(s) - 1); x = (W - w) / 2
        for ch in s: d.text((x, y), ch, font=font, fill=fill); x += font.getlength(ch) + track
    ctext("OPUS 5.5", 130, F(1000, 700, 40), TEXT, 10)
    ctext("THE EDITOR’S", 190, F(1250, 900, 112), TEXT, 2)
    ctext("AURA", 298, F(1250, 900, 250), TEAL, 6)
    ctext(("7" if v3 else "6") + " RENDERS · ALL CODE", 578, F(1000, 700, 44), TEXT, 6)
    ctext("I DON’T JUST EDIT VIDEOS. I BUILD THEM.", 1600, F(1000, 700, 34), (210, 218, 228), 2)
    d.text((W - 300, H - 54), "AI backshot · placeholder" if v3 else "stock footage · Mixkit", font=F(1000, 500, 22), fill=(150, 158, 170))
    out, nm = (ROOT / "projects/editors-aura/output/v3", "aura_v3") if v3 else (O, "aura_v2")
    out.mkdir(parents=True, exist_ok=True)
    img.save(out / f"{nm}_cover.jpg", quality=92)
    img.crop((0, (H - 1350) // 2 - 180, W, (H - 1350) // 2 - 180 + 1350)).save(out / f"{nm}_cover_4x5.jpg", quality=92)
    print("cover ->", out / f"{nm}_cover.jpg")


if __name__ == "__main__":
    main()
