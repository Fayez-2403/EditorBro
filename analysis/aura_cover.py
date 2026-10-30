"""The Editor's Aura thumbnail / reel cover (1080x1920): the protagonist at the desk (the user's placeholder backshot, first 10 s,
an AI clip) with a glowing timeline in front of him, the title in the reel's own type (Archivo). Writes
projects/editors-aura/output/aura_cover.jpg (and _4x5.jpg, the grid crop).
    python analysis/aura_cover.py
"""
import pathlib
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageEnhance, ImageChops

ROOT = pathlib.Path(__file__).resolve().parent.parent
O = ROOT / "projects/editors-aura/output"
F = lambda w, wt, s: ImageFont.truetype(str(ROOT / f"app/public/fonts/Archivo-w{w}-{wt}.ttf"), s)
TEAL, VIOLET, AMBER, LIME, TEXT = (63, 214, 224), (155, 123, 255), (255, 181, 71), (200, 243, 29), (232, 238, 246)


def main():
    W, H = 1080, 1920
    bg = Image.open(ROOT / "app/public/aura/frames/ph/00096.jpg").convert("RGB").resize((W, H), Image.LANCZOS)   # 3.2 s: at the desk
    bg = ImageEnhance.Contrast(bg.filter(ImageFilter.UnsharpMask(2, 80, 2))).enhance(1.08)
    shifted = Image.new("RGB", (W, H), (3, 4, 6)); shifted.paste(bg, (0, 170)); bg = shifted   # the face sits clear of the title
    # darken the top (title) and the bottom (Instagram's caption zone)
    sh = Image.new("L", (W, H), 0); d = ImageDraw.Draw(sh)
    for y in range(H):
        a = max(0.0, 1 - y / 700) * 225 + max(0.0, (y - 1500) / 420) * 200
        d.line([(0, y), (W, y)], fill=int(min(235, a)))
    bg = Image.composite(Image.new("RGB", (W, H), (3, 4, 6)), bg, sh)
    # the glowing timeline: five tracks of clips in perspective, a playhead
    tl = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(tl)
    cols = [TEAL, VIOLET, AMBER, LIME, TEAL]
    clips = [[(0, 210), (230, 420), (440, 700), (720, 980)], [(60, 300), (330, 520), (560, 1000)], [(0, 150), (170, 520), (540, 760), (790, 1060)],
             [(100, 380), (400, 640), (680, 900)], [(0, 1080)]]
    def proj(x, y):   # a gentle perspective: rows nearer the bottom are wider
        k = (y - 1240) / 420; s = 0.86 + 0.28 * k; return CX + (x - CX) * s, y
    CX = W / 2
    for r, row in enumerate(clips):
        y0 = 1250 + r * 60
        for a, b in row:
            (x0, _), (x1, _) = proj(a, y0), proj(b, y0)
            if r == 4:   # the music: a waveform
                for xx in range(int(x0) + 4, int(x1) - 4, 6):
                    import math
                    v = 10 + 16 * abs(math.sin(xx * 0.05) * math.cos(xx * 0.013)); d.rectangle([xx, y0 + 22 - v, xx + 3, y0 + 22 + v], fill=(67, 213, 138))
            else:
                d.rounded_rectangle([x0 + 3, y0, x1 - 3, y0 + 44], 10, fill=tuple(int(c * 0.55) for c in cols[r]), outline=cols[r], width=3)
    d.rectangle([CX + 120, 1212, CX + 126, 1555], fill=AMBER); d.polygon([(CX + 108, 1202), (CX + 138, 1202), (CX + 123, 1224)], fill=AMBER)
    glow = tl.filter(ImageFilter.GaussianBlur(22)); glow2 = tl.filter(ImageFilter.GaussianBlur(6))
    img = ImageChops.screen(bg, ImageEnhance.Brightness(glow).enhance(1.8)); img = ImageChops.screen(img, glow2); img = ImageChops.screen(img, tl)
    d = ImageDraw.Draw(img)
    def ctext(s, y, font, fill, track=0):
        w = sum(font.getlength(ch) for ch in s) + track * (len(s) - 1); x = (W - w) / 2
        for ch in s: d.text((x, y), ch, font=font, fill=fill); x += font.getlength(ch) + track
    ctext("OPUS 5.5", 150, F(1000, 700, 40), TEXT, 10)
    ctext("THE EDITOR’S", 210, F(1250, 900, 112), TEXT, 2)
    ctext("AURA", 318, F(1250, 900, 250), TEAL, 6)
    ctext("6 RENDERS · ALL CODE", 598, F(1000, 700, 44), TEXT, 6)
    ctext("I DON’T JUST EDIT VIDEOS. I BUILD THEM.", 1585, F(1000, 700, 34), (210, 218, 228), 2)
    d.text((W - 260, H - 54), "AI backshot · placeholder", font=F(1000, 500, 22), fill=(150, 158, 170))
    O.mkdir(parents=True, exist_ok=True)
    img.save(O / "aura_cover.jpg", quality=92)
    img.crop((0, (H - 1350) // 2 - 180, W, (H - 1350) // 2 - 180 + 1350)).save(O / "aura_cover_4x5.jpg", quality=92)
    print("cover ->", O / "aura_cover.jpg")


if __name__ == "__main__":
    main()
