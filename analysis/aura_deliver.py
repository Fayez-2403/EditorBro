"""Deliverables for The Editor's Aura from a rendered reel (the 30 fps animatic now, the 60 fps master once approved):
  output/renders/R0n_<name>_<tag>.mp4   the six renders as their own files (cut from the reel at their segment bounds, with the mix)
  output/aura_timeline.json + .csv      the layered timeline (the tracks of the reel's own editor: V3 backshot, V2 IDE/editor,
                                        V1 renders, FX montage + flashes, A1 music, A2 foley), every clip with its in/out
  output/stems/                         music (build/sync copy only), foley, full mix
  output/aura_contact_<tag>.jpg         a contact sheet every 1.5 s, timestamped (QC)
  output/aura_post_<tag>.mp4            the post version: picture + foley only (add the song from Instagram's library)
    python analysis/aura_deliver.py projects/editors-aura/output/aura_animatic_30fps.mp4 animatic
    python analysis/aura_deliver.py projects/editors-aura/output/v2/aura_v2_animatic_30fps.mp4 animatic --v2   (V2 -> output/v2/)
    python analysis/aura_deliver.py projects/editors-aura/output/v4/aura_v4_master_60fps.mp4 master --variant aura_v4   (V4: the nine renders)
"""
import csv, json, pathlib, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
D, AU, O = ROOT / "data/aura", ROOT / "audio/aura", ROOT / "projects/editors-aura/output"
NAMES = {"r1": "R01_kinetic_type", "r2": "R02_product_ui", "r3": "R03_audio_shader", "r4": "R04_chrome_glass", "r5": "R05_volcano", "r6": "R06_pit_stop"}


def ff(*a): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, a)], check=True)


def timeline(cues, intro):
    clips = []
    for a, b, w, p in cues["segments"]:
        tr = "V1" if w in NAMES else "V3" if w in ("orbit", "aura") else "V2"
        name = NAMES.get(w) or (f"ide · {p.get('shot')}" + (f" {p['prompt']}" if p.get("prompt") else "") if w == "ide" else f"editor · {p['mode']}" if w == "editor" else "backshot · AI placeholder" if w == "orbit" else "end card")
        clips.append({"track": tr, "in": a, "out": b, "clip": name, "world": w, "params": p})
    for a, b, w in cues["montage"]: clips.append({"track": "FX", "in": a, "out": b, "clip": f"intercut · {w}", "world": w.split(".")[0], "params": {}})
    for t, w in cues["flashes"]: clips.append({"track": "FX", "in": t, "out": round(t + cues["eighth"] / 2, 4), "clip": f"export flash · {w}", "world": w, "params": {}})
    clips.append({"track": "A1", "in": 0, "out": intro["duration"], "clip": f"Dhurandhar title track (from {intro['s0']} s), build/sync copy", "world": "audio", "params": {"url": intro["url"]}})
    clips.append({"track": "A1", "in": intro["xfade"]["dub_in_from"], "out": cues["duration"], "clip": "General Levy - Dubplate (song 100.947 s on), build/sync copy", "world": "audio", "params": {}})
    for t, k, g in cues["sfx"]: clips.append({"track": "A2", "in": t, "out": t, "clip": f"foley · {k}", "world": "audio", "params": {"gain": g}})
    order = {"V3": 0, "V2": 1, "V1": 2, "FX": 3, "A1": 4, "A2": 5}
    return sorted(clips, key=lambda c: (order[c["track"]], c["in"]))


