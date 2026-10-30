"""ASTRA.EXE reel voiceover -> audio/astra/voiceover.{mp3,wav} (exactly 65.0 s), data/astra/lyrics.json, data/astra/layout.json,
projects/astra-exe/web/public/reel/vo.json (what the reel's director reads) and projects/astra-exe/output/captions.srt.

One ElevenLabs take of analysis/script_astra.py (Liam, eleven_turbo_v2_5, language hi), cut by its own character timestamps into
the script's groups. A group with an anchor starts its first word on that anchor; one without follows the previous group after
the take's own pause (at most NAT_MAX). Nothing is stretched. Takes are cached in audio/astra/takes/s<seed>_x<speed>.{mp3,json}.

    python analysis/astra_vo.py --audition 5,7,11        # make (or reuse) takes and transcribe each, build nothing
    python analysis/astra_vo.py --seed 7 [--stt]          # build from one take
"""
import json, pathlib, re, shutil, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_astra import LINES, VOICE, DURATION, NAT_MAX
import pkgfw_vo_v1 as v1


def _key():
    """The key from the user environment (where `setx` writes it) first, then this process's copy. Never printed."""
    import os
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h: return winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0].strip()
    except OSError: return os.environ["ELEVENLABS_API_KEY"].strip()
v1.key = _key

ROOT = v1.ROOT; SR = v1.SR
A = ROOT / "audio" / "astra"; D = ROOT / "data" / "astra"; O = ROOT / "projects" / "astra-exe" / "output"; TAKES = A / "takes"
WEB = ROOT / "projects" / "astra-exe" / "web" / "public" / "reel"
PUNCT = r"[,.!?;:…।—]+$"
GROUPS = [(ch, a, sp, dp) for ch, gs in LINES for (a, sp, dp) in gs]


def script_text():
    """The take's text (no-break spaces sent as plain spaces) and each group's spoken word spans in it."""
    text, spans = "", []
    for _, _, line, _ in GROUPS:
        off = len(text) + (1 if text else 0); text += (" " if text else "") + line
        spans.append([(off + m.start(), off + m.end(), m.group()) for m in re.finditer(r"[^ ]+", line)])
    return text, text.replace(" ", " "), spans


def get_take(seed, new=False):
    _, sent, _ = script_text()
    TAKES.mkdir(parents=True, exist_ok=True)
    mp3p, alp = TAKES / f"s{seed}_x{VOICE['speed']}.mp3", TAKES / f"s{seed}_x{VOICE['speed']}.json"
    if not new and mp3p.exists() and alp.exists() and json.loads(alp.read_text(encoding="utf-8"))["text"] == sent:
        print(f"reusing {mp3p.name}"); meta = json.loads(alp.read_text(encoding="utf-8")); return mp3p.read_bytes(), meta["alignment"]
    print(f"new take: {len(sent)} characters, {VOICE['model']}, seed {seed}, speed {VOICE['speed']}")
    mp3, al = v1.synth(sent, VOICE, seed)
    mp3p.write_bytes(mp3); alp.write_text(json.dumps({"text": sent, "model": VOICE["model"], "seed": seed, "voice": VOICE, "alignment": al},
                                                     ensure_ascii=False), encoding="utf-8")
    return mp3, al


def audition(seeds):
    for s in seeds:
        mp3, _ = get_take(s)
        y = v1.decode(mp3)
        print(f"seed {s}: {len(y) / SR:.2f} s")
        for k in range(2): print(f"  heard {k + 1}: {v1.stt(mp3)}")


