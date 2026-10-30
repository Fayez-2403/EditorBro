"""Swap in a real narration take: split one WAV into the script's lines and time the caption phrases, writing the same
files vo.py / scratch_vo.py write (audio/out/<variant>/<line>.wav + audio/out/lines_<variant>.json). Then run
timing.py (scene cuts + captions follow the new voice) and score.py (music, SFX and mix follow the new cuts).

    python scripts/audio/align.py path/to/take.wav --variant master

How it works: the recording reads the lines of VOICEOVER_HINGLISH.md in order with a clear pause (~1 s) between lines.
Line boundaries = long pauses close to where the script's character counts put them (dynamic programming). Inside each
line the caption phrases (split at , . ? :) are placed on the line's own short pauses the same way; with too few pauses
they are spread over the voiced time by length. Check the result with stills + the caption track (QA_REPORT.md).
"""
import json, pathlib, subprocess, sys

import numpy as np
import soundfile as sf

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from vo import HERE, SCRIPT, SR, phrases, caption_words, arg  # noqa: E402


def load(path, sr):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(sr), "pipe:1"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def voiced(y, sr, hop=0.02, merge=0.3):
    n = int(hop * sr); fr = y[: len(y) // n * n].reshape(-1, n); db = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)
    on = db > max(db.max() - 38, -55)
    segs, s = [], None
    for i, v in enumerate(on):
        if v and s is None: s = i
        if not v and s is not None: segs.append([s * hop, i * hop]); s = None
    if s is not None: segs.append([s * hop, len(on) * hop])
    merged = []
    for a, b in segs:
        if merged and a - merged[-1][1] < merge: merged[-1][1] = b
        else: merged.append([a, b])
    return [m for m in merged if m[1] - m[0] > 0.08]


def choose_cuts(segs, chars):
    """pick N-1 pauses as line boundaries: long pauses near where the script's character counts put each boundary
    (dynamic programming over the pauses in time order)"""
    N, G = len(chars), len(segs) - 1
    gap = [segs[i + 1][0] - segs[i][1] for i in range(G)]
    vpos = np.cumsum([b - a for a, b in segs])[:-1]            # voiced time before each pause
    V = sum(b - a for a, b in segs); C = np.cumsum(chars) / sum(chars)
    exp = [V * C[k] for k in range(N - 1)]
    cost = lambda k, g: 12 * abs(vpos[g] - exp[k]) / V - min(gap[g], 2.0)
    INF = 1e18; D = np.full((N - 1, G), INF); P = np.zeros((N - 1, G), int)
    for g in range(G): D[0, g] = cost(0, g)
    for k in range(1, N - 1):
        best, arg_ = INF, -1
        for g in range(G):
            if g > 0 and D[k - 1, g - 1] < best: best, arg_ = D[k - 1, g - 1], g - 1
            if arg_ >= 0: D[k, g] = best + cost(k, g); P[k, g] = arg_
    g = int(np.argmin(D[N - 2])); out = [g]
    for k in range(N - 2, 0, -1): g = int(P[k, g]); out.append(g)
    return out[::-1]


def main():
    wav, variant = pathlib.Path(sys.argv[1]), arg("--variant", "master")
    lines = SCRIPT[variant]; N = len(lines)
    y = load(wav, SR); segs = voiced(y, SR)
    if len(segs) < N: sys.exit(f"found {len(segs)} voiced regions, need at least {N}: record with clear pauses between lines")
    cuts = choose_cuts(segs, [len(l["tts"]) for l in lines])
    bounds, a = [], 0
    for c in cuts + [len(segs) - 1]: bounds.append((segs[a][0], segs[c][1])); a = c + 1
    O = HERE.parent.parent / "audio" / "out" / variant; O.mkdir(parents=True, exist_ok=True); res = []
    for l, (t0, t1) in zip(lines, bounds):
        s0, s1 = max(0, t0 - 0.05), min(len(y) / SR, t1 + 0.16); clip = y[int(s0 * SR):int(s1 * SR)]
        sf.write(O / f"{l['id']}.wav", clip, SR, subtype="PCM_16")
        tts_ph, cap_ph = phrases(l["tts"]), phrases(l["cap"])
        sub = voiced(clip, SR, hop=0.01, merge=0.09)                 # pauses inside the line
        ph = []
        if len(sub) >= len(tts_ph) > 1:
            cs = choose_cuts(sub, [len(p) for p in tts_ph]); starts = [0] + [c + 1 for c in cs]; ends = cs + [len(sub) - 1]
            spans_ = [(sub[a_][0], sub[b_][1]) for a_, b_ in zip(starts, ends)]
        else:                                                     # too few pauses: spread by length over the voiced time
            v0, v1 = (sub[0][0], sub[-1][1]) if sub else (0.05, len(clip) / SR - 0.1)
            tot = sum(len(p) for p in tts_ph); acc = 0; spans_ = []
            for tp in tts_ph: spans_.append((v0 + (v1 - v0) * acc / tot, v0 + (v1 - v0) * (acc + len(tp)) / tot)); acc += len(tp)
        for cap, (a0, a1) in zip(cap_ph, spans_):
            ph.append({"cap": cap, "t0": round(a0, 3), "t1": round(a1, 3), "words": caption_words(cap, a0, a1)})
        res.append({"id": l["id"], "scene": l["scene"], "min": l["min"], "cut": l.get("cut"), "dur": round(len(clip) / SR, 3), "phrases": ph})
        print(f"{l['id']} {len(clip) / SR:5.2f} s  {len(sub)} voiced parts for {len(tts_ph)} phrases")
    meta = {"source": f"recorded take {wav.name} (aligned by align.py)", "take": wav.name, "scratch": False, "lines": res}
    (HERE.parent.parent / "audio" / "out" / f"lines_{variant}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print("now run: python scripts/audio/timing.py && python scripts/audio/score.py")


if __name__ == "__main__":
    main()
