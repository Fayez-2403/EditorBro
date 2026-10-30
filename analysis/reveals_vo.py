"""Claude reveals reel voice -> audio/reveals/voiceover.{mp3,wav}, data/reveals/lyrics.json, data/reveals/layout.json and the
SRT (projects/claude-reveals/output/reveals_captions.srt).

The narrator is one ElevenLabs "Liam" take of script_reveals.LINES (eleven_turbo_v2_5, language hi), cut into its lines by
the voice's own character timestamps; each line starts at its fixed `at` time (the brief's chapter plan) and must end
before the next line starts (checked). The actor's five reactions are short Liam takes on eleven_v3 (audio tags for the
delivery), trimmed to their voiced part and placed at their `at` times. Nothing is stretched. Takes are cached in
audio/reveals/takes/ (no credits on a re-cut).

    python analysis/reveals_vo.py [--seed 5] [--stt] [--new narr|actor|all]
"""
import json, pathlib, re, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_reveals import LINES, ACTOR, VOICE, ACTOR_VOICE, DURATION, CHAPTERS
import pkgfw_vo_v1 as v1   # ElevenLabs synthesis, alignment, ffmpeg and speech-to-text helpers

ROOT = v1.ROOT; SR = v1.SR; TAKES = ROOT / "audio" / "reveals" / "takes"


def cached(name, text, g, seed, group):
    TAKES.mkdir(parents=True, exist_ok=True)
    mp3p, alp = TAKES / f"{name}_s{seed}.mp3", TAKES / f"{name}_s{seed}.json"
    if v1.arg("--new", "") not in (group, "all") and mp3p.exists() and alp.exists():
        meta = json.loads(alp.read_text(encoding="utf-8"))
        if meta["text"] == text and meta["model"] == g["model"]:
            return mp3p.read_bytes(), meta["alignment"]
    print(f"{name}: new take, {len(text)} characters, {g['model']}, seed {seed}")
    mp3, al = v1.synth(text, g, seed)
    mp3p.write_bytes(mp3)
    alp.write_text(json.dumps({"text": text, "model": g["model"], "seed": seed, "alignment": al}, ensure_ascii=False), encoding="utf-8")
    return mp3, al


def voiced(y, thr=0.04, pad=0.03):
    """First and last sample above thr of the peak (with a little padding)."""
    idx = np.nonzero(np.abs(y) > thr * np.abs(y).max())[0]
    return max(0, idx[0] - int(pad * SR)), min(len(y), idx[-1] + int(pad * SR))


