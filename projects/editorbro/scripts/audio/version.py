"""Paths for the voice / timing / score scripts (one place, so they work unchanged). --version v2 switches to the
v2 files (voScript.v2.json, SCENE_TIMINGS.v2.json, audio/out/v2) and keeps v1 intact."""
import pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
V = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--version" and i + 1 < len(sys.argv)), "v1")
SUFFIX = "" if V == "v1" else f"_{V}"
SCRIPT_PATH = ROOT / "src" / "config" / ("voScript.json" if V == "v1" else f"voScript.{V}.json")
OUT = ROOT / "audio" / "out" if V == "v1" else ROOT / "audio" / "out" / V
TIMINGS = ROOT / ("SCENE_TIMINGS.json" if V == "v1" else f"SCENE_TIMINGS.{V}.json")
MANIFEST = ROOT / "src" / "config" / "audioManifest.json"
