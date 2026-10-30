"""Sound effects under the voiceover -> out/mix.wav (and the effect files in audio/sfx/).

    python -m uv run --no-project --with numpy python analysis/sfx_mix.py

The effects are synthesised here (no account needed). Drop your own WAVs into audio/sfx/ with the
same names to replace any of them. Every cue is placed from the word timings, so it follows the
voiceover when you re-align. Effects duck up to 7 dB under the voice; the mix is normalised to
-14 LUFS (ITU-R BS.1770 K-weighted, gated).

Cue sheet: (time expression, effect, dB). Change dB to make one louder or quieter; change the
expression to move it.
"""
import json, subprocess, sys, wave, pathlib
import numpy as np
from common_vo import load_audio, ROOT, DATA, VARIANT

SR = 48000
SFX = ROOT / "audio" / "sfx"
OUT = ROOT / "out"
rng = np.random.default_rng(7)


# ------------------------------------------------------------------ the effect library
def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4))


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); z = 0.0
    for i, v in enumerate(x): z = (1 - a) * v + a * z; y[i] = z
    return y


def whoosh(d=0.45):
    n = int(d * SR); x = rng.standard_normal(n)
    sweep = np.linspace(400, 5000, n) ** 0.5
    y = lowpass(x, 3000) * np.sin(np.linspace(0, np.pi, n)) ** 2
    return y * (sweep / sweep.max())


def tick():
    n = int(0.06 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2400 * t) * env(n, 0.0005, 0.012)


def slam():
    n = int(0.9 * SR); t = np.arange(n) / SR
    body = np.sin(2 * np.pi * (55 + 90 * np.exp(-t * 18)) * t) * env(n, 0.002, 0.28)
    hit = lowpass(rng.standard_normal(n), 2500) * env(n, 0.001, 0.05)
    return body + 0.6 * hit


def typing():
    n = int(0.03 * SR)
    return lowpass(rng.standard_normal(n), 4000) * env(n, 0.0005, 0.006)


def strike():
    n = int(0.25 * SR)
    return lowpass(rng.standard_normal(n), 6000) * env(n, 0.003, 0.06) * np.linspace(1, 0.3, n)


def pop():
    n = int(0.15 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (900 - 500 * t / 0.15) * t) * env(n, 0.001, 0.04)


def implode():
    n = int(1.1 * SR); t = np.arange(n) / SR
    rise = lowpass(rng.standard_normal(n), 1800) * (t / t[-1]) ** 3
    tail = np.sin(2 * np.pi * 70 * t) * np.exp(-np.maximum(0, t - 0.75) * 9) * (t > 0.75)
    return rise + tail


def click():
    n = int(0.05 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 3200 * t) * 0.6 + lowpass(rng.standard_normal(n), 7000) * 0.5) * env(n, 0.0003, 0.008)


def riser(d=1.3):
    n = int(d * SR); t = np.arange(n) / SR
    noise = lowpass(rng.standard_normal(n), 5000) * (t / t[-1]) ** 2
    tone = np.sin(2 * np.pi * (200 * t + 900 * t ** 2 / (2 * d))) * (t / t[-1]) ** 3 * 0.4
    return noise + tone


def boom():
    n = int(1.2 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * (42 + 70 * np.exp(-t * 14)) * t) * env(n, 0.002, 0.45) + lowpass(rng.standard_normal(n), 900) * env(n, 0.001, 0.08) * 0.5


LIB = {"click": click, "riser": riser, "boom": boom, "whoosh": whoosh, "tick": tick, "slam": slam, "type": typing, "strike": strike, "pop": pop, "implode": implode}


def load_or_make(name):
    p = SFX / f"{name}.wav"
    if not p.exists():
        y = LIB[name](); y = 0.9 * y / (np.abs(y).max() + 1e-9)
        SFX.mkdir(parents=True, exist_ok=True)
        with wave.open(str(p), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype(np.int16).tobytes())
    with wave.open(str(p)) as w:
        y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2: y = y.reshape(-1, 2).mean(1)
        if w.getframerate() != SR: y = np.interp(np.linspace(0, len(y), int(len(y) * SR / w.getframerate()), endpoint=False), np.arange(len(y)), y)
    return y


