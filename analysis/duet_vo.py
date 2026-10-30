"""Claude Duet reel voiceover -> audio/duet/voiceover.{mp3,wav} (exactly 50.0 s), data/duet/lyrics.json, data/duet/layout.json
(the chapters, laid out from the voice on the 124 BPM grid) and the SRT (projects/claude-duet/output/subtitles.srt).

One ElevenLabs take of analysis/script_duet.py (Liam, eleven_turbo_v2_5, language hi), cut by its own character timestamps.
Lines on a 'natural' join stay one continuous slice of the take (the take's own pause: mid-sentence, or inside the hook).
Every other group starts on the first beat at least GAP after the previous group ends, its first word LEAD after the cut;
GAP is solved so the CTA ends END_HOLD before 50 s. Nothing is stretched. Takes are cached in audio/duet/takes/s<seed>.{mp3,json}
(no credits on a re-cut).

    python analysis/duet_vo.py [--seed 5] [--stt] [--new]          # build from one take
    python analysis/duet_vo.py --audition 5,12,21                   # make (or reuse) these takes, transcribe each, build nothing
"""
import json, math, pathlib, re, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_duet import LINES, VOICE, BEAT, E8, DURATION, FIRST_LINE, LEAD, GAP_RANGE, END_HOLD
import pkgfw_vo_v1 as v1   # ElevenLabs synthesis, alignment, ffmpeg, speech-to-text and SRT helpers

ROOT = v1.ROOT; SR = v1.SR
A = ROOT / "audio" / "duet"; D = ROOT / "data" / "duet"; O = ROOT / "projects" / "claude-duet" / "output"; TAKES = A / "takes"
PUNCT = r"[,.!?;:…।—]+$"


def script_text():
    """The take's text (no-break spaces sent as plain spaces) and each line's spoken word spans in it."""
    text, spans = "", []
    for _, _, line, _ in LINES:
        off = len(text) + (1 if text else 0); text += (" " if text else "") + line
        spans.append([(off + m.start(), off + m.end(), m.group()) for m in re.finditer(r"[^ ]+", line)])
    return text, text.replace(" ", " "), spans


def get_take(seed, new=False):
    text, sent, _ = script_text()
    TAKES.mkdir(parents=True, exist_ok=True)
    mp3p, alp = TAKES / f"s{seed}.mp3", TAKES / f"s{seed}.json"
    if not new and mp3p.exists() and alp.exists() and json.loads(alp.read_text(encoding="utf-8"))["text"] == sent:
        print(f"reusing {mp3p.name}"); meta = json.loads(alp.read_text(encoding="utf-8")); return mp3p.read_bytes(), meta["alignment"]
    print(f"new take: {len(sent)} characters, {VOICE['model']}, seed {seed}, speed {VOICE['speed']}")
    mp3, al = v1.synth(sent, VOICE, seed)
    mp3p.write_bytes(mp3); alp.write_text(json.dumps({"text": sent, "model": VOICE["model"], "seed": seed, "voice": VOICE, "alignment": al},
                                                     ensure_ascii=False), encoding="utf-8")
    return mp3, al


def audition(seeds):
    for s in seeds:
        mp3, al = get_take(s)
        y = v1.decode(mp3); n = sum(len(l[3].split()) for l in LINES)
        print(f"seed {s}: {len(y) / SR:.2f} s, {n / (len(y) / SR) * 60:.0f} wpm overall")
        for k in range(2): print(f"  heard {k + 1}: {v1.stt(mp3)}")


