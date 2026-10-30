"""DOTS short: voices -> audio/dots/voiceover.mp3 (exactly 96.000 s), audio/dots/vo_narrator.wav + vo_mascots.wav (for the
mix) and data/dots/lyrics.json (word timings, speaker per line).

One ElevenLabs eleven_v3 take per speaker (analysis/script_dots.py VOICES: Liam narrates, five premade voices for the
mascots), language hi. Each take is cut into its lines by the voice's own character timestamps and every line is placed at
its start time. Mascot lines get a pitch lift (formant-shifting, cartoon register; duration kept). A line longer than its
window first has its pauses squeezed to 0.07 s, then a pitch-preserving atempo (at most x1.25; word timings follow).

    python analysis/dots_vo.py [--seed 7] [--stability 0.0] [--only N,P] [--reuse] [--stt]
--reuse re-cuts from the saved takes in audio/dots/takes (no credits). Needs ELEVENLABS_API_KEY and ffmpeg.
"""
import base64, glob, json, os, pathlib, re, shutil, subprocess, sys, time, urllib.request, uuid, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_dots import LINES, DURATION, VO_END, LANGUAGE, VOICES, NARRATOR_MODEL, NARRATOR_SPEED

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 44100
TAG = re.compile(r"\[[^\]]+\]\s*")
TAKES = ROOT / "audio" / "dots" / "takes"


def arg(name, default):
    for i, a in enumerate(sys.argv):
        if a == name and i + 1 < len(sys.argv): return sys.argv[i + 1]
        if a.startswith(name + "="): return a[len(name) + 1:]
    return default


def key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h: k = winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0]
    return k.strip()


def model_of(spk): return NARRATOR_MODEL if spk in ("N", "H") else "eleven_v3"


def synth(text, voice, model, seed, stability):
    vs = {"stability": stability, "similarity_boost": 0.75}
    if model != "eleven_v3": vs.update(stability=max(stability, 0.4), speed=NARRATOR_SPEED)
    body = {"text": text, "model_id": model, "seed": seed, "language_code": LANGUAGE, "voice_settings": vs}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": key(), "Content-Type": "application/json"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r: d = json.loads(r.read())
            return base64.b64decode(d["audio_base64"]), d.get("alignment") or d["normalized_alignment"]
        except Exception as e:
            print("  retry:", e); time.sleep(10 * (i + 1))
    sys.exit("synthesis failed")


def char_times(text, al):
    chars, cs, ce = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    if "".join(chars) == text: return list(zip(cs, ce))
    out, j = [], 0
    for ch in text:
        k = j
        while k < len(chars) and chars[k] != ch and k - j < 40: k += 1
        if k < len(chars) and chars[k] == ch: j = k
        jj = min(j, len(chars) - 1); out.append((cs[jj], ce[jj]))
        if k < len(chars) and chars[k] == ch: j += 1
    return out


def ff(args, data=None):
    return subprocess.run(["ffmpeg", "-loglevel", "error", *args], input=data, capture_output=True, check=True).stdout


def decode(mp3):
    return np.frombuffer(ff(["-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"], mp3), np.float32).copy()


def filt(y, af):
    return np.frombuffer(ff(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-af", af, "-f", "f32le", "pipe:1"],
                            y.astype(np.float32).tobytes()), np.float32).copy()


def pitch(y, st):
    if not st: return y
    r = 2 ** (st / 12)
    out = filt(y, f"asetrate={SR * r:.0f},aresample={SR},atempo={1 / r:.5f}")
    return np.pad(out, (0, max(0, len(y) - len(out))))[:len(y)]


def stt(mp3):
    b = uuid.uuid4().hex
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\nhin\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"t.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() + mp3 + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
                                 headers={"xi-api-key": key(), "Content-Type": f"multipart/form-data; boundary={b}"})
    for wait in (0, 15, 30):
        time.sleep(wait)
        try:
            with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read()).get("text", "")
        except Exception as e: print("  stt retry:", e)
    return "(transcription failed)"


def take_text(spk, base=None):
    """The speaker's lines joined into one take, and where each line's spoken words sit inside it. With `base` (the saved
    text of an existing take) each line is found inside that text instead, so a take stays usable after other lines move
    to their own takes (e.g. the hook)."""
    text, spans, pos = "", {}, 0
    for i, (_, _, s, line, _) in enumerate(LINES):
        if s != spk: continue
        if model_of(spk) != "eleven_v3": line = TAG.sub("", line)   # only v3 follows [tags]; others would read them out
        if base is None: off = len(text) + (1 if text else 0); text += (" " if text else "") + line
        else:
            off = base.find(line, pos); assert off >= 0, f"line {i} not in the saved take text of {spk}"; pos = off + len(line)
        tags = [(t.start(), t.end()) for t in TAG.finditer(line)]
        spans[i] = [(off + m.start(), off + m.end(), m.group()) for m in re.finditer(r"\S+", line)
                    if not any(a <= m.start() < b for a, b in tags)]
    return (text if base is None else base), spans