def main():
    if "--audition" in sys.argv: return audition([int(x) for x in v1.arg("--audition", "7").split(",")])
    seed = int(v1.arg("--seed", "7"))
    mp3, al = get_take(seed, "--new" in sys.argv)
    _, sent, spans = script_text()
    take = v1.decode(mp3); tm = v1.char_times(sent, al)
    G = []
    for (ch, anchor, line, disp), words in zip(GROUPS, spans):
        dw = disp.split(" "); assert len(dw) == len(words), f"{ch}: display has {len(dw)} words, spoken {len(words)}: {dw} / {[w for *_, w in words]}"
        ws = []
        for a, b, w in words:
            core = re.sub(PUNCT, "", w); bb = a + max(1, len(core))
            ws.append([tm[a][0], max(tm[bb - 1][1], tm[a][0] + 0.05)])
        G.append({"chapter": ch, "anchor": anchor, "disp": dw, "spoken": line, "ws": ws})
    # place every group: on its anchor, or after the previous group with the take's own pause (capped)
    y = np.zeros(int(round(DURATION * SR)), np.float32)
    lines, warn, t_end = [], [], 0.0
    for i, g in enumerate(G):
        first, last = g["ws"][0][0], g["ws"][-1][1]
        if g["anchor"] is not None: p = g["anchor"]
        else: own = first - G[i - 1]["ws"][-1][1]; p = t_end + min(max(own, 0.06), NAT_MAX)
        sh = p - first
        if i and p < t_end + 0.05: warn.append(f"group {i} ({' '.join(g['disp'][:3])}...) starts {p:.2f} s, {t_end - p + 0.05:.2f} s into the previous group")
        s0, s1 = max(0.0, first - 0.07), last + 0.16
        if i: s0 = max(s0, G[i - 1]["ws"][-1][1] + 0.02)
        if i + 1 < len(G): s1 = min(s1, G[i + 1]["ws"][0][0] - 0.03)
        seg = take[int(s0 * SR):int(s1 * SR)].copy(); f = int(0.006 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        q = int(round((s0 + sh) * SR)); y[q:q + len(seg)] += seg[:max(0, len(y) - q)]
        W = [{"w": d, "start": round(s + sh, 3), "end": round(e + sh, 3), "conf": 1.0} for d, (s, e) in zip(g["disp"], g["ws"])]
        lines.append({"i": i, "chapter": g["chapter"], "text": " ".join(g["disp"]), "spoken": g["spoken"].replace(" ", " "),
                      "start": W[0]["start"], "end": W[-1]["end"], "words": W})
        t_end = last + sh
    if t_end > DURATION - 0.6: warn.append(f"the last word ends at {t_end:.2f} s, under 0.6 s before the end")
    y = 0.89 * y / (np.abs(y).max() + 1e-9)
    for p in (A, D, O, WEB): p.mkdir(parents=True, exist_ok=True)
    pcm = (y * 32767).astype(np.int16).tobytes()
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", str(A / "voiceover.mp3")], pcm)
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", str(A / "voiceover.wav")], pcm)
    lyr = {"lines": lines, "notes": f"ElevenLabs Liam {VOICE['model']} {VOICE['language']} seed {seed} speed {VOICE['speed']}; one take, cut into groups at their anchors, not stretched"}
    (D / "lyrics.json").write_text(json.dumps(lyr, indent=1, ensure_ascii=False), encoding="utf-8")
    shutil.copy(D / "lyrics.json", WEB / "vo.json")
    chapters = []
    for l in lines:
        if not chapters or chapters[-1][2] != l["chapter"]: chapters.append([l["start"], None, l["chapter"]])
    (D / "layout.json").write_text(json.dumps({"duration": DURATION, "seed": seed, "voice": VOICE, "chapters": chapters}, indent=1), encoding="utf-8")
    # SRT: cues of at most two lines of about 24 characters
    cues = []
    for l in lines:
        cur, n = [], 0
        for w in l["words"]:
            if cur and n + len(w["w"]) > 40: cues.append(cur); cur, n = [], 0
            cur.append(w); n += len(w["w"]) + 1
        if cur: cues.append(cur)

    def two_lines(ws):
        s = " ".join(w["w"] for w in ws)
        if len(s) <= 24: return s
        k = min(range(1, len(ws)), key=lambda k: abs(len(" ".join(w["w"] for w in ws[:k])) - len(s) / 2))
        return " ".join(w["w"] for w in ws[:k]) + "\n" + " ".join(w["w"] for w in ws[k:])
    srt = []
    for j, c in enumerate(cues):
        nxt = cues[j + 1][0]["start"] if j + 1 < len(cues) else DURATION
        srt.append(f"{j + 1}\n{v1.srt_time(c[0]['start'])} --> {v1.srt_time(min(c[-1]['end'] + 0.3, nxt - 0.02))}\n{two_lines(c)}\n")
    (O / "captions.srt").write_text("\n".join(srt), encoding="utf-8")
    for l in lines: print(f"{l['chapter']:10s} {l['start']:6.2f}-{l['end']:6.2f}  {l['text']}")
    for w in warn: print("WARNING:", w)
    print(f"{sum(len(l['words']) for l in lines)} words, {len(srt)} SRT cues, last word ends {t_end:.2f} s")
    if "--stt" in sys.argv:
        for k in range(2): print(f"heard {k + 1}:", v1.stt(mp3))


if __name__ == "__main__":
    main()