def main():
    if "--audition" in sys.argv: return audition([int(x) for x in v1.arg("--audition", "5").split(",")])
    seed = int(v1.arg("--seed", "5"))
    mp3, al = get_take(seed, "--new" in sys.argv)
    _, sent, spans = script_text()
    take = v1.decode(mp3); tm = v1.char_times(sent, al)
    # every line's words in the take
    L = []
    for (ch, join, line, disp), words in zip(LINES, spans):
        dw = disp.split(" "); assert len(dw) == len(words), f"{ch}: display has {len(dw)} words, spoken {len(words)}: {dw} / {[w for *_, w in words]}"
        ws = []
        for a, b, w in words:
            core = re.sub(PUNCT, "", w); bb = a + max(1, len(core))
            ws.append([tm[a][0], max(tm[bb - 1][1], tm[a][0] + 0.05)])
        L.append({"chapter": ch, "join": join, "disp": dw, "spoken": line, "ws": ws})
    # groups: a run of lines on natural joins is one slice of the take
    groups = []
    for i, l in enumerate(L):
        if i and l["join"] == "natural": groups[-1].append(i)
        else: groups.append([i])
    ceil_to = lambda t, q: math.ceil(t / q - 1e-9) * q

    def place(gap):
        """Each group's (cut, shift: reel time = take time + shift); and where the last word ends."""
        out, t_end = [], 0.0
        for gi, g in enumerate(groups):
            first = L[g[0]]["ws"][0][0]
            c0, p = (0.0, FIRST_LINE) if gi == 0 else (ceil_to(t_end + gap, BEAT), None)
            if p is None: p = c0 + LEAD
            out.append((c0, p - first)); t_end = L[g[-1]]["ws"][-1][1] + (p - first)
        return out, t_end
    target = DURATION - END_HOLD
    best = None
    for k in range(int((GAP_RANGE[1] - GAP_RANGE[0]) / 0.01) + 1):
        gap = GAP_RANGE[0] + 0.01 * k; pl, end = place(gap)
        if end <= target + 1e-6 and (best is None or end > best[2] + 1e-6): best = (gap, pl, end)
    if best is None:
        gap = GAP_RANGE[0]; pl, end = place(gap); best = (gap, pl, end)
        print(f"WARNING: even at GAP {gap:.2f} the CTA ends at {end:.2f} s, the end card gets only {DURATION - end:.2f} s")
    gap, pl, end = best
    # chapters: each group's cut; a chapter change inside a group cuts on the eighth just before its first word
    chapters, lines = [], []
    y = np.zeros(int(round(DURATION * SR)), np.float32)
    for (c0, sh), g in zip(pl, groups):
        s0, s1 = max(0.0, L[g[0]]["ws"][0][0] - 0.08), L[g[-1]]["ws"][-1][1] + 0.14
        seg = take[int(s0 * SR):int(s1 * SR)].copy(); f = int(0.006 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        p = int(round((s0 + sh) * SR)); y[p:p + len(seg)] += seg[:len(y) - p]
        for j, i in enumerate(g):
            l = L[i]; W = [{"w": d, "start": round(s + sh, 3), "end": round(e + sh, 3), "conf": 1.0} for d, (s, e) in zip(l["disp"], l["ws"])]
            if j == 0: cut = c0
            elif l["chapter"] != L[g[j - 1]]["chapter"]: cut = math.floor((W[0]["start"] - 0.06) / E8) * E8
            else: cut = None
            if cut is not None: chapters.append([round(cut, 4), None, l["chapter"]])
            lines.append({"i": i, "chapter": l["chapter"], "text": " ".join(l["disp"]), "spoken": l["spoken"].replace(" ", " "),
                          "start": W[0]["start"], "end": W[-1]["end"], "words": W})
    for k, c in enumerate(chapters): c[1] = chapters[k + 1][0] if k + 1 < len(chapters) else DURATION
    chapters.append([round(end + 0.35, 4), DURATION, "end"])          # the TECHPE TREK end card, after the payoff
    chapters[-2][1] = chapters[-1][0]
    y = 0.89 * y / (np.abs(y).max() + 1e-9)
    for p in (A, D, O): p.mkdir(parents=True, exist_ok=True)
    pcm = (y * 32767).astype(np.int16).tobytes()
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", str(A / "voiceover.mp3")], pcm)
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", str(A / "voiceover.wav")], pcm)
    (D / "lyrics.json").write_text(json.dumps({"lines": lines, "extras": [], "notes":
        f"ElevenLabs Liam {VOICE['model']} {VOICE['language']} seed {seed} speed {VOICE['speed']}; one take, laid out on the 124 BPM grid, GAP {gap:.2f} s"},
        indent=1, ensure_ascii=False), encoding="utf-8")
    (D / "layout.json").write_text(json.dumps({"duration": DURATION, "bpm": 60 / BEAT, "beat": BEAT, "bar": 4 * BEAT, "gap": round(gap, 3),
                                               "seed": seed, "chapters": chapters}, indent=1))
    # the SRT: cues of at most two lines of about 24 characters, from the final word times
    cues = []
    for l in lines:
        cur, n = [], 0
        for w in l["words"]:
            if cur and n + len(w["w"]) > 44: cues.append(cur); cur, n = [], 0
            cur.append(w); n += len(w["w"]) + 1
        if cur: cues.append(cur)

    def two_lines(ws):
        s = " ".join(w["w"] for w in ws)
        if len(s) <= 26: return s
        best_k = min(range(1, len(ws)), key=lambda k: abs(len(" ".join(w["w"] for w in ws[:k])) - len(s) / 2))
        return " ".join(w["w"] for w in ws[:best_k]) + "\n" + " ".join(w["w"] for w in ws[best_k:])
    srt = []
    for j, c in enumerate(cues):
        nxt = cues[j + 1][0]["start"] if j + 1 < len(cues) else DURATION
        srt.append(f"{j + 1}\n{v1.srt_time(c[0]['start'])} --> {v1.srt_time(min(c[-1]['end'] + 0.25, nxt - 0.02))}\n{two_lines(c)}\n")
    (O / "subtitles.srt").write_text("\n".join(srt), encoding="utf-8")
    for c in chapters:
        ls = [l for l in lines if l["chapter"] == c[2]]
        info = "  ".join(f"line {l['start']:6.2f}-{l['end']:6.2f} {len(l['words'])}w {len(l['words']) / (l['end'] - l['start']) * 60:3.0f} wpm" for l in ls)
        print(f"{c[2]:6s} [{c[0]:6.2f}-{c[1]:6.2f}] {info}")
    nw = sum(len(l["words"]) for l in lines); sp = sum(l["end"] - l["start"] for l in lines)
    print(f"GAP {gap:.2f} s; CTA ends {end:.2f} s; {DURATION:.1f} s; {nw} words, {nw / sp * 60:.0f} wpm while speaking; {len(srt)} SRT cues")
    if "--stt" in sys.argv: print("heard:", v1.stt(mp3))


if __name__ == "__main__":
    main()