def main():
    seed = int(v1.arg("--seed", "5"))
    # ---- narrator: one take, cut by character times
    text, spans = "", []
    for _, _, _, line, _ in LINES:
        off = len(text) + (1 if text else 0); text += (" " if text else "") + line
        spans.append([(off + m.start(), off + m.end(), m.group()) for m in re.finditer(r"[^ ]+", line)])
    mp3, al = cached("narr", text, VOICE, seed, "narr")
    take = v1.decode(mp3); tm = v1.char_times(text, al)
    y = np.zeros(int(round(DURATION * SR)), np.float32)
    lines, problems = [], []
    for i, ((key, ch, at, line, disp), words) in enumerate(zip(LINES, spans)):
        dw = disp.split(" "); assert len(dw) == len(words), f"{key}: display has {len(dw)} words, spoken {len(words)}"
        ws = []
        for a, b, w in words:
            core = re.sub(r"[,.!?;:…।—]+$", "", w); bb = a + max(1, len(core))
            ws.append([w, tm[a][0], max(tm[bb - 1][1], tm[a][0] + 0.05)])
        s0, s1 = max(0.0, ws[0][1] - 0.06), ws[-1][2] + 0.12
        seg = take[int(s0 * SR):int(s1 * SR)].copy()
        f = int(0.006 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        p = int(at * SR); y[p:p + len(seg)] += seg[:len(y) - p]
        W = [{"w": d, "start": round(at + (s - s0), 3), "end": round(at + (e - s0), 3)} for d, (w, s, e) in zip(dw, ws)]
        lines.append({"i": len(lines), "key": key, "chapter": ch, "who": "narrator", "text": disp, "spoken": line,
                      "start": W[0]["start"], "end": W[-1]["end"], "words": W})
    # ---- the actor: short v3 takes, trimmed to the voiced part
    for key, at, spoken, disp in ACTOR:
        mp3a, _ = cached(f"actor_{key}", spoken, ACTOR_VOICE, seed, "actor")
        ya = v1.decode(mp3a); a0, a1 = voiced(ya); seg = ya[a0:a1].copy()
        f = int(0.004 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        seg *= v1.voiced_rms(take) / (v1.voiced_rms(seg) + 1e-9) * 1.1   # level the reactions to the narrator (a touch hotter)
        p = int(at * SR); y[p:p + len(seg)] += seg[:len(y) - p]
        d = len(seg) / SR; dw = disp.split()
        W = [{"w": w, "start": round(at + d * k / len(dw), 3), "end": round(at + d * (k + 1) / len(dw), 3)} for k, w in enumerate(dw)]
        ch = next(c for c, s, e in CHAPTERS if s <= at < e)
        lines.append({"i": len(lines), "key": key, "chapter": ch, "who": "actor", "text": disp, "spoken": spoken,
                      "start": W[0]["start"], "end": W[-1]["end"], "words": W})
    lines.sort(key=lambda l: l["start"])
    for i, l in enumerate(lines): l["i"] = i
    for a, b in zip(lines, lines[1:]):
        if a["end"] > b["start"] - 0.15: problems.append(f"{a['key']} ends {a['end']:.2f}, {b['key']} starts {b['start']:.2f}")
    for l in lines:
        ce = next(e for c, s, e in CHAPTERS if c == l["chapter"])
        if l["end"] > ce - 0.1 and l["key"] != "cta": problems.append(f"{l['key']} ends {l['end']:.2f} past its chapter ({ce})")
    peak = np.abs(y).max(); y = 0.89 * y / (peak + 1e-9)
    A = ROOT / "audio" / "reveals"; D = ROOT / "data" / "reveals"; O = ROOT / "projects" / "claude-reveals" / "output"
    for p in (A, D, O): p.mkdir(parents=True, exist_ok=True)
    pcm = (y * 32767).astype(np.int16).tobytes()
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", str(A / "voiceover.mp3")], pcm)
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", str(A / "voiceover.wav")], pcm)
    (D / "lyrics.json").write_text(json.dumps({"lines": lines, "extras": [], "notes":
        f"ElevenLabs Liam: narrator {VOICE['model']} {VOICE['language']} seed {seed}, actor {ACTOR_VOICE['model']}; placed at fixed times"},
        indent=1, ensure_ascii=False), encoding="utf-8")
    (D / "layout.json").write_text(json.dumps({"duration": DURATION, "chapters": [[s, e, c] for c, s, e in CHAPTERS]}, indent=1))
    cues = []
    for l in lines:
        cur, n = [], 0
        for w in l["words"]:
            if cur and n + len(w["w"]) > 24: cues.append(cur); cur, n = [], 0
            cur.append(w); n += len(w["w"]) + 1
        if cur: cues.append(cur)
    srt = [f"{j + 1}\n{v1.srt_time(c[0]['start'])} --> {v1.srt_time(c[-1]['end'] + 0.15)}\n{' '.join(w['w'] for w in c)}\n" for j, c in enumerate(cues)]
    (O / "reveals_captions.srt").write_text("\n".join(srt), encoding="utf-8")
    for l in lines:
        print(f"{l['key']:9s} {l['who']:8s} {l['start']:6.2f}-{l['end']:6.2f}  {len(l['words']):2d} words  {l['text'][:60]}")
    print(f"{sum(len(l['words']) for l in lines)} words, {len(srt)} SRT cues")
    for p in problems: print("PROBLEM:", p)
    if "--stt" in sys.argv: print("heard (narrator take):", v1.stt(mp3))


if __name__ == "__main__":
    main()
