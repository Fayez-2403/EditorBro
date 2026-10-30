"""Grok Bot reel voiceover -> audio/grokbot/voiceover.mp3 (exactly 58.000 s) and data/grokbot/lyrics.json.

One continuous ElevenLabs take of analysis/script_grokbot.py (eleven_v3 follows the [tags]). The take is cut into its lines
by the voice's own character timestamps, and each line is placed at the start of its chapter. A line longer than its
chapter (less 0.15 s) first has its pauses between words shortened to 0.07 s, then, if still long, a pitch-preserving
atempo (at most x1.25; word timings follow both).

    python analysis/grokbot_vo.py [--seed 7] [--stability 0.0] [--out-dir <dir>] [--stt] [--reuse <dir with take.mp3 + align.json>]
Needs ELEVENLABS_API_KEY (user environment variable) and ffmpeg.
"""
import base64, glob, json, os, pathlib, re, shutil, subprocess, sys, time, urllib.request, uuid

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from script_grokbot import LINES, DURATION, VO_END, VO_LEAD, LANGUAGE

if not shutil.which("ffmpeg"):
    c = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if c: os.environ["PATH"] = c[0] + os.pathsep + os.environ.get("PATH", "")

ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICE = "TX3LPaxmHKxFdv7VOQHJ"  # ElevenLabs "Liam"
SR = 44100
TAG = re.compile(r"\[[^\]]+\]\s*")


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


def synth(text, seed, stability):
    body = {"text": text, "model_id": "eleven_v3", "seed": seed, "language_code": LANGUAGE,
            "voice_settings": {"stability": stability, "similarity_boost": 0.75}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": key(), "Content-Type": "application/json"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r: d = json.loads(r.read())
            return base64.b64decode(d["audio_base64"]), d.get("alignment") or d["normalized_alignment"]
        except Exception as e:
            print("  retry:", e); time.sleep(10 * (i + 1))
    sys.exit("synthesis failed")


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
            f"--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\n{"hin" if LANGUAGE == "hi" else "eng"}\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"t.mp3\"\r\nContent-Type: audio/mpeg\r\n\r\n").encode() + mp3 + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
                                 headers={"xi-api-key": key(), "Content-Type": f"multipart/form-data; boundary={b}"})
    for wait in (0, 15, 30):
        time.sleep(wait)
        try:
            with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read()).get("text", "")
        except Exception as e: print("  stt retry:", e)
    return "(transcription failed)"


def main():
    seed, stab = int(arg("--seed", "7")), float(arg("--stability", "0.0"))
    out_dir = pathlib.Path(arg("--out-dir", ""))
    audio_out = out_dir / "voiceover.mp3" if arg("--out-dir", "") else ROOT / "audio" / "grokbot" / "voiceover.mp3"
    lyr_out = out_dir / "lyrics.json" if arg("--out-dir", "") else ROOT / "data" / "grokbot" / "lyrics.json"
    text, spans = "", []
    for _, _, line, _disp in LINES:   # where each line's spoken words sit inside the take
        off = len(text) + (1 if text else 0); text += (" " if text else "") + line
        words = []
        for m in re.finditer(r"\S+", line):
            if any(a <= m.start() < b for a, b in ((t.start(), t.end()) for t in TAG.finditer(line))): continue
            words.append((off + m.start(), off + m.end(), m.group()))
        spans.append(words)
    if arg("--reuse", ""):
        R = pathlib.Path(arg("--reuse", "")); mp3 = (R / "take.mp3").read_bytes(); al = json.loads((R / "align.json").read_text())
    else:
        mp3, al = synth(text, seed, stab)
    if arg("--out-dir", ""):
        out_dir.mkdir(parents=True, exist_ok=True); (out_dir / "take.mp3").write_bytes(mp3); (out_dir / "align.json").write_text(json.dumps(al))
    take = decode(mp3); times = char_times(text, al)
    y = np.zeros(int(round(DURATION * SR)), np.float32); lines, report = [], []
    for i, ((c0, c1, line, disp), words) in enumerate(zip(LINES, spans)):
        dw = disp.split(); assert len(dw) == len(words), f"line {i}: display has {len(dw)} words, spoken {len(words)}" 
        ws = []
        for a, b, w in words:
            core = re.sub(r"[,.!?;:…।—]+$", "", w); bb = a + max(1, len(core))   # punctuation only (Devanagari vowel signs are not \w)
            ws.append([w, times[a][0], max(times[bb - 1][1], times[a][0] + 0.05)])
        s0, s1 = max(0.0, ws[0][1] - 0.10), ws[-1][2] + 0.12   # 0.10 s lead-in: the aligner can place a first word late (clipped "Bro")
        seg = take[int(s0 * SR):int(s1 * SR)].copy()
        lead = 0.0 if i == 0 else max(VO_LEAD.get(i, 0.08), (lines[-1]["end"] + 0.12 - c0) if lines else 0)   # never overlap the previous line
        vo_end = VO_END.get(i, c1)   # a line may run a little past its visual chapter (timing only)
        allowed = (vo_end - 0.15) - (c0 + lead); k = 1.0; raw = len(seg) / SR
        if raw > allowed:   # shorten the pauses between words first (keep 0.07 s), re-basing the word times
            # chunks = real words; a punctuation-only token (e.g. a dash) stays inside the word before it, never cut around
            # (the aligner can time a word short and put its sound under the dash: cutting there clipped "Bro")
            groups = []
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
            s1 = s0 + len(seg) / SR
        if len(seg) / SR > allowed:
            k = min(1.25, (len(seg) / SR) / allowed); seg = atempo(seg, k)
        f = int(0.006 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
        p0 = int((c0 + lead) * SR); y[p0:p0 + len(seg)] += seg[:len(y) - p0]
        at = lambda t: round(c0 + lead + (t - s0) / k, 3)
        W = [{"w": d, "start": at(s), "end": at(e), "conf": 1.0} for d, (w, s, e) in zip(dw, ws)]   # captions show the Roman Hinglish
        lines.append({"i": i, "text": disp, "spoken": TAG.sub("", line).strip(), "start": W[0]["start"], "end": W[-1]["end"], "words": W,
                      "chapter": [c0, c1]})
        report.append(f"line {i:2d} [{c0:4.1f}-{c1:4.1f}] raw {raw:5.2f}s -> {(s1 - s0):5.2f}s / room {allowed:5.2f}s  tempo x{k:.3f}  "
                      f"{len(W) / ((s1 - s0) / k) * 60:4.0f} wpm  {'TOO FAST' if k > 1.25 else ''}")
    y = 0.89 * y / (np.abs(y).max() + 1e-9)
    audio_out.parent.mkdir(parents=True, exist_ok=True); lyr_out.parent.mkdir(parents=True, exist_ok=True)
    ff(["-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0", "-c:a", "libmp3lame", "-b:a", "192k", str(audio_out)],
       (y * 32767).astype(np.int16).tobytes())
    lyr_out.write_text(json.dumps({"lines": lines, "extras": [], "notes": f"ElevenLabs eleven_v3 voice {VOICE} (Liam), language en, "
                                   f"seed {seed}, stability {stab}; one take cut into lines, each placed at its chapter start"},
                                  indent=1, ensure_ascii=False), encoding="utf-8")
    print("\n".join(report)); print(f"wrote {audio_out} ({len(y) / SR:.3f} s) and {lyr_out}")
    if "--stt" in sys.argv:
        (out_dir if arg("--out-dir", "") else audio_out.parent).joinpath("take.mp3").write_bytes(mp3)
        print("heard:", stt(mp3))


if __name__ == "__main__":
    main()