# ------------------------------------------------------------------ cues from the words
def cues_reel(ly):
    """The 9:16 Hindi reel: the same effects as the 16:9 cut, on the same beats of the Hindi lines.
    A word is found by its Latin text, or by its index in the line (for Devanagari words)."""
    def word(line_q, w):
        l = next(l for l in ly["lines"] if line_q.lower() in l["text"].lower())
        if isinstance(w, int): return l["words"][w]
        return next(x for x in l["words"] if x["w"].lower().strip(",.?!।") == w.lower())
    def line(q):
        return next(l for l in ly["lines"] if q.lower() in l["text"].lower())
    C = [
        (word("ChatGPT", 1)["start"] - 0.1, "whoosh", -16),
        (word("Lekin Jev", "decide")["start"] - 0.05, "slam", -6),
        (word("Messy text", "Messy")["start"] - 0.25, "whoosh", -15),
        (word("Messy text", "typed")["start"], "pop", -14),
    ]
    # each plate cut gets a whoosh
    for q in ["answers", "support ticket", "judgment", "Classify", "LLM"]:
        C.append((line(q)["start"] - 0.35, "whoosh", -14))
    for w in ["Choice", "Score", "Noul"]:
        C.append((word(w, w)["start"], "tick", -12))
    C.append((word("Choice", 4)["start"], "pop", -12))
    # typing under 'तीन सवाल, एक ही call'
    l = line("call")
    t = l["start"]
    while t < l["end"] + 0.2:
        C.append((t, "type", -22)); t += 0.075
    C += [
        (word("Team, technical", "technical")["start"], "pop", -12),
        (word("Urgent", "1.0")["start"], "pop", -12),
        (word("parsing", 1)["start"], "slam", -10),
        (word("Threshold", "Threshold")["start"], "tick", -12),
        (word("0.80", "0.80")["start"], "whoosh", -16),
        (word("0.80", "route")["start"] - 0.05, "slam", -9),
    ]
    for w in ["Classify", "route", "perfect"]:
        C.append((word("Classify", w)["start"] + 0.05, "tick", -14))
    for w in ["maths", "counting", "text"]:
        C.append((word("maths", w)["start"] + 0.12, "strike", -12))
    C += [
        (word("Jev nahi", 1)["start"], "slam", -9),
        (word("schema", 6)["start"], "pop", -13),
        (word("LLM", 1)["start"], "tick", -12),
        (word("Jev decide", "decide")["start"], "slam", -9),
        (word("Code action", "action")["start"], "tick", -12),
        (ly["duration"] - 1.15, "implode", -10),
    ]
    return C


def cues_decision(ly):
    """The Microsoft-Decision-1 explainer (vox template): a hit on every cut, a slam on each stamp, ticks as the
    latency tiles fill, a lift into the last line. Shot i plays over line i; a word is found by text or index."""
    L = ly["lines"]
    def word(i, w):
        ws = L[i]["words"]
        if isinstance(w, int): return ws[w]
        return next(x for x in ws if x["w"].lower().rstrip(",.?!।:") == w.lower())
    C = []
    for i, l in enumerate(L[1:], 1):  # a hit on each new shot (at the cut, 0.18 s before the line)
        C.append((l["start"] - 0.2, "whoosh" if i % 2 else "pop", -15 if i % 2 else -13))
    C += [
        (0.0, "slam", -10),  # the opening question lands on the first frame
        (word(5, "83.5%")["start"] - 0.05, "slam", -11),
        (word(6, "35")["start"] - 0.05, "slam", -9),
        (word(7, 10)["start"] - 0.05, "slam", -10),
        (word(9, "$0.042")["start"] - 0.05, "slam", -11),
    ]
    l = L[6]  # quick ticks as the latency bars race in
    for k in range(6):
        C.append((l["start"] + 0.12 * k, "tick", -21))
    C.append((L[-1]["start"] - 0.45, "whoosh", -11))  # the lift into the takeaway
    return C


