"""GitHub package firewall reel voiceover -> audio/pkgfw/voiceover.mp3 + .wav (exactly DURATION), data/pkgfw/lyrics.json,
and the SRT captions (projects/github-package-firewall/output/pkgfw_captions.srt), all from the voice's own timestamps.

Two ElevenLabs takes of analysis/script_pkgfw.py, one per voice group: the hook lines (eleven_v3, [excited]) and the body
(eleven_turbo_v2_5, language hi). Each take is cut into its lines by its character timestamps; each line starts at the start of
its window. A line longer than its window first has the pauses between its words shortened (to 0.07 s), then if still
long a pitch-preserving atempo (at most x1.15; word timings follow both). The hook is levelled to the body.
Takes are cached in audio/pkgfw/takes/<group>_s<seed>.{mp3,json} and reused while their text is unchanged (no credits).

    python analysis/pkgfw_vo.py [--seed-hook 3] [--seed-body 12] [--stt] [--new hook|body|all]
Needs ELEVENLABS_API_KEY (user environment variable) and ffmpeg.
"""
import base64, glob, json, os, pathlib, re, shutil, subprocess, sys, time, urllib.request, uuid

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_pkgfw_v1 import LINES, DURATION, VOICE_GROUPS, MAX_TEMPO

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICE = "TX3LPaxmHKxFdv7VOQHJ"  # ElevenLabs "Liam"
SR = 44100
TAG = re.compile(r"\[[^\]]+\]\s*")
TAKES = ROOT / "audio" / "pkgfw" / "takes"


def arg(name, default):
    for i, a in enumerate(sys.argv):
        if a == name and i + 1 < len(sys.argv): return sys.argv[i + 1]
    return default


def key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h: k = winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0]
    return k.strip()


def synth(text, g, seed):
    vs = {"stability": g["stability"], "similarity_boost": 0.75}
    if "speed" in g: vs["speed"] = g["speed"]
    body = {"text": text, "model_id": g["model"], "seed": seed, "language_code": g["language"], "voice_settings": vs}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": key(), "Content-Type": "application/json"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r: d = json.loads(r.read())
            return base64.b64decode(d["audio_base64"]), d.get("alignment") or d["normalized_alignment"]
        except Exception as e:
            print("  retry:", e); time.sleep(10 * (i + 1))
    sys.exit("synthesis failed")


def take(group, text, seed):
    """The cached take for this group and seed, or a new one (costs credits) when the text changed or --new asks."""
    TAKES.mkdir(parents=True, exist_ok=True)
    mp3p, alp = TAKES / f"{group}_s{seed}.mp3", TAKES / f"{group}_s{seed}.json"
    new = arg("--new", "") in (group, "all")
    if not new and mp3p.exists() and alp.exists():
        meta = json.loads(alp.read_text(encoding="utf-8"))
        if meta["text"] == text and meta["model"] == VOICE_GROUPS[group]["model"]:
            print(f"{group}: reusing {mp3p.name}"); return mp3p.read_bytes(), meta["alignment"]
    print(f"{group}: new take, {len(TAG.sub('', text))} characters, {VOICE_GROUPS[group]['model']}, seed {seed}")
    mp3, al = synth(text, VOICE_GROUPS[group], seed)
    mp3p.write_bytes(mp3)
    alp.write_text(json.dumps({"text": text, "model": VOICE_GROUPS[group]["model"], "seed": seed, "alignment": al}, ensure_ascii=False), encoding="utf-8")
    return mp3, al


def char_times(text, al):
    """Start/end time for every character of `text`, matched in order against the alignment's characters."""
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


def atempo(y, k):
    return np.frombuffer(ff(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-af", f"atempo={k:.5f}", "-f", "f32le", "pipe:1"],
                            y.tobytes()), np.float32).copy()


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


def voiced_rms(x):
    return float(np.sqrt(np.mean(x[np.abs(x) > 0.05 * np.abs(x).max()] ** 2)))


