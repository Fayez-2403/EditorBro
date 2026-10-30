"""ReportLab: build a prompt-pack / carousel PDF (a lead magnet for "comment X and I'll DM the PDF").

  python pack_pdf.py pack.json out/pack.pdf

pack.json:
{ "title": "Genie 4: 5 prompts", "brand": "Tech पे Trek", "accent": "#E0177A", "size": "A4" | "1080x1350",
  "pages": [ { "h": "Heading", "body": "Paragraph text. Blank line = new paragraph.", "code": "optional copy-ready block",
               "image": "optional/path.png" } ] }
Fonts: Inter and JetBrains Mono from app/public/fonts if present (Devanagari needs a font that has it, e.g. Noto Sans
Devanagari; otherwise keep the PDF text in Roman Hinglish).
"""
import json, sys
from pathlib import Path
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit

spec = json.load(open(sys.argv[1], encoding="utf-8"))
out = Path(sys.argv[2]); out.parent.mkdir(parents=True, exist_ok=True)
W, H = (A4 if spec.get("size", "A4") == "A4" else tuple(float(v) * 0.75 for v in spec["size"].split("x")))
ink, accent, paper = HexColor("#1E1E1E"), HexColor(spec.get("accent", "#D97757")), HexColor("#F6F1EA")

body_font, mono_font, bold_font = "Helvetica", "Courier", "Helvetica-Bold"
root = Path(__file__).resolve().parents[4]
for name, files in (("Inter", ["Inter-Regular.ttf", "Inter.ttf"]), ("Inter-Bold", ["Inter-Bold.ttf"]), ("Mono", ["JetBrainsMono-Regular.ttf"])):
    hit = next((p for f in files for p in root.glob(f"**/fonts/{f}") if "node_modules" not in p.parts), None)
    if hit:
        pdfmetrics.registerFont(TTFont(name, str(hit)))
        body_font, bold_font, mono_font = {"Inter": (name, bold_font, mono_font), "Inter-Bold": (body_font, name, mono_font), "Mono": (body_font, bold_font, name)}[name]

c = canvas.Canvas(str(out), pagesize=(W, H))
m = 48


def frame(n, total):
    c.setFillColor(paper); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(accent); c.rect(m, H - m - 8, 8, 8, fill=1, stroke=0)
    c.setFillColor(ink); c.setFont(mono_font, 8); c.drawString(m + 16, H - m - 7, spec["title"].upper())
    c.drawRightString(W - m, m - 20, f"{spec.get('brand', '')}   P {n:02} / {total:02}")


def para(text, x, y, width, font, size, lead, colour=ink):
    c.setFillColor(colour); c.setFont(font, size)
    for block in text.split("\n\n"):
        for line in simpleSplit(block.replace("\n", " "), font, size, width):
            c.drawString(x, y, line); y -= lead
        y -= lead * 0.6
    return y


pages = spec["pages"]
for i, p in enumerate(pages, 1):
    frame(i, len(pages))
    y = H - m - 60
    y = para(p.get("h", ""), m, y, W - 2 * m, bold_font, 28, 32, accent if i == 1 else ink) - 6
    if p.get("body"):
        y = para(p["body"], m, y, W - 2 * m, body_font, 11, 16)
    if p.get("code"):
        lines = sum(len(simpleSplit(b, mono_font, 8.5, W - 2 * m - 24)) for b in p["code"].split("\n")) * 12 + 24
        c.setFillColor(HexColor("#ECE6DD")); c.roundRect(m, y - lines, W - 2 * m, lines, 10, fill=1, stroke=0)
        yy = y - 18
        c.setFillColor(ink); c.setFont(mono_font, 8.5)
        for b in p["code"].split("\n"):
            for line in simpleSplit(b, mono_font, 8.5, W - 2 * m - 24) or [""]:
                c.drawString(m + 12, yy, line); yy -= 12
        y -= lines + 16
    if p.get("image") and Path(p["image"]).exists():
        img = ImageReader(p["image"]); iw, ih = img.getSize()
        w = W - 2 * m; h = min(w * ih / iw, max(y - m - 10, 60)); w = h * iw / ih
        c.drawImage(img, m, y - h, w, h, mask="auto")
    c.showPage()
c.save()
print(f"{len(pages)} pages -> {out}")
