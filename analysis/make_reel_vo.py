"""Hindi voiceover for a 9:16 variant -> audio/<variant>/voiceover.mp3 and data/<variant>/lyrics.json.

Speaks SCRIPT (analysis/script_<variant>.py; VARIANT defaults to reel) one line at a time with a Microsoft
neural voice (edge-tts, needs internet), so every line's position in the mix is known. Word timings come
straight from the voice's own word boundaries, no aligner needed. Then run the audio analysis:

    python analysis/make_reel_vo.py [--voice hi-IN-MadhurNeural] [--rate -4%]
    VARIANT=reel python analysis/audio_vo.py        (PowerShell: $env:VARIANT='reel'; python analysis/audio_vo.py)
    (PowerShell, another variant: $env:VARIANT='decision'; python analysis/make_reel_vo.py)

A script module gives SCRIPT and SPOKEN, and optionally DISPLAY (the words stored in lyrics.json, one per
spoken word; defaults to SCRIPT), PLATE_FIRST (lines that start a plate: a longer pause) and GAP.

Needs: pip install edge-tts numpy, and ffmpeg on PATH.
"""
import asyncio, glob, importlib, json, os, pathlib, re, shutil, subprocess, sys
import numpy as np
import edge_tts

if not shutil.which("ffmpeg"):
    candidates = glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin")
    if candidates:
        os.environ["PATH"] = candidates[0] + os.pathsep + os.environ.get("PATH", "")

VARIANT = os.environ.get("VARIANT") or "reel"
_script = importlib.import_module(f"script_{VARIANT}")
SCRIPT, SPOKEN = _script.SCRIPT, _script.SPOKEN
PLATE_FIRST = getattr(_script, "PLATE_FIRST", set())
_tag = re.compile(r"\[[^\]]+\]\s*")
# lyrics.json stores DISPLAY (default: SCRIPT without its audio tags), word for word against the spoken SCRIPT
DISPLAY = getattr(_script, "DISPLAY", [_tag.sub("", s).strip() for s in SCRIPT])
for _s, _d in zip(SCRIPT, DISPLAY, strict=True):
    assert len(_tag.sub("", _s).split()) == len(_d.split()), f"DISPLAY word count differs from SCRIPT: {_d!r} vs {_s!r}"

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "audio" / VARIANT / "voiceover.mp3"
DATA = ROOT / "data" / VARIANT
SR = 24000
GAP, PLATE_GAP, HEAD, TAIL = getattr(_script, "GAP", 0.34), 0.45, 0.35, 1.2  # seconds of silence


def arg(name, default):
    """`--name value` or `--name=value`."""
    for i, a in enumerate(sys.argv):
        if a == name and i + 1 < len(sys.argv): return sys.argv[i + 1]
        if a.startswith(name + "="): return a[len(name) + 1:]
    return default


ENGINE = arg("--engine", "edge")  # edge (free, line by line) or elevenlabs (one continuous take, needs ELEVENLABS_API_KEY)
VOICE = arg("--voice", "hi-IN-SwaraNeural")  # an edge voice name, or an ElevenLabs voice id
RATE = arg("--rate", "-4%")
PITCH = arg("--pitch", "+0Hz")  # e.g. -6Hz for a deeper voice
MAX_LEN = float(arg("--max", "0"))  # elevenlabs: if the take is longer than this many seconds, speed it up to fit
SEED = arg("--seed", "")             # elevenlabs: a seed makes a chosen take reproducible
TEMPO = float(arg("--tempo", "1"))   # elevenlabs: a fixed, pitch-preserving speed-up (e.g. 1.12) to match another part's pace
MODEL = arg("--model", "eleven_v3")  # elevenlabs: eleven_v3 follows [tags]; eleven_turbo_v2_5 + --language hi keeps the Hindi accent after English words
LANG = arg("--language", "")         # elevenlabs: e.g. hi, locks the take to that language (not every model takes it)
SPEED = arg("--speed", "")           # elevenlabs: the model's own speaking speed (0.7-1.2), for models without [tags]
if arg("--out-dir", ""):             # write a candidate take elsewhere (voiceover.mp3 + lyrics.json), not the variant's files
    DATA = pathlib.Path(arg("--out-dir", "")); OUT = DATA / "voiceover.mp3"


def is_tag(tok):
    """An ElevenLabs v3 audio tag such as [excited]: steers the delivery, is never a word."""
    return re.fullmatch(r"\[[^\]]+\]", tok) is not None


def words(line):
    return [w for w in line.split() if not is_tag(w)]


def core(word):
    """A display token without trailing punctuation: 'है।' -> 'है', '0.85।' -> '0.85'."""
    return re.sub(r"[,.!?;:…।]+$", "", word)


