"""The cover for the Claude reveals reel -> projects/claude-reveals/output/reveals_thumbnail.png (1080x1920).

The actor's biggest "WHAAAAAATTTTT?!" frame (a 2x still of the reel at --t, the base) with five floating project previews
(real frames of the creators' excerpts, fitted whole, numbered 01-05) and the title. Everything that matters sits inside the
3:4 profile-grid crop (y 240-1680).

    python analysis/reveals_cover.py <still_2x.png>
"""
import json, pathlib, sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / "app" / "public" / "fonts"
media = json.loads((ROOT / "data" / "reveals" / "media.json").read_text())
LIME, NIGHT, WHITE = (200, 243, 29), (6, 6, 11), (247, 245, 255)


def frame(k, t):
    m = media[k]; i = max(0, min(m["n"] - 1, int(t * m["fps"])))
    return Image.open(ROOT / "app" / "public" / m["dir"] / f"{i:05d}.{m['ext']}").convert("RGB")


def card(im, w, n, rot):
    h = round(w * im.height / im.width); im = im.resize((w, h), Image.LANCZOS)
    pad = 8; c = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (*WHITE, 255)); c.paste(im, (pad, pad))
    d = ImageDraw.Draw(c); f = ImageFont.truetype(str(FONTS / "Archivo-w1250-900.ttf"), 30)
    d.rounded_rectangle((pad - 2, pad - 2, pad + 78, pad + 40), 10, fill=(*LIME, 255)); d.text((pad + 9, pad + 2), f"0{n}", font=f, fill=NIGHT)
    c = c.rotate(rot, expand=True, resample=Image.BICUBIC)
    sh = Image.new("RGBA", (c.width + 60, c.height + 60), (0, 0, 0, 0)); sh.paste((0, 0, 0, 170), (30, 38), c)
    sh = sh.filter(ImageFilter.GaussianBlur(14)); sh.alpha_composite(c, (30, 30)); return sh


def main():
    base = Image.open(sys.argv[1]).convert("RGB").resize((1080, 1920), Image.LANCZOS).convert("RGBA")
    # five previews around his face (key frames: the fire, the board, the font, the field, the heart)
    picks = [(1, "A", 4.0, 300, 4, (30, 560)), (3, "C2", 4.5, 280, -4, (36, 1060)), (2, "B", 6.0, 300, -5, (40, 1300)),
             (4, "D", 6.0, 300, 3, (390, 1340)), (5, "E", 6.0, 300, -3, (740, 1300))]   # n = the reveal's number
    for n, k, t, w, rot, (x, y) in picks:
        c = card(frame(k, t), w, n, rot); base.alpha_composite(c, (x - 30, y - 30))
    d = ImageDraw.Draw(base)
    f1 = ImageFont.truetype(str(FONTS / "Archivo-w1250-900.ttf"), 92); f2 = ImageFont.truetype(str(FONTS / "Archivo-w1000-900.ttf"), 40)
    def centered(s, y, f, fill, box=None):
        w = d.textlength(s, font=f); x = (1080 - w) / 2
        if box: d.rounded_rectangle((x - 26, y - 14, x + w + 26, y + f.size + 18), 22, fill=box)
        if not box: d.text((x + 5, y + 6), s, font=f, fill=(0, 0, 0))   # a hard shadow, except on a boxed tag
        d.text((x, y), s, font=f, fill=fill)
    centered("5 INSANE", 262, f1, WHITE); centered("CLAUDE BUILDS", 362, f1, LIME)
    centered("REAL PROJECTS · ORIGINAL VIDEOS", 1600, f2, NIGHT, box=LIME)
    f3 = ImageFont.truetype(str(FONTS / "Archivo-w1000-500.ttf"), 26)
    s = "Featured by @claudeai · creators credited"; d.text(((1080 - d.textlength(s, font=f3)) / 2, 1700), s, font=f3, fill=(200, 198, 215))
    out = ROOT / "projects" / "claude-reveals" / "output" / "reveals_thumbnail.png"
    base.convert("RGB").save(out); print("wrote", out)


if __name__ == "__main__":
    main()