def word_times(times, words):
    ws = []
    for a, b, w in words:
        core = re.sub(r"[,.!?;:…।—]+$", "", w); bb = a + max(1, len(core))
        ws.append([w, times[a][0], max(times[bb - 1][1], times[a][0] + 0.05)])
    return ws


def line_bounds(take, times, spans, text):
    """Where each line of a take really starts and ends. The aligner can time short words after a [tag] up to 0.5 s off
    ("Content!" aligned 1.85-2.25 s, heard 1.33-2.08 s), so each boundary between two lines snaps to the silent gap
    (>= 0.10 s, 38 dB under the peak) nearest the aligned boundary; word times are then remapped into the real span."""
    h = int(0.01 * SR); n = len(take) // h
    e = 20 * np.log10(np.sqrt(np.mean(take[:n * h].reshape(n, h) ** 2, 1)) + 1e-9); act = e > e.max() - 38
    gaps, j = [], 0
    while j < n:
        if not act[j]:
            k = j
            while k < n and not act[k]: k += 1
            if k - j >= 10: gaps.append((j / 100, k / 100))
            j = k
        else: j += 1
    order = sorted(spans); ws = {i: word_times(times, spans[i]) for i in order}
    A = {i: ws[i][0][1] for i in order}; B = {i: ws[i][-1][2] for i in order}
    lo = {i: A[i] - 0.10 for i in order}; hi = {i: B[i] + 0.12 for i in order}
    on = np.nonzero(act)[0]
    def near_gap(m):
        cand = [(max(g0 - m, m - g1, 0), g0, g1) for g0, g1 in gaps]
        return min(cand) if cand else (9, 0, 0)
    first, last = order[0], order[-1]; a0, bN = spans[first][0][0], spans[last][-1][1]
    if not TAG.sub('', text[:a0]).strip():   # the take starts with this line (only [tags] before it): the first real sound (skips a lone click at 0 s)
        runs = [j for j in range(n - 5) if act[j:j + 5].all()]
        if runs and runs[0] / 100 < B[first]: lo[first] = max(0.0, runs[0] / 100 - 0.04)
    else:         # unused text before it (a line that moved to its own take): snap to the silence after that text
        d, g0, g1 = near_gap((times[a0 - 2][1] + A[first]) / 2)
        if d < 0.6: lo[first] = max(g0 + 0.06, g1 - 0.04)
    if not TAG.sub('', text[bN:]).strip():   # the take ends with this line
        if len(on) and abs(on[-1] / 100 - B[last]) < 0.6: hi[last] = on[-1] / 100 + 0.08
    else:
        d, g0, g1 = near_gap((B[last] + times[bN + 1][0]) / 2)
        if d < 0.6: hi[last] = g0 + 0.06
    for x, y in zip(order, order[1:]):
        m = (B[x] + A[y]) / 2
        cand = [(max(g0 - m, m - g1, 0), g0, g1) for g0, g1 in gaps]
        if cand:
            d, g0, g1 = min(cand)
            if d < 0.6: hi[x] = g0 + 0.06; lo[y] = max(g0 + 0.06, g1 - 0.04)
    out = {}
    for i in order:
        s0, s1 = lo[i], hi[i]; a, b = s0 + 0.04, s1 - 0.08
        k = (b - a) / max(1e-3, B[i] - A[i])
        out[i] = (s0, s1, [[w, a + (t0 - A[i]) * k, a + (t1 - A[i]) * k] for w, t0, t1 in ws[i]])
    return out


def cut_line(take, s0, s1, ws, room):
    """Cut one line out of a take; squeeze pauses then speed up (<= x1.25) if it is longer than `room` s."""
    seg = take[int(s0 * SR):int(s1 * SR)].copy(); raw = len(seg) / SR; k = 1.0
    if raw > room:
        groups = []   # a punctuation-only token stays with the word before it (never cut around a dash)
        for j, (w, a_, b_) in enumerate(ws):
            if groups and not re.search(r"\w", w): groups[-1][2] = max(groups[-1][2], b_); groups[-1][3].append(j)
            else: groups.append([w, a_, b_, [j]])
        parts, t_new, ws2 = [], 0.0, [None] * len(ws)
        for g, (w, a_, b_, idx) in enumerate(groups):
            a0 = s0 if g == 0 else max(a_ - 0.035, groups[g - 1][2])
            b1 = s1 if g == len(groups) - 1 else min(b_ + 0.035, groups[g + 1][1])
            parts.append(take[int(a0 * SR):int(b1 * SR)])
            for j in idx: ws2[j] = [ws[j][0], s0 + t_new + (ws[j][1] - a0), s0 + t_new + (ws[j][2] - a0)]
            t_new += (b1 - a0)
        seg = np.concatenate(parts); ws = ws2
    if len(seg) / SR > room:
        k = min(1.25, (len(seg) / SR) / room); seg = filt(seg, f"atempo={k:.5f}")
    rel = [(w, (s - s0) / k, (e - s0) / k) for w, s, e in ws]
    return seg, rel, raw, k