def spoken_words(word):
    """The words the voice says for one display token (numbers and acronyms spelled out)."""
    return SPOKEN.get(core(word), core(word)).split()


def tts_text(line, keep_tags=False):
    """The line as the voice reads it: spoken forms in place, punctuation kept for the phrasing (and the audio
    tags kept for ElevenLabs; other voices would read them out)."""
    out = []
    for w in line.split():
        if is_tag(w):
            if keep_tags: out.append(w)
            continue
        tail = w[len(core(w)):]
        out.append(" ".join(spoken_words(w)) + tail)
    return " ".join(out)


async def synth(text):
    audio, events = bytearray(), []
    async for ch in edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary").stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            events.append((ch["offset"] / 1e7, (ch["offset"] + ch["duration"]) / 1e7, ch["text"]))
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         input=bytes(audio), capture_output=True, check=True).stdout
    return np.frombuffer(pcm, np.float32).copy(), events


def word_times(line, events, dur):
    """One (start, end) per display word, from the voice's boundaries (relative to the line's audio)."""
    words_ = words(line)
    counts = [len(spoken_words(w)) for w in words_]
    if sum(counts) == len(events):
        out, k = [], 0
        for n in counts:
            out.append((events[k][0], events[k + n - 1][1])); k += n
        return out, True
    # boundaries do not match the script: spread the words over the line by length instead
    weights = np.array([max(2, len(core(w))) for w in words_], float)
    b = np.concatenate([[0], np.cumsum(weights) / weights.sum()]) * dur
    return [(b[i], b[i + 1]) for i in range(len(words_))], False


def el_key():
    """ELEVENLABS_API_KEY from the environment, or (Windows) the user's saved environment variables."""
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k and os.name == "nt":
        import winreg
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
                k = winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0]
        except OSError:
            pass
    if not k:
        sys.exit("ELEVENLABS_API_KEY is not set. In PowerShell: [Environment]::SetEnvironmentVariable('ELEVENLABS_API_KEY', '<your key>', 'User')")
    return k.strip().strip('<>')


