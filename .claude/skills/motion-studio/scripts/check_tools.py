"""Is the whole studio installed? Checks all 16 tools of the "Motion Studio in 20 Repos" stack and says how to fix a miss.

  python .claude/skills/motion-studio/scripts/check_tools.py
"""
import importlib, json, os, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
NODE = ROOT / "tools" / "motion-studio" / "node_modules"


def py(mod):
    try:
        m = importlib.import_module(mod)
        return getattr(m, "__version__", None) or getattr(m, "Version", "ok")
    except Exception:
        return None


def node(pkg, *dirs):
    for d in (NODE, *dirs):
        p = d / pkg / "package.json"
        if p.exists():
            return json.loads(p.read_text(encoding="utf-8"))["version"]
    return None


def blender():
    exe = shutil.which("blender") or next((str(p) for p in Path(os.environ.get("ProgramFiles", "C:/Program Files"), "Blender Foundation").glob("Blender*/blender.exe")), None)
    if not exe:
        return None
    out = subprocess.run([exe, "-v"], capture_output=True, text=True).stdout.splitlines()
    return (out[0].replace("Blender ", "") if out else "ok") + f"  ({exe})"


def ffmpeg():
    exe = shutil.which("ffmpeg")
    return subprocess.run([exe, "-version"], capture_output=True, text=True).stdout.split()[2] if exe else None


REMOTION = ROOT / "projects" / "railway-ai-security" / "SOURCE" / "node_modules"
ROWS = [
    ("Blender", blender, "winget install --id BlenderFoundation.Blender -e"),
    ("NumPy", lambda: py("numpy"), "pip install --user numpy"),
    ("Puppeteer", lambda: node("puppeteer-core"), "cd tools/motion-studio && npm install"),
    ("GSAP", lambda: node("gsap"), "cd tools/motion-studio && npm install"),
    ("Three.js", lambda: node("three", ROOT / "app" / "node_modules"), "cd tools/motion-studio && npm install"),
    ("SciPy", lambda: py("scipy"), "pip install --user scipy"),
    ("Pedalboard", lambda: py("pedalboard"), "pip install --user pedalboard"),
    ("pyloudnorm", lambda: py("pyloudnorm"), "pip install --user pyloudnorm"),
    ("Tone.js", lambda: node("tone"), "cd tools/motion-studio && npm install"),
    ("Remotion", lambda: node("remotion", REMOTION), "npm install in a projects/*/SOURCE folder"),
    ("OpenCV", lambda: py("cv2"), "pip install --user opencv-python"),
    ("Numba", lambda: py("numba"), "pip install --user numba"),
    ("Pillow", lambda: py("PIL"), "pip install --user pillow"),
    ("faster-whisper", lambda: py("faster_whisper"), "pip install --user faster-whisper"),
    ("ReportLab", lambda: py("reportlab"), "pip install --user reportlab"),
    ("FFmpeg", ffmpeg, "winget install --id Gyan.FFmpeg -e"),
]

miss = 0
for name, fn, fix in ROWS:
    v = fn()
    print(f"{'OK  ' if v else 'MISS'}  {name:15} {v or '-> ' + fix}")
    miss += not v
print(f"\n{len(ROWS) - miss}/{len(ROWS)} tools ready" + ("" if not miss else "  (fix the MISS rows, then run this again)"))
sys.exit(1 if miss else 0)
