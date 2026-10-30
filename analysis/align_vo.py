"""Word-level timings for the voiceover -> data/lyrics.json.

Default engine: CTC forced alignment with torchaudio's MMS_FA model (multilingual, romanised
characters, so it handles Hinglish). First run downloads the model (about 1.2 GB):

    python -m uv run --no-project --with torch --with torchaudio --with numpy python analysis/align_vo.py

Offline fallback (no model): splits the audio at its silences and spreads each line's words by
length. Good enough for a clean read with a clear pause between lines:

    python -m uv run --no-project --with numpy python analysis/align_vo.py --engine energy

Either way, word boundaries are then refined against the audio's silences.
"""
import json, sys
import numpy as np
from common_vo import load_audio, spoken_tokens, DATA
from script_vo import SCRIPT, SPOKEN

HOP = 0.01  # 10 ms analysis frames


def speech_mask(y, sr):
    n = int(HOP * sr)
    frames = y[: len(y) // n * n].reshape(-1, n)
    rms = np.sqrt((frames ** 2).mean(1) + 1e-12)
    thr = max(np.percentile(rms, 95) * 0.06, 1e-4)
    m = rms > thr
    # close gaps shorter than 120 ms (stops inside words), drop blips shorter than 40 ms
    m = _close(m, 12); m = ~_close(~m, 4)
    return m, rms


def _close(m, k):
    m = m.copy(); i = 0
    while i < len(m):
        if not m[i]:
            j = i
            while j < len(m) and not m[j]: j += 1
            if 0 < i and j < len(m) and j - i < k: m[i:j] = True
            i = j
        else: i += 1
    return m


def segments(m):
    segs, i = [], 0
    while i < len(m):
        if m[i]:
            j = i
            while j < len(m) and m[j]: j += 1
            segs.append((i * HOP, j * HOP)); i = j
        else: i += 1
    return segs


def energy_align(y, sr):
    m, _ = speech_mask(y, sr)
    segs = segments(m)
    n = len(SCRIPT)
    if len(segs) < n:
        sys.exit(f"found {len(segs)} speech runs for {n} lines: leave a clear pause between lines, or use --engine mms")
    gaps = sorted(range(len(segs) - 1), key=lambda i: segs[i + 1][0] - segs[i][1], reverse=True)[: n - 1]
    cuts = sorted(gaps)
    groups, a = [], 0
    for c in cuts + [len(segs) - 1]:
        groups.append(segs[a:c + 1]); a = c + 1
    out = []
    for line, g in zip(SCRIPT, groups):
        words = line.split()
        weights = np.array([max(2, sum(len(t) for t in spoken_tokens(w, SPOKEN))) + 1.5 for w in words], float)
        # time inside this line that is actually speech
        spans = [(s, e) for s, e in g]
        total = sum(e - s for s, e in spans)
        bounds = np.concatenate([[0], np.cumsum(weights) / weights.sum() * total])

        def at(x):  # speech-time -> clock time
            for s, e in spans:
                if x <= e - s + 1e-9: return s + x
                x -= e - s
            return spans[-1][1]
        ws = [{"w": w, "start": round(at(bounds[k]), 3), "end": round(at(bounds[k + 1]), 3), "conf": 0.5} for k, w in enumerate(words)]
        # snap a boundary to an internal pause when one sits close by
        for k in range(1, len(ws)):
            b = ws[k]["start"]
            near = [(s1, e0) for (s0, e0), (s1, e1) in zip(spans, spans[1:]) if abs((e0 + s1) / 2 - b) < 0.18]
            if near:
                s1, e0 = near[0]; ws[k - 1]["end"] = round(e0, 3); ws[k]["start"] = round(s1, 3)
        out.append(ws)
    return out


def mms_align(y, sr):
    import torch, torchaudio
    bundle = torchaudio.pipelines.MMS_FA
    model = bundle.get_model(with_star=False).eval()
    wav = torch.from_numpy(y)[None]
    with torch.inference_mode():
        em, _ = model(wav)
    tok, aligner = bundle.get_tokenizer(), bundle.get_aligner()
    words = [w for line in SCRIPT for w in line.split()]
    pieces = [(wi, t) for wi, w in enumerate(words) for t in spoken_tokens(w, SPOKEN)]
    spans = aligner(em[0], tok([t for _, t in pieces]))
    ratio = wav.size(1) / em.size(1) / sr
    se = {}
    for (wi, _), sp in zip(pieces, spans):
        s, e = sp[0].start * ratio, sp[-1].end * ratio
        a = se.get(wi); se[wi] = (min(a[0], s), max(a[1], e)) if a else (s, e)
    out, k = [], 0
    for line in SCRIPT:
        ws = []
        for w in line.split():
            s, e = se[k]; ws.append({"w": w, "start": round(s, 3), "end": round(e, 3), "conf": 1.0}); k += 1
        out.append(ws)
    return out


def refine(lines, y, sr):
    """Pull each word's start back onto speech onset and keep words ordered and non-overlapping."""
    m, _ = speech_mask(y, sr)
    flat = [w for l in lines for w in l]
    for a, b in zip(flat, flat[1:]):
        if b["start"] < a["end"]: a["end"] = b["start"] = round((a["end"] + b["start"]) / 2, 3)
    for w in flat:
        i = int(w["start"] / HOP)
        j = i
        while j < len(m) - 1 and not m[j] and j - i < 15: j += 1  # skip leading silence up to 150 ms
        w["start"] = round(min(j * HOP, w["end"] - 0.04), 3)
    return lines


def main():
    engine = "energy" if "--engine" in sys.argv and sys.argv[sys.argv.index("--engine") + 1] == "energy" else "mms"
    y, sr = load_audio()
    if engine == "mms":
        try:
            lines = mms_align(y, sr)
        except ImportError:
            print("torch/torchaudio not installed: falling back to --engine energy (see the docstring for the mms command)")
            engine, lines = "energy", energy_align(y, sr)
    else:
        lines = energy_align(y, sr)
    lines = refine(lines, y, sr)
    data = {"lines": [{"i": i, "text": t, "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws}
                      for i, (t, ws) in enumerate(zip(SCRIPT, lines))],
            "extras": [], "notes": f"aligned with {engine} engine, refined against silences"}
    DATA.mkdir(exist_ok=True)
    (DATA / "lyrics.json").write_text(json.dumps(data, indent=1, ensure_ascii=False))
    print(f"wrote data/lyrics.json ({engine}): {len(SCRIPT)} lines, {sum(len(l) for l in lines)} words, "
          f"{data['lines'][0]['start']:.2f}-{data['lines'][-1]['end']:.2f} s")


if __name__ == "__main__":
    main()
