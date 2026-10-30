"""Check docs/asset_manifest.csv against the disk: every row's file exists, has rights + credit filled, and (for media)
its real duration / size from ffprobe. Also lists media files in assets/ and public/ that are NOT in the manifest.

  python scripts/verify_assets.py            # exit 1 if any row fails (unknown rights, missing file, no credit)

Rights values: owned | licensed:<licence/terms> | permission:<who, when> | news-commentary:<credit> | placeholder | UNKNOWN
UNKNOWN or an empty rights cell blocks the final export (the scene stays a labelled placeholder).
"""
import csv, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAN = ROOT / "docs" / "asset_manifest.csv"
MEDIA = {".mp4", ".mov", ".webm", ".mkv", ".wav", ".mp3", ".m4a", ".flac", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}


def probe(p):
    try:
        j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", str(p)],
                                      capture_output=True, text=True).stdout)
        v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), {})
        d = float(j.get("format", {}).get("duration", 0) or 0)
        return f"{v.get('width', '?')}x{v.get('height', '?')}" + (f" {d:.2f}s" if d > 0.05 else "")
    except Exception as e:
        return f"probe failed: {e}"


rows = list(csv.DictReader(MAN.open(encoding="utf-8"))) if MAN.exists() else []
bad, listed = 0, set()
print(f"{len(rows)} rows in {MAN.relative_to(ROOT)}")
for r in rows:
    path = (r.get("file_path") or "").strip()
    p = ROOT / path if path else None
    listed.add(p.resolve() if p else None)
    problems = []
    if not path: problems.append("no file_path")
    elif not p.exists(): problems.append("FILE MISSING")
    rights = (r.get("rights") or "").strip()
    if not rights or rights.upper() == "UNKNOWN": problems.append("rights UNKNOWN (blocks final export)")
    if not (r.get("credit") or "").strip() and not rights.startswith("owned"): problems.append("no credit")
    info = probe(p) if p and p.exists() and p.suffix.lower() in MEDIA else ""
    bad += bool(problems)
    print(f"  {'FAIL' if problems else 'OK  '}  {r.get('chapter', ''):10} {path:50} {info:18} {rights[:30]:30} {'; '.join(problems)}")

unlisted = [p for d in ("assets", "public") for p in (ROOT / d).rglob("*") if p.is_file() and p.suffix.lower() in MEDIA
            and p.resolve() not in listed and "fonts" not in p.parts and p.name != ".gitkeep"
            and not (d == "public" and p.parts[-2] == "audio" and p.stem.startswith(("vo_", "mix_")))]
for p in unlisted:
    print(f"  NOTE  not in manifest: {p.relative_to(ROOT)}")
print(f"\n{len(rows) - bad}/{len(rows)} rows pass" + (f", {len(unlisted)} media files not in the manifest" if unlisted else ""))
sys.exit(1 if bad else 0)