def srt_time(t):
    ms = int(round(t * 1000)); return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main():
    seeds = {"hook": int(arg("--seed-hook", "3")), "body": int(arg("--seed-body", "12"))}
    # each group's take text, and where every line's spoken words sit inside it
    texts, spans = {g: "" for g in VOICE_GROUPS}, []
    for g, _, _, line, _ in LINES:
        off = len(texts[g]) + (1 if texts[g] else 0); texts[g] += (" " if texts[g] else "") + line
        tags = [(m.start(), m.end()) for m in TAG.finditer(line)]
        spans.append([(off + m.start(), off + m.end(), m.group()) for m in re.finditer(r"\S+", line)
                      if not any(a <= m.start() < b for a, b in tags)])
    takes = {g: take(g, texts[g], seeds[g]) for g in VOICE_GROUPS}
    audio = {g: decode(mp3) for g, (mp3, _) in takes.items()}
    level = voiced_rms(audio["body"]) / voiced_rms(audio["hook"])
    audio["hook"] = audio["hook"] * level                     # the hook at the body's level
    times = {g: char_times(texts[g], al) for g, (_, al) in takes.items()}
    y = np.zeros(int(round(DURATION * SR)), np.float32); lines, report = [], []
    for i, ((g, w0, w1, line, disp), words) in enumerate(zip(LINES, spans)):
        dw = disp.split(); assert len(dw) == len(words), f"line {i}: display has {len(dw)} words, spoken {len(words)}"
        tk, tm = audio[g], times[g]
        ws = []
        for a, b, w in words:
            core = re.sub(r"[,.!?;:…।—]+$", "", w); bb = a + max(1, len(core))
            ws.append([w, tm[a][0], max(tm[bb - 1][1], tm[a][0] + 0.05)])
        s0, s1 = max(0.0, ws[0][1] - 0.10), ws[-1][2] + 0.12
        seg = tk[int(s0 * SR):int(s1 * SR)].copy()
        lead = 0.0 if not lines else max(0.0, lines[-1]["end"] + 0.10 - w0)   # never overlap the previous line
        allowed = w1 - (w0 + lead); k = 1.0; raw = len(seg) / SR
        if raw > allowed:   # shorten the pauses between words first (keep 0.07 s)
            parts, t_new, ws2 = [], 0.0, []
            for j, (w, a_, b_) in enumerate(ws):
                a0 = s0 if j == 0 else max(a_ - 0.035, ws[j - 1][2])
                b1 = s1 if j == len(ws) - 1 else min(b_ + 0.035, ws[j + 1][1])
                parts.append(tk[int(a0 * SR):int(b1 * SR)])
                ws2.append([w, s0 + t_new + (a_ - a0), s0 + t_new + (b_ - a0)]); t_new += (b1 - a0)
            seg = np.concatenate(parts); ws = ws2; s1 = s0 + len(seg) / SR
        if len(seg) / SR > allowed:
            k = min(MAX_TEMPO[g], (len(seg) / SR) / allowed); seg = atempo(seg, k)
        f = int(0.006 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        p0 = int((w0 + lead) * SR); y[p0:p0 + len(seg)] += seg[:len(y) - p0]
        at = lambda t: round(w0 + lead + (t - s0) / k, 3)
        W = [{"w": d, "start": at(s), "end": at(e), "conf": 1.0} for d, (w, s, e) in zip(dw, ws)]
        lines.append({"i": i, "group": g, "text": disp, "spoken": TAG.sub("", line).strip(), "start": W[0]["start"], "end": W[-1]["end"],
                      "words": W, "window": [round(w0, 3), round(w1, 3)]})
        over = (w0 + lead + len(seg) / SR) - w1
        report.append(f"line {i} {g:4s} [{w0:5.2f}-{w1:5.2f}] raw {raw:5.2f}s -> {len(seg) / SR:5.2f}s (room {allowed:5.2f}s) tempo x{k:.3f} "
                      f"{len(W) / (len(seg) / SR) * 60:4.0f} wpm{'  OVER BY %.2fs' % over if over > 0.02 else ''}")
    y = 0.89 * y / (np.abs(y).max() + 1e-9)
    A = ROOT / "audio" / "pkgfw"; D = ROOT / "data" / "pkgfw"; O = ROOT / "projects" / "github-package-firewall" / "output"
    for p in (A, D, O): p.mkdir(parents=True, exist_ok=True)
    pcm = (y * 32767).astype(np.int16).tobytes()
    ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", str(A / "voiceover.mp3")], pcm)
    ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", str(A / "voiceover.wav")], pcm)
    (D / "lyrics.json").write_text(json.dumps({"lines": lines, "extras": [], "notes":
        f"ElevenLabs voice {VOICE} (Liam): hook eleven_v3 seed {seeds['hook']}, body eleven_turbo_v2_5 hi seed {seeds['body']} "
        f"(speed {VOICE_GROUPS['body'].get('speed', 1)}); each line cut from its take and placed at its window start"},
        indent=1, ensure_ascii=False), encoding="utf-8")
    # SRT: the same chunks the on-screen captions show (about 24 characters), timed by the words
    cues = []
    for l in lines:
        cur, n = [], 0
        for w in l["words"]:
            if cur and n + len(w["w"]) > 24: cues.append(cur); cur, n = [], 0
            cur.append(w); n += len(w["w"]) + 1
        if cur: cues.append(cur)
    srt = [f"{j + 1}\n{srt_time(c[0]['start'])} --> {srt_time(c[-1]['end'] + 0.15)}\n{' '.join(w['w'] for w in c)}\n" for j, c in enumerate(cues)]
    (O / "pkgfw_captions.srt").write_text("\n".join(srt), encoding="utf-8")
    print("\n".join(report)); print(f"wrote voiceover.mp3/.wav ({len(y) / SR:.3f} s), lyrics.json, pkgfw_captions.srt ({len(srt)} cues)")
    if "--stt" in sys.argv:
        for g, (mp3, _) in takes.items(): print(f"heard ({g}):", stt(mp3))


if __name__ == "__main__":
    main()
