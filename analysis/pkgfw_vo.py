"""GitHub package firewall reel v3 voiceover -> audio/pkgfw/voiceover.{mp3,wav}, data/pkgfw/lyrics.json, data/pkgfw/layout.json
(the chapters, laid out from the voice on the 122 BPM grid) and the SRT (projects/github-package-firewall/output/pkgfw_captions.srt).

One ElevenLabs take of analysis/script_pkgfw.py (eleven_turbo_v2_5, language hi), cut into its lines by the voice's own
character timestamps. Layout: chapter 0 starts at 0 with its line at FIRST_LINE (after the caution buzzer); every later chapter starts on the first beat at
least GAP after the previous line ends, and its line enters LEAD later; the reel ends on the first bar line CTA_HOLD after
the last line. Nothing is stretched. Takes are cached in audio/pkgfw/takes/v3_s<seed>.{mp3,json} (no credits on a re-cut; v2's are v2_s<seed>).

    python analysis/pkgfw_vo.py [--seed 5] [--stt] [--new]
"""
import json, math, pathlib, re, sys

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_pkgfw import LINES, VOICE, BEAT, BAR, FIRST_LINE, LEAD, GAP, CTA_HOLD, MAX_LEN
import pkgfw_vo_v1 as v1   # ElevenLabs synthesis, alignment, ffmpeg and speech-to-text helpers

ROOT = v1.ROOT; SR = v1.SR; TAKES = ROOT / "audio" / "pkgfw" / "takes"


def main():
    seed = int(v1.arg("--seed", "5"))
    text, spans = "", []
    for _, line, _ in LINES:
        off = len(text) + (1 if text else 0); text += (" " if text else "") + line
        spans.append([(off + m.start(), off + m.end(), m.group()) for m in re.finditer(r"\S+", line)])
    TAKES.mkdir(parents=True, exist_ok=True)
    mp3p, alp = TAKES / f"v3_s{seed}.mp3", TAKES / f"v3_s{seed}.json"
    if "--new" not in sys.argv and mp3p.exists() and alp.exists() and json.loads(alp.read_text(encoding="utf-8"))["text"] == text:
        mp3, al = mp3p.read_bytes(), json.loads(alp.read_text(encoding="utf-8"))["alignment"]; print(f"reusing {mp3p.name}")
    else:
        print(f"new take: {len(text)} characters, {VOICE['model']}, seed {seed}")
        mp3, al = v1.synth(text, VOICE, seed)
        mp3p.write_bytes(mp3); alp.write_text(json.dumps({"text": text, "model": VOICE["model"], "seed": seed, "alignment": al}, ensure_ascii=False), encoding="utf-8")
    take = v1.decode(mp3); tm = v1.char_times(text, al)
    # cut each line out of the take
    segs = []
    for (ch, line, disp), words in zip(LINES, spans):
        dw = disp.split(); assert len(dw) == len(words), f"{ch}: display has {len(dw)} words, spoken {len(words)}"
        ws = []
        for a, b, w in words:
            core = re.sub(r"[,.!?;:…।—]+$", "", w); bb = a + max(1, len(core))
            ws.append([w, tm[a][0], max(tm[bb - 1][1], tm[a][0] + 0.05)])
        s0, s1 = max(0.0, ws[0][1] - 0.08), ws[-1][2] + 0.12
        segs.append((ch, disp, dw, ws, s0, s1, take[int(s0 * SR):int(s1 * SR)].copy()))
    # lay the chapters out on the beat grid
    ceil_to = lambda t, q: math.ceil(t / q - 1e-9) * q
    chapters, lines, starts = [], [], []
    t_line_end = 0.0
    for i, (ch, disp, dw, ws, s0, s1, seg) in enumerate(segs):
        c0 = 0.0 if i == 0 else ceil_to(t_line_end + GAP, BEAT)
        p0 = FIRST_LINE if i == 0 else c0 + LEAD
        starts.append(c0)
        at = lambda t: round(p0 + (t - s0), 3)
        W = [{"w": d, "start": at(s), "end": at(e), "conf": 1.0} for d, (w, s, e) in zip(dw, ws)]
        lines.append({"i": i, "chapter": ch, "text": disp, "spoken": LINES[i][1], "start": W[0]["start"], "end": W[-1]["end"], "words": W,
                      "place": round(p0, 3)})
        t_line_end = p0 + len(seg) / SR
    duration = ceil_to(t_line_end + CTA_HOLD, BAR)
    for i, (ch, *_r) in enumerate(segs):
        chapters.append([round(starts[i], 4), round(starts[i + 1] if i + 1 < len(starts) else duration, 4), ch])
    if duration > MAX_LEN: print(f"WARNING: {duration:.2f} s is over the {MAX_LEN:.0f} s cap")
    y = np.zeros(int(round(duration * SR)), np.float32)
    for l, (_, _, _, _, _, _, seg) in zip(lines, segs):
        f = int(0.006 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        p = int(l["place"] * SR); y[p:p + len(seg)] += seg[:len(y) - p]
    y = 0.89 * y / (np.abs(y).max() + 1e-9)
    A = ROOT / "audio" / "pkgfw"; D = ROOT / "data" / "pkgfw"; O = ROOT / "projects" / "github-package-firewall" / "output"
    for p in (A, D, O): p.mkdir(parents=True, exist_ok=True)
    pcm = (y * 32767).astype(np.int16).tobytes()
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", str(A / "voiceover.mp3")], pcm)
    v1.ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", str(A / "voiceover.wav")], pcm)
    (D / "lyrics.json").write_text(json.dumps({"lines": lines, "extras": [], "notes":
        f"ElevenLabs Liam {VOICE['model']} {VOICE['language']} seed {seed} speed {VOICE['speed']}; one take cut into lines, laid out on the 122 BPM grid"},
        indent=1, ensure_ascii=False), encoding="utf-8")
    (D / "layout.json").write_text(json.dumps({"duration": round(duration, 4), "bpm": 60 / BEAT, "beat": BEAT, "bar": BAR,
                                               "chapters": chapters}, indent=1))
    cues = []
    for l in lines:
        cur, n = [], 0
        for w in l["words"]:
            if cur and n + len(w["w"]) > 24: cues.append(cur); cur, n = [], 0
            cur.append(w); n += len(w["w"]) + 1
        if cur: cues.append(cur)
    srt = [f"{j + 1}\n{v1.srt_time(c[0]['start'])} --> {v1.srt_time(c[-1]['end'] + 0.15)}\n{' '.join(w['w'] for w in c)}\n" for j, c in enumerate(cues)]
    (O / "pkgfw_captions.srt").write_text("\n".join(srt), encoding="utf-8")
    for c, l in zip(chapters, lines):
        print(f"{c[2]:8s} [{c[0]:6.2f}-{c[1]:6.2f}] line {l['start']:6.2f}-{l['end']:6.2f}  {len(l['words'])} words  {len(l['words']) / (l['end'] - l['start']) * 60:4.0f} wpm")
    print(f"duration {duration:.3f} s, {sum(len(l['words']) for l in lines)} words, {len(srt)} SRT cues")
    if "--stt" in sys.argv: print("heard:", v1.stt(mp3))


if __name__ == "__main__":
    main()