# night-trek reels: per variant, the word each repo shot punches in on and how many items its first stop outlines
TREK_CUES = {
    "repos": ({1: "agency-agents", 2: "agents", 3: "knowledge-work", 4: "claude-quickstarts", 5: "agent-skills"},
              {1: 4, 2: 1, 3: 5, 4: 3, 5: 1}),
    "gh1": ({1: "VoiceStudio", 2: "ppt-master", 3: "diagram-design"}, {1: 2, 2: 1, 3: 1}),
    "gh2": ({1: "gods-eye-view", 2: "REA", 3: "paperclip"}, {1: 2, 2: 2, 3: 1}),
    "gh3": ({1: "Pocock", 2: "ECC"}, {1: 2, 2: 4}),
    "gh4": ({1: "Karpathy", 2: "claude-mem"}, {1: 1, 2: 1}),
}


def cues_repos(ly):
    """Night-trek reels (repos, gh1..): a boom on the hook and on every "Number ...", a whoosh on each whip pan, a
    click when the cursor hits Star with ticks as the stars roll up, a tick per outlined item, a whoosh and pop at the
    second stop, and a riser into the outro that lands on a boom at the logo lockup. Shot i plays over line i."""
    L = ly["lines"]
    frac = lambda l, k: l["start"] + (l["end"] - l["start"]) * k
    def word(l, w):
        return next((x["start"] for x in l["words"] if x["w"].lower().rstrip(",.?!—:") == w.lower()), frac(l, 0.08))
    names, focus = TREK_CUES[VARIANT]
    C = [(0.0, "boom", -8)] + [(0.05 + 0.07 * k, "tick", -22) for k in range(6)]   # "400+" lands
    for i, l in enumerate(L[1:], 1):
        cut = l["start"] - 0.18
        C.append((cut - 0.12, "whoosh", -12))
        if i in names:
            C.append((l["start"], "boom", -12))                                      # "Number one ..."
            # the same stops as trek_repo.ts: name, Star, the named items, the README, pull out
            t_name = word(l, names[i]); t_star = max(t_name + 0.7, frac(l, 0.16))
            t_focus = max(t_star + 0.9, frac(l, 0.32)); t_read = max(t_focus + 1.2, frac(l, 0.66)); n = focus[i]
            C.append((t_star, "click", -10))
            C += [(t_star + 0.05 + 0.08 * k, "tick", -23) for k in range(6)]          # the stars roll up
            C.append((t_focus - 0.1, "whoosh", -22))                                   # the glide down
            span = max(0.2, (t_read - 0.7 - t_focus - 0.15) / max(1, n))
            C += [(t_focus + 0.15 + k * span, "tick", -18) for k in range(n)]          # each outlined item
            C += [(t_read - 0.1, "whoosh", -22), (t_read + 0.25, "pop", -16)]          # to the README, outlined
    last = L[-1]; lock = frac(last, 0.62)
    C += [(lock - 1.3, "riser", -14), (lock, "boom", -7), (lock + 0.02, "pop", -14)]
    return C


def pulse(n):
    """A soft techy bed: a muted kick on every beat at 120 BPM and a light hat on the offbeat, faded in and out."""
    y = np.zeros(n, np.float32)
    k = np.sin(2 * np.pi * (45 + 60 * np.exp(-np.arange(int(0.25 * SR)) / SR * 22)) * np.arange(int(0.25 * SR)) / SR) * env(int(0.25 * SR), 0.002, 0.09)
    h = lowpass(rng.standard_normal(int(0.04 * SR)), 9000) - lowpass(rng.standard_normal(int(0.04 * SR)), 4000)
    h = h * env(len(h), 0.0005, 0.012) * 0.35
    beat = int(0.5 * SR)
    for i in range(0, n, beat):
        j = min(n, i + len(k)); y[i:j] += k[: j - i]
        o = i + beat // 2; j = min(n, o + len(h))
        if o < n: y[o:j] += h[: j - o]
    t = np.arange(n) / SR
    return y * np.minimum(1, t / 1.0) * np.minimum(1, (t[-1] - t) / 1.5)