def main():
    seed, stab = int(arg("--seed", "7")), float(arg("--stability", "0.0"))
    only = arg("--only", "").split(",") if arg("--only", "") else list(VOICES)
    TAKES.mkdir(parents=True, exist_ok=True)
    tracks = {"N": np.zeros(int(round(DURATION * SR)), np.float32), "M": np.zeros(int(round(DURATION * SR)), np.float32)}
    lines, report = [None] * len(LINES), []
    takes = {}
    for spk, (voice, name, st) in VOICES.items():
        mp3p, alp, txp = TAKES / f"take_{spk}.mp3", TAKES / f"align_{spk}.json", TAKES / f"text_{spk}.txt"
        fresh = spk in only and "--reuse" not in sys.argv
        text, spans = take_text(spk, None if fresh or not txp.exists() else txp.read_text(encoding="utf-8"))
        if fresh: txp.write_text(text, encoding="utf-8")
        if fresh:
            voice = arg("--voice-" + spk, voice)
            print(f"synth {spk} ({name if voice == VOICES[spk][0] else voice}): {len(text)} chars"); mp3, al = synth(text, voice, model_of(spk), int(arg("--seed-" + spk, seed)), stab)
            mp3p.write_bytes(mp3); alp.write_text(json.dumps(al))
        else:
            mp3, al = mp3p.read_bytes(), json.loads(alp.read_text())
        if "--stt" in sys.argv and spk in only: print(f"  heard {spk}:", stt(mp3))
        take = decode(mp3); takes[spk] = (take, line_bounds(take, char_times(text, al), spans, text), spans, st)
    for i in sorted(range(len(LINES)), key=lambda i: LINES[i][0]):   # in time order, so no line overlaps the one before it
        c0, c1, spk, line, disp = LINES[i]
        take, bounds, spans, st = takes[spk]; words = spans[i]
        dw = disp.split(); assert len(dw) == len(words), f"line {i}: display has {len(dw)} words, spoken {len(words)}"
        prev_end = max([l["end"] for l in lines if l] or [0])
        lead = 0.0 if c0 == 0 else max(0.06, prev_end + 0.10 - c0)
        room = VO_END.get(i, c1) - 0.12 - (c0 + lead)
        seg, rel, raw, k = cut_line(take, *bounds[i], room)
        seg = pitch(seg, st)
        f = int(0.006 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        tr = tracks["N" if spk in ("N", "H") else "M"]; p0 = int((c0 + lead) * SR); tr[p0:p0 + len(seg)] += seg[:len(tr) - p0]
        W = [{"w": d, "start": round(c0 + lead + s, 3), "end": round(c0 + lead + e, 3)} for d, (_, s, e) in zip(dw, rel)]
        lines[i] = {"i": i, "who": spk, "text": disp, "spoken": TAG.sub("", line).strip(), "start": W[0]["start"], "end": W[-1]["end"],
                    "words": W, "window": [c0, c1]}
        report.append((i, f"line {i:2d} {spk} [{c0:5.2f}-{c1:5.2f}] lead {lead:4.2f} raw {raw:4.2f}s room {room:4.2f}s tempo x{k:.3f}"
                          f"{'  TOO LONG' if len(seg) / SR > room + 0.01 else ''}  {disp}"))
    peak = max(np.abs(tracks["N"]).max(), np.abs(tracks["M"]).max()) + 1e-9
    out = ROOT / "audio" / "dots"; out.mkdir(parents=True, exist_ok=True)
    for name, y in (("vo_narrator", tracks["N"]), ("vo_mascots", tracks["M"])):
        with wave.open(str(out / f"{name}.wav"), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((0.89 * y / peak * 32767).astype(np.int16).tobytes())
    y = 0.89 * (tracks["N"] + tracks["M"]) / (np.abs(tracks["N"] + tracks["M"]).max() + 1e-9)
    ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", str(out / "voiceover.mp3")],
       (y * 32767).astype(np.int16).tobytes())
    D = ROOT / "data" / "dots"; D.mkdir(parents=True, exist_ok=True)
    (D / "lyrics.json").write_text(json.dumps({"lines": lines, "extras": [], "notes": f"eleven_v3, language {LANGUAGE}, seed {seed}, "
                                   f"stability {stab}; one take per speaker: " + ", ".join(f"{k}={v[1]}{'+' + str(v[2]) + 'st' if v[2] else ''}" for k, v in VOICES.items())},
                                  indent=1, ensure_ascii=False), encoding="utf-8")
    print("\n".join(r for _, r in sorted(report))); print(f"wrote {out / 'voiceover.mp3'} ({len(y) / SR:.3f} s) and {D / 'lyrics.json'}")


if __name__ == "__main__":
    main()
