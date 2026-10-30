"""Timing-based deliverables from SCENE_TIMINGS.json + voScript.json into post/: captions.srt (the on-screen word
groups), subtitle_map.json, scene_map.json (scene, frames, line, on-screen label, facts used) and voiceover.txt
(Roman Hinglish + the Devanagari TTS text). Labels and fact ids per scene come from src/config/scene_labels.json
({"scene_id": ["ON-SCREEN LABEL", "F1, F3"]}); missing scenes are reported, not invented.

    python scripts/export_kit.py [--version v2]
"""
import json, math, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts" / "audio"))
from version import V, SCRIPT_PATH, TIMINGS  # noqa: E402
POST = ROOT / ("post" if V == "v1" else f"post_{V}"); POST.mkdir(exist_ok=True)
TM = json.loads(TIMINGS.read_text(encoding="utf-8"))["variants"]["reel"]
VO = json.loads(SCRIPT_PATH.read_text(encoding="utf-8"))
LP = ROOT / "src" / "config" / "scene_labels.json"
LABEL = json.loads(LP.read_text(encoding="utf-8")) if LP.exists() else {}
NAME = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["name"]


def ts(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def groups():
    out = []
    for c in TM["captions"]:
        ws = c["words"]; n = math.ceil(len(ws) / 5); size = math.ceil(len(ws) / n)
        out += [ws[i:i + size] for i in range(0, len(ws), size)]
    return out


def main():
    G = groups(); srt, smap = [], []
    for k, g in enumerate(G):
        t0 = g[0]["t0"]; t1 = min(g[-1]["t1"] + 0.4, (G[k + 1][0]["t0"] - 0.05) if k + 1 < len(G) else 1e9)
        text = " ".join(w["w"] for w in g)
        srt.append(f"{k + 1}\n{ts(t0)} --> {ts(t1)}\n{text}\n"); smap.append({"i": k + 1, "t0": round(t0, 3), "t1": round(t1, 3), "text": text, "words": g})
    (POST / "captions.srt").write_text("\n".join(srt), encoding="utf-8")
    (POST / "subtitle_map.json").write_text(json.dumps(smap, ensure_ascii=False, indent=1), encoding="utf-8")
    lines = {l["id"]: l for l in VO["reel"]}
    scenes, missing = [], []
    for s in TM["scenes"]:
        vo = next((v for v in TM["vo"] if v["scene"] == s["id"]), None)
        line = vo["id"] if vo else next((l["id"] for l in VO["reel"] if l.get("cut", {}).get("scene") == s["id"]), None)
        lab = LABEL.get(s["id"])
        if not lab:
            missing.append(s["id"]); lab = ["(label missing)", "(facts missing)"]
        scenes.append({"scene": s["id"], "start": s["start"], "end": s["end"], "frames": [s["from"], s["from"] + s["durationInFrames"] - 1],
                       "line": line, "on_screen": lab[0], "facts": lab[1]})
    (POST / "scene_map.json").write_text(json.dumps({"fps": 60, "frames": TM["durationInFrames"], "seconds": TM["seconds"], "voice": TM["voSource"], "scenes": scenes},
                                                   ensure_ascii=False, indent=1), encoding="utf-8")
    vo_txt = [f"# Voiceover: {NAME} ({TM['seconds']:.1f} s)", f"# Voice: {TM['voSource']}", ""]
    for v in TM["vo"]:
        l = lines[v["id"]]
        vo_txt += [f"[{v['start']:5.2f}-{v['end']:5.2f}] {v['id']}", f"  Roman : {l['cap']}", f"  TTS   : {l['tts']}", ""]
    (POST / "voiceover.txt").write_text("\n".join(vo_txt), encoding="utf-8")
    print(f"wrote {len(srt)} subtitles, {len(scenes)} scenes -> {POST}" + (f"   labels missing for: {', '.join(missing)}" if missing else ""))


if __name__ == "__main__":
    main()