def bed(n):
    """A low drone under the whole film: 55 / 82.4 / 110 Hz with a slow swell, faded in and out."""
    t = np.arange(n) / SR
    y = (0.6 * np.sin(2 * np.pi * 55 * t) + 0.35 * np.sin(2 * np.pi * 82.41 * t) + 0.15 * np.sin(2 * np.pi * 110 * t))
    y *= 0.75 + 0.25 * np.sin(2 * np.pi * 0.125 * t)
    y *= np.minimum(1, t / 1.5) * np.minimum(1, (t[-1] - t) / 2.0)
    return y.astype(np.float32)


def cues(ly):
    if VARIANT == "reel": return cues_reel(ly)
    if VARIANT == "decision": return cues_decision(ly)
    if VARIANT in TREK_CUES: return cues_repos(ly)
    def word(line_q, w):
        l = next(l for l in ly["lines"] if line_q.lower() in l["text"].lower())
        return next(x for x in l["words"] if x["w"].lower().strip(",.?!") == w.lower())
    def line(q):
        return next(l for l in ly["lines"] if q.lower() in l["text"].lower())
    dur = ly["duration"]
    C = [
        (word("ChatGPT likhta", "likhta")["start"] - 0.1, "whoosh", -16),
        (word("Lekin Jev", "decide")["start"] - 0.05, "slam", -6),
        (word("Messy text", "Messy")["start"] - 0.25, "whoosh", -15),
        (word("Messy text", "typed")["start"], "pop", -14),
    ]
    # each plate cut gets a whoosh
    for q in ["Sirf teen answers", "Ek support ticket", "Jev sirf judgment", "Classify aur route", "LLM likhta hai"]:
        C.append((line(q)["start"] - 0.35, "whoosh", -14))
    for w in ["Choice", "Score", "Noul"]:
        C.append((word(f"{w},", w)["start"], "tick", -12))
    C.append((word("Choice, options", "ek")["start"], "pop", -12))
    # typing under 'Teen sawaal, ek hi call'
    l = line("Teen sawaal")
    t = l["start"]
    while t < l["end"] + 0.2:
        C.append((t, "type", -22)); t += 0.075
    C += [
        (word("Team, technical", "technical")["start"], "pop", -12),
        (word("Urgent, 1.0", "1.0")["start"], "pop", -12),
        (word("Sab typed", "typed")["start"], "slam", -10),
        (word("Threshold 0.90", "Threshold")["start"], "tick", -12),
        (word("0.80 karo", "0.80")["start"], "whoosh", -16),
        (word("0.80 karo", "route")["start"] - 0.05, "slam", -9),
    ]
    for w in ["Classify", "route", "perfect"]:
        C.append((word("Classify aur", w)["start"] + 0.05, "tick", -14))
    for w in ["maths", "counting", "text"]:
        C.append((word("Lekin maths", w)["start"] + 0.12, "strike", -12))
    C += [
        (word("Jev nahi", "nahi")["start"], "slam", -9),
        (word("zero schema", "sahi")["start"], "pop", -13),
        (word("LLM likhta", "likhta")["start"], "tick", -12),
        (word("Jev decide karta", "decide")["start"], "slam", -9),
        (word("Code action", "action")["start"], "tick", -12),
        (dur - 1.15, "implode", -10),
    ]
    return C


# ------------------------------------------------------------------ loudness (BS.1770)
def biquad(x, b, a):
    y = np.zeros_like(x); x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        o = b[0] * v + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2
        x2, x1, y2, y1 = x1, v, y1, o; y[i] = o
    return y


def lufs(x):
    # K-weighting at 48 kHz (BS.1770-4 coefficients)
    x = biquad(x, [1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585])
    x = biquad(x, [1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621])
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = np.array([np.mean(x[i:i + blk] ** 2) for i in range(0, len(x) - blk, hop)])
    L = -0.691 + 10 * np.log10(ms + 1e-12)
    g = ms[L > -70]
    rel = -0.691 + 10 * np.log10(g.mean() + 1e-12) - 10
    g2 = g[(-0.691 + 10 * np.log10(g + 1e-12)) > rel]
    return -0.691 + 10 * np.log10(g2.mean() + 1e-12)