def el_synth(text):
    """One ElevenLabs take with character timestamps -> (mp3 bytes, alignment)."""
    import base64, urllib.request, urllib.error
    req_body = {"text": text, "model_id": MODEL,
                "voice_settings": {"stability": float(arg("--stability", "0.5")), "similarity_boost": 0.75}}
    if SEED: req_body["seed"] = int(SEED)
    if LANG: req_body["language_code"] = LANG
    if SPEED: req_body["voice_settings"]["speed"] = float(SPEED)
    body = json.dumps(req_body).encode()
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
                                 data=body, headers={"xi-api-key": el_key(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=600) as r:
            d = json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs error {e.code}: {e.read().decode(errors='replace')[:500]}")
    return base64.b64decode(d["audio_base64"]), d.get("alignment") or d.get("normalized_alignment")


def char_times(text, al):
    """Start/end time for every character of `text`, matched in order against the alignment's characters."""
    chars, cs, ce = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    if "".join(chars) == text:
        return list(zip(cs, ce))
    out, j = [], 0
    for ch in text:
        k = j
        while k < len(chars) and chars[k] != ch and k - j < 40: k += 1
        if k < len(chars) and chars[k] == ch: j = k
        jj = min(j, len(chars) - 1)
        out.append((cs[jj], ce[jj]))
        if k < len(chars) and chars[k] == ch: j += 1
    return out


def main_elevenlabs():
    """The whole script in one continuous take (the audio tags steer it), word timings from its timestamps."""
    segs, text = [], ""
    for i, line in enumerate(SCRIPT):  # where each line's spoken text sits inside the take
        t = tts_text(line, keep_tags=MODEL.startswith("eleven_v3"))   # other models would read the tags out
        segs.append((len(text) + (1 if text else 0), t)); text += (" " if text else "") + t
    audio, al = el_synth(text)
    times = char_times(text, al)
    pcm = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         input=audio, capture_output=True, check=True).stdout
    y = np.frombuffer(pcm, np.float32).copy()
    tempo = TEMPO
    if tempo != 1.0:  # a fixed speed-up, pitch kept (atempo)
        y = np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                                          "-af", f"atempo={tempo:.5f}", "-f", "f32le", "pipe:1"], input=y.tobytes(), capture_output=True, check=True).stdout, np.float32).copy()
    if MAX_LEN and len(y) / SR > MAX_LEN - HEAD - TAIL:  # too long: speed up, pitch kept (atempo)
        extra = (len(y) / SR) / (MAX_LEN - HEAD - TAIL)
        print(f"take is {len(y) / SR:.2f} s: speeding up x{extra:.3f} to fit {MAX_LEN:.0f} s")
        y = np.frombuffer(subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                                          "-af", f"atempo={extra:.5f}", "-f", "f32le", "pipe:1"], input=y.tobytes(), capture_output=True, check=True).stdout, np.float32).copy()
        tempo *= extra   # word timings scale by the total speed-up
    at = lambda s: round(HEAD + s / tempo, 3)
    lines = []
    for i, (off, t) in enumerate(segs):
        toks = [(m.start() + off, m.end() + off, m.group()) for m in re.finditer(r"\S+", t)]
        toks = [x for x in toks if not is_tag(x[2])]
        ws, k = [], 0
        for w in DISPLAY[i].split():
            n = len(spoken_words(w))
            a, b, last = toks[k][0], toks[k + n - 1][1], toks[k + n - 1][2]
            b -= len(last) - len(core(last))  # end on the last letter, not the punctuation
            ws.append({"w": w, "start": at(times[a][0]), "end": at(max(times[b - 1][1], times[a][0] + 0.05)), "conf": 1.0})
            k += n
        for p, q in zip(ws, ws[1:]):
            if q["start"] < p["end"]: p["end"] = q["start"] = round((p["end"] + q["start"]) / 2, 3)
        lines.append({"i": i, "text": DISPLAY[i], "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
    y = np.concatenate([np.zeros(int(HEAD * SR), np.float32), y, np.zeros(int(TAIL * SR), np.float32)])
    y = 0.9 * y / (np.abs(y).max() + 1e-9)
    OUT.parent.mkdir(parents=True, exist_ok=True); DATA.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                    "-c:a", "libmp3lame", "-b:a", "192k", str(OUT)], input=(y * 32767).astype(np.int16).tobytes(), check=True)
    (DATA / "lyrics.json").write_text(json.dumps({"lines": lines, "extras": [], "notes": f"ElevenLabs {MODEL} voice {VOICE}, one take, tempo x{tempo:.3f}" + (f", seed {SEED}" if SEED else "")
                                                 + (f", language {LANG}" if LANG else "") + (f", speed {SPEED}" if SPEED else "")},
                                                 indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT}  {len(y) / SR:.2f} s, {len(lines)} lines, {sum(len(l['words']) for l in lines)} words, ElevenLabs voice {VOICE}")


async def main():
    parts = [np.zeros(int(HEAD * SR), np.float32)]
    t = HEAD
    lines = []
    for i, line in enumerate(SCRIPT):
        if i in PLATE_FIRST:
            parts.append(np.zeros(int((PLATE_GAP) * SR), np.float32)); t += PLATE_GAP
        y, events = await synth(tts_text(line))
        nz = np.nonzero(np.abs(y) > 0.01)[0]
        a, b = (nz[0], nz[-1] + 1) if len(nz) else (0, len(y))
        lead, dur = a / SR, (b - a) / SR
        times, exact = word_times(line, events, dur + lead)
        if not exact:
            print(f"line {i}: voice gave {len(events)} words, script needs {sum(len(spoken_words(w)) for w in words(line))}: spread by length")
        ws = []
        for w, (s, e) in zip(DISPLAY[i].split(), times):
            s, e = min(max(0.0, s - lead), dur), min(max(0.0, e - lead), dur)
            ws.append({"w": w, "start": round(t + s, 3), "end": round(t + max(e, s + 0.05), 3), "conf": 1.0 if exact else 0.4})
        for p, q in zip(ws, ws[1:]):  # keep words ordered and non-overlapping
            if q["start"] < p["end"]: p["end"] = q["start"] = round((p["end"] + q["start"]) / 2, 3)
        lines.append({"i": i, "text": DISPLAY[i], "start": ws[0]["start"], "end": ws[-1]["end"], "words": ws})
        parts.append(y[a:b]); t += dur
        parts.append(np.zeros(int(GAP * SR), np.float32)); t += GAP
    parts.append(np.zeros(int(TAIL * SR), np.float32))
    y = np.concatenate(parts)
    y = 0.9 * y / (np.abs(y).max() + 1e-9)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)
    pcm = (y * 32767).astype(np.int16).tobytes()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                    "-c:a", "libmp3lame", "-b:a", "160k", str(OUT)], input=pcm, check=True)
    (DATA / "lyrics.json").write_text(json.dumps({"lines": lines, "extras": [], "notes": f"{VOICE} word boundaries, rate {RATE}, pitch {PITCH}"},
                                                 indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {OUT}  {len(y) / SR:.2f} s, {len(lines)} lines, {sum(len(l['words']) for l in lines)} words, voice {VOICE}")


if __name__ == "__main__":
    if ENGINE == "elevenlabs":
        main_elevenlabs()
    else:
        asyncio.run(main())