def contact(video, tag, step=1.5, cols=10):
    tmp = O / f"_frames_{tag}"; shutil.rmtree(tmp, ignore_errors=True); tmp.mkdir(parents=True)
    ff("-i", video, "-vf", f"select='lt(mod(t+0.001,{step}),0.012)',scale=216:384", "-fps_mode", "vfr", tmp / "f_%03d.png")   # exactly at k*step
    fs = sorted(tmp.glob("f_*.png")); rows = (len(fs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * 220, rows * 404), (12, 14, 18)); dr = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype(str(ROOT / "app/public/fonts/Archivo-w1000-700.ttf"), 14)
    except OSError: font = ImageFont.load_default()
    for i, f in enumerate(fs):
        x, y = (i % cols) * 220 + 2, (i // cols) * 404 + 18
        sheet.paste(Image.open(f).convert("RGB"), (x, y)); dr.text((x + 2, y - 16), f"{i * step:5.1f}s", fill=(220, 224, 230), font=font)
    out = O / f"aura_contact_{tag}.jpg"; sheet.save(out, quality=88); shutil.rmtree(tmp, ignore_errors=True); return out


def timeline_v2(c2, intro, sm2):
    clips = []
    for a, b, kind, p in c2["edl"]:
        tr = "V1" if p.get("render") or kind == "r7" else "V3" if kind in ("intro", "intro_stock", "intro_v3", "outro") else "V2"
        name = {"intro": "intro · masked backshot (AI placeholder)", "intro_stock": "intro · stock footage (Mixkit, Free License)", "intro_v3": "intro · side shot, neck + knuckle cracks (AI placeholder)",
                "major": "the major prompt (skills attached)", "r7": "R07_robot_dance", "outro": "outro · end card + the six renders"}.get(kind) or (NAMES[f"r{p['render']}"] if p.get("render") else p["name"])
        clips.append({"track": tr, "in": a, "out": b, "clip": name, "world": kind, "params": p})
    for a, b, pi in c2["cards"]: clips.append({"track": "FX", "in": a, "out": b, "clip": "the major prompt card" if pi == 0 else f"prompt card {pi:02d}", "world": "overlay", "params": {}})
    for kind, a, b, p in c2.get("bot", []): clips.append({"track": "FX", "in": a, "out": b, "clip": f"Claude's bot (illustration) · {kind}", "world": "overlay", "params": {}})
    for t, k in c2["punches"]: clips.append({"track": "FX", "in": t, "out": t, "clip": f"punch {k}", "world": "post", "params": {}})
    clips.append({"track": "A1", "in": 0, "out": intro["duration"], "clip": f"Dhurandhar title track (from {intro['s0']} s), build/sync copy", "world": "audio", "params": {"url": intro["url"]}})
    if "song_times" in sm2:   # the 89 s V2: Dubplate rearranged on its phrase lines
        for a, b, s0 in sm2["song_times"]: clips.append({"track": "A1", "in": a, "out": b, "clip": f"General Levy - Dubplate, song {s0:.3f}-{s0 + b - a:.3f} s, build/sync copy", "world": "audio", "params": {}})
    else:
        clips.append({"track": "A1", "in": intro["xfade"]["dub_in_from"], "out": c2["duration"], "clip": f"General Levy - Dubplate (song {sm2['offset_song_minus_v2'] + intro['duration']:.3f} s on, to its fade), build/sync copy", "world": "audio", "params": {}})
    for t, k, g in c2["sfx"]: clips.append({"track": "A2", "in": t, "out": t, "clip": f"foley · {k}", "world": "audio", "params": {"gain": g}})
    order = {"V3": 0, "V2": 1, "V1": 2, "FX": 3, "A1": 4, "A2": 5}
    return sorted(clips, key=lambda c: (order[c["track"]], c["in"]))


def deliver_v4(video, tag):
    """V4 (renders only): the nine renders cut from the reel at their own ranges, the timeline (renders, transitions, captions,
    punches, the two Dubplate pieces, foley), stems, the foley-only post version, the contact sheet."""
    D4, A4, O4 = ROOT / "data/aura_v4", ROOT / "audio/aura_v4", ROOT / "projects/editors-aura/output/v4"
    c4 = json.loads((D4 / "cues.json").read_text()); sm = json.loads((D4 / "song_map.json").read_text())
    (O4 / "renders").mkdir(parents=True, exist_ok=True); (O4 / "stems").mkdir(exist_ok=True)
    for L in c4["labels"]:
        nm = f"{L['key']}_{L['name'].split(' · ')[0].lower().replace(' + ', '_').replace(' ', '_')}"
        ff("-ss", L["a"], "-to", L["b"], "-i", video, "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", O4 / "renders" / f"V4_{nm}_{tag}.mp4")
    clips = []
    for a, b, kind, p in c4["edl"]:
        clips.append({"track": "V1", "in": a, "out": b, "clip": p.get("name", kind), "world": p.get("w", kind), "params": p})
    for cut, mode, a, b, o in c4["xf"]: clips.append({"track": "FX", "in": a, "out": b, "clip": f"transition · {mode} (cut {cut})", "world": "xfade", "params": o})
    for q in c4["captions"]: clips.append({"track": "FX", "in": q["t0"], "out": q["t1"], "clip": f"caption · {q['kind']}", "world": "lyrics", "params": {k: v for k, v in q.items() if k not in ("kind", "t0", "t1")}})
    for t, k in c4["punches"]: clips.append({"track": "FX", "in": t, "out": t, "clip": f"punch {k}", "world": "post", "params": {}})
    for name, (s0, a, b) in sm["song_read"].items(): clips.append({"track": "A1", "in": a, "out": b, "clip": f"General Levy - Dubplate, piece {name}: song {s0:.3f} s on (re-phased {sm['math']['accent_phase_ms']} ms), build/sync copy", "world": "audio", "params": {}})
    for t, k, g in c4["sfx"]: clips.append({"track": "A2", "in": t, "out": t, "clip": f"foley · {k}", "world": "audio", "params": {"gain": g}})
    order = {"V1": 0, "FX": 1, "A1": 2, "A2": 3}; tl = sorted(clips, key=lambda c: (order[c["track"]], c["in"]))
    (O4 / "aura_v4_timeline.json").write_text(json.dumps({"duration": c4["duration"], "fps": 60, "size": [1080, 1920], "tracks": ["V1", "FX", "A1", "A2"], "music_math": sm["math"], "clips": tl}, indent=1), encoding="utf-8")
    with open(O4 / "aura_v4_timeline.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["track", "in_s", "out_s", "clip", "world", "v1_T0"])
        for c in tl: w.writerow([c["track"], c["in"], c["out"], c["clip"], c["world"], c["params"].get("T0", "")])
    shutil.copy(A4 / "song.wav", O4 / "stems" / "music_BUILD-SYNC-ONLY_v4_dubplate-bars23-27+32-end.wav")
    shutil.copy(A4 / "sfx.wav", O4 / "stems" / "foley_v4.wav"); shutil.copy(A4 / "mix.wav", O4 / "stems" / "mix_v4.wav")
    ff("-i", video, "-i", A4 / "sfx.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", O4 / f"aura_v4_post_{tag}.mp4")
    global O
    O = O4; cs = contact(video, f"v4_{tag}", step=1.0)
    print(f"aura_v4: {len(c4['labels'])} renders -> {O4 / 'renders'}; timeline {len(tl)} clips; stems; post; contact {cs}")


def main():
    global D, AU, O
    if "--variant" in sys.argv and sys.argv[sys.argv.index("--variant") + 1] == "aura_v4":
        a = [x for x in sys.argv[1:] if x not in ("--variant", "aura_v4")]; deliver_v4(pathlib.Path(a[0]), a[1] if len(a) > 1 else "master"); return
    var = next((sys.argv[i + 1] for i, a in enumerate(sys.argv) if a == "--variant"), "aura_v2" if "--v2" in sys.argv else None)
    args = [a for i, a in enumerate(sys.argv[1:], 1) if a not in ("--v2", "--variant") and sys.argv[i - 1] != "--variant"]
    v2 = var is not None
    video, tag = pathlib.Path(args[0]), args[1] if len(args) > 1 else "animatic"
    intro = json.loads((D / "intro.json").read_text())
    if v2:
        tagv = var.replace("aura_", "")   # v2 | v3
        D, AU, O = ROOT / f"data/{var}", ROOT / f"audio/{var}", ROOT / f"projects/editors-aura/output/{tagv}"
        c2 = json.loads((D / "cues.json").read_text()); sm2 = json.loads((D / "song_map.json").read_text())
        (O / "renders").mkdir(parents=True, exist_ok=True); (O / "stems").mkdir(exist_ok=True)
        for a, b, kind, p in c2["edl"]:
            if p.get("render") or kind == "r7":
                nm = "R07_robot_dance" if kind == "r7" else NAMES['r' + str(p['render'])]
                ff("-ss", a, "-to", b, "-i", video, "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", O / "renders" / f"{tagv.upper()}_{nm}_{tag}.mp4")
        tl = timeline_v2(c2, intro, sm2)
        (O / f"aura_{tagv}_timeline.json").write_text(json.dumps({"duration": c2["duration"], "fps": 60, "size": [1080, 1920], "tracks": ["V3", "V2", "V1", "FX", "A1", "A2"], "clips": tl}, indent=1), encoding="utf-8")
        with open(O / f"aura_{tagv}_timeline.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f); w.writerow(["track", "in_s", "out_s", "clip", "world", "v1_T0"])
            for c in tl: w.writerow([c["track"], c["in"], c["out"], c["clip"], c["world"], c["params"].get("T0", "")])
        shutil.copy(AU / "song.wav", O / "stems" / f"music_BUILD-SYNC-ONLY_{tagv}_dhurandhar-intro+dubplate-rearranged.wav")
        shutil.copy(AU / "sfx.wav", O / "stems" / f"foley_{tagv}.wav"); shutil.copy(AU / "mix.wav", O / "stems" / f"mix_{tagv}.wav")
        ff("-i", video, "-i", AU / "sfx.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", O / f"aura_{tagv}_post_{tag}.mp4")
        cs = contact(video, f"{tagv}_{tag}")
        print(f"{var}: renders -> {O / 'renders'}; timeline {len(tl)} clips; stems; post; contact {cs}")
        return
    cues = json.loads((D / "cues.json").read_text())
    (O / "renders").mkdir(parents=True, exist_ok=True); (O / "stems").mkdir(exist_ok=True)
    for a, b, w, _ in cues["segments"]:
        if w in NAMES:
            ff("-ss", a, "-to", b, "-i", video, "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", O / "renders" / f"{NAMES[w]}_{tag}.mp4")
    tl = timeline(cues, intro)
    (O / "aura_timeline.json").write_text(json.dumps({"duration": cues["duration"], "fps": 60, "size": [1080, 1920], "tracks": ["V3", "V2", "V1", "FX", "A1", "A2"], "clips": tl}, indent=1), encoding="utf-8")
    with open(O / "aura_timeline.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(["track", "in_s", "out_s", "clip", "world"])
        for c in tl: w.writerow([c["track"], c["in"], c["out"], c["clip"], c["world"]])
    shutil.copy(AU / "song.wav", O / "stems" / "music_BUILD-SYNC-ONLY_dhurandhar-intro+dubplate.wav")
    shutil.copy(AU / "sfx.wav", O / "stems" / "foley.wav"); shutil.copy(AU / "mix.wav", O / "stems" / "mix.wav")
    ff("-i", video, "-i", AU / "sfx.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", "-movflags", "+faststart", O / f"aura_post_{tag}.mp4")
    cs = contact(video, tag)
    print(f"6 renders -> {O / 'renders'}; timeline {len(tl)} clips; stems; post {O / f'aura_post_{tag}.mp4'}; contact {cs}")


if __name__ == "__main__":
    main()