def limit(x, ceiling=10 ** (-1 / 20), look_ms=5, release_ms=80):
    """Look-ahead brickwall limiter: gain = min over the next few ms of ceiling/|x|, released smoothly."""
    blk = SR // 1000  # 1 ms blocks
    n = len(x) // blk * blk
    need = np.minimum(1.0, ceiling / (np.abs(x[:n]).reshape(-1, blk).max(1) + 1e-9))
    k = look_ms
    ahead = np.min(np.stack([np.concatenate([need[i:], np.ones(i)]) for i in range(k + 1)]), 0)
    g = np.empty_like(ahead); z = 1.0; r = np.exp(-1 / release_ms)
    for i, v in enumerate(ahead):
        z = v if v < z else r * z + (1 - r) * v; g[i] = z
    gain = np.concatenate([np.repeat(g, blk), np.full(len(x) - n, g[-1])])
    return np.clip(x * gain, -ceiling, ceiling)


def main():
    ly = json.loads((DATA / "lyrics.json").read_text(encoding="utf-8"))
    vo, _ = load_audio(sr=SR)
    if VARIANT == "decision":
        import shutil, glob, os
        ff = shutil.which("ffmpeg") or glob.glob(os.path.expanduser("~") + r"\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg*\*\bin\ffmpeg.exe")[0]
        af = "highpass=f=120,equalizer=f=350:width_type=q:w=1.5:g=-3.5,equalizer=f=3800:width_type=q:w=1.2:g=5.0,treble=g=4.0:f=8500,acompressor=threshold=-16dB:ratio=2.5:attack=10:release=80"
        raw = subprocess.run([ff, "-loglevel", "error", "-i", str(ROOT / "audio" / VARIANT / "voiceover.mp3"), "-af", af, "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"], capture_output=True, check=True).stdout
        if len(raw) == len(vo) * 4:
            vo = np.frombuffer(raw, np.float32).copy()
    ly["duration"] = len(vo) / SR
    fx = np.zeros_like(vo)
    sheet = cues(ly)
    for t, name, db in sheet:
        y = load_or_make(name) * 10 ** (db / 20)
        i = int(max(0, t) * SR); j = min(len(fx), i + len(y))
        fx[i:j] += y[: j - i]
    if VARIANT == "decision":  # the vox template's score: a low bed under everything
        fx += bed(len(fx)) * 10 ** (-27 / 20)
    if VARIANT in TREK_CUES:  # the night-trek score: a soft pulse under everything
        fx += pulse(len(fx)) * 10 ** (-24 / 20)
    # --no-voice: the effects and bed alone, same cues and levels, no ducking (it only made room for the voice),
    # a little quieter overall (-16 LUFS) so the hits are not harsh on their own; written to mix_<variant>_fx.wav
    no_voice = "--no-voice" in sys.argv
    if not no_voice:
        # duck the effects under the voice (up to 7 dB), with a 30 ms attack / 250 ms release follower
        lvl = np.abs(vo); e = np.zeros_like(lvl); z = 0.0
        att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.25 * SR))
        for i, v in enumerate(lvl):
            z = att * z + (1 - att) * v if v > z else rel * z + (1 - rel) * v; e[i] = z
        e = e / (np.percentile(e, 99) + 1e-9)
        fx *= 10 ** (-7 * np.clip(e, 0, 1) / 20)
    mix = fx if no_voice else vo + fx
    target = -16 if no_voice else -14
    # normalise to the target loudness through a look-ahead peak limiter (ceiling -1 dBFS); repeat until within 0.2 LU
    for _ in range(8):
        L = lufs(mix)
        if abs(L - target) < 0.2: break
        mix = limit(mix * 10 ** ((target - L) / 20))
    OUT.mkdir(exist_ok=True)
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    name = f"mix_{VARIANT}.wav" if VARIANT else "mix.wav"  # the reel never overwrites the 16:9 mix
    if no_voice: name = name.replace(".wav", "_fx.wav")
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.repeat(pcm[:, None], 2, 1).tobytes())
    print(f"wrote out/{name}: {len(sheet)} cues, {len(mix)/SR:.2f} s, {lufs(mix):.1f} LUFS")


if __name__ == "__main__":
    main()
