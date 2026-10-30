"""Narration: one ElevenLabs take per cut (Liam, settings in src/config/voScript.json), cut into its lines by the take's
own character timestamps. Writes audio/out/<variant>/<line>.wav and audio/out/lines_<variant>.json (line
lengths and caption phrase timings, relative to each line's start). timing.py then lays the lines on the beat grid.

Swapping in a real recording instead: python scripts/audio/align.py <your.wav> --variant master (same output files).

    python scripts/audio/vo.py master|reel [--seed 7] [--new] [--stt]
Needs ELEVENLABS_API_KEY (user environment variable; never printed) and ffmpeg. Takes are cached in audio/takes/
by text + settings + seed, so re-running costs no credits unless the script changes or --new is passed.
"""
import base64, hashlib, json, os, pathlib, re, subprocess, sys, time, urllib.error, urllib.request, uuid

import numpy as np
import soundfile as sf

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
SR = 44100
sys.path.insert(0, str(HERE))
from version import SCRIPT_PATH, OUT as VOUT  # noqa: E402
SCRIPT = json.loads(SCRIPT_PATH.read_text(encoding="utf-8"))
SPLIT = re.compile(r"(?<=[,.?!:…])\s+")


def arg(name, default):
    a = sys.argv
    return a[a.index(name) + 1] if name in a and a.index(name) + 1 < len(a) else default


def key():
    # the saved user variable (setx) first: a process started before the last setx still carries the old key in os.environ
    k = None
    try:
        import winreg
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as h:
            k = winreg.QueryValueEx(h, "ELEVENLABS_API_KEY")[0]
    except OSError:
        pass
    k = k or os.environ.get("ELEVENLABS_API_KEY")
    if not k: sys.exit("ELEVENLABS_API_KEY is not set")
    return k.strip()


def synth(text, v, seed):
    body = {"text": text, "model_id": v["model"], "seed": seed, "language_code": v["language"],
            "voice_settings": {"stability": v["stability"], "similarity_boost": v["similarity"], "speed": v["speed"]}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{v['voiceId']}/with-timestamps?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), headers={"xi-api-key": key(), "Content-Type": "application/json"})
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                d = json.loads(r.read())
            return base64.b64decode(d["audio_base64"]), d.get("alignment") or d["normalized_alignment"]
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors="replace")[:300]
            print("  retry:", e.code, msg)
            if "quota_exceeded" in msg or "missing_permissions" in msg: break   # retrying cannot help
            time.sleep(10 * (i + 1))
        except Exception as e:  # noqa: BLE001
            print("  retry:", e); time.sleep(10 * (i + 1))
    sys.exit("synthesis failed")


def stt(wav_bytes):
    b = uuid.uuid4().hex
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"model_id\"\r\n\r\nscribe_v1\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"language_code\"\r\n\r\nhin\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"t.wav\"\r\nContent-Type: audio/wav\r\n\r\n").encode() + wav_bytes + f"\r\n--{b}--\r\n".encode()
    req = urllib.request.Request("https://api.elevenlabs.io/v1/speech-to-text", data=body,
                                 headers={"xi-api-key": key(), "Content-Type": f"multipart/form-data; boundary={b}"})
    for wait in (0, 15, 30):
        time.sleep(wait)
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read()).get("text", "")
        except Exception as e:  # noqa: BLE001
            print("  stt retry:", e)
    return "(transcription failed)"


def decode(mp3):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "pipe:1"],
                         input=mp3, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def char_times(text, al):
    chars, cs, ce = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    if "".join(chars) == text:
        return list(zip(cs, ce))
    out, j = [], 0
    for ch in text:  # tolerate small normalisation differences
        k = j
        while k < len(chars) and chars[k] != ch and k - j < 40: k += 1
        if k < len(chars) and chars[k] == ch: j = k
        jj = min(j, len(chars) - 1); out.append((cs[jj], ce[jj]))
        if k < len(chars) and chars[k] == ch: j += 1
    return out


def phrases(s):
    return [p for p in SPLIT.split(s.strip()) if p]


def spans(text, offset, parts):
    """char spans of each phrase inside text (first and last non-space char)."""
    out, pos = [], 0
    for p in parts:
        i = text.index(p, pos); out.append((offset + i, offset + i + len(p.rstrip(" ,.?!:…")) - 1)); pos = i + len(p)
    return out


def caption_words(cap, t0, t1):
    # spoken weight per caption word: numbers are said in words ("6,450" = "chhah hazaar chaar sau pachaas"), so they weigh more
    ws = cap.split(); L = [4 * len(re.sub(r"\D", "", w)) + 2 if re.search(r"\d", w) else len(w) + 1 for w in ws]; tot = sum(L); t = t0; out = []
    for w, n in zip(ws, L):
        d = (t1 - t0) * n / tot; out.append({"w": w, "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return out


def build(variant, seed, new):
    v, lines = SCRIPT["voice"], SCRIPT[variant]
    for l in lines:
        if len(phrases(l["cap"])) != len(phrases(l["tts"])):
            sys.exit(f"{l['id']}: caption has {len(phrases(l['cap']))} phrases, tts {len(phrases(l['tts']))}")
    text = "\n\n".join(l["tts"] for l in lines)
    T = ROOT / "audio" / "takes"; T.mkdir(exist_ok=True)
    def take(sd):
        h = hashlib.sha1((text + json.dumps(v, sort_keys=True) + str(sd)).encode()).hexdigest()[:10]
        mp3p, alp = T / f"{variant}_s{sd}_{h}.mp3", T / f"{variant}_s{sd}_{h}.json"
        if new or not mp3p.exists():
            print(f"new take: {variant}, {len(text)} characters, {v['model']} seed {sd}")
            mp3, al = synth(text, v, sd); mp3p.write_bytes(mp3); alp.write_text(json.dumps(al))
        return decode(mp3p.read_bytes()), char_times(text, json.loads(alp.read_text())), mp3p.name
    # --line-seed i02:6,r05:9 -> those lines are cut from the take with that seed (same text, so the same offsets)
    alt = {k: int(sd) for k, sd in (x.split(":") for x in arg("--line-seed", "").split(",") if x)}
    takes = {sd: take(sd) for sd in {seed, *alt.values()}}
    y, ct, take_name = takes[seed]
    O = VOUT / variant; O.mkdir(parents=True, exist_ok=True)
    res, off = [], 0
    for i, l in enumerate(lines):
        tts = l["tts"]; sp = spans(tts, off, phrases(tts))   # phrase spans inside this line, shifted to the take
        y, ct, _ = takes[alt.get(l["id"], seed)]
        a, b = ct[off][0], ct[off + len(tts.rstrip()) - 1][1]
        nxt = ct[off + len(tts) + 2][0] if i + 1 < len(lines) else len(y) / SR
        s0, s1 = max(0.0, a - 0.05), min(nxt - 0.03, b + 0.16)
        clip = y[int(s0 * SR):int(s1 * SR)].copy()
        f = min(len(clip) // 4, int(0.012 * SR)); clip[:f] *= np.linspace(0, 1, f); clip[-f:] *= np.linspace(1, 0, f)
        sf.write(O / f"{l['id']}.wav", clip, SR, subtype="PCM_16")
        ph = []
        for cap, (c0, c1) in zip(phrases(l["cap"]), sp):
            t0, t1 = ct[c0][0] - s0, ct[c1][1] - s0
            ph.append({"cap": cap, "t0": round(t0, 3), "t1": round(t1, 3), "words": caption_words(cap, t0, t1)})
        res.append({"id": l["id"], "scene": l["scene"], "min": l["min"], "cut": l.get("cut"), "pre": l.get("pre", 0), "dur": round(len(clip) / SR, 3), "phrases": ph})
        off += len(tts) + 2
        print(f"{l['id']} {l['scene']:<11} {len(clip) / SR:5.2f} s  (min {l['min']})")
    meta = {"source": f"ElevenLabs {v['name']} {v['model']} {v['language']} speed {v['speed']} seed {seed}" + (f" (lines from other seeds: {alt})" if alt else ""), "take": take_name,
            "scratch": False, "lines": res}
    (VOUT / f"lines_{variant}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"total speech {sum(r['dur'] for r in res):.1f} s")
    if "--stt" in sys.argv:
        for l in lines:
            p = O / f"{l['id']}.wav"
            print(f"--- {l['id']}\n  script: {l['tts']}\n  heard : {stt(p.read_bytes())}")


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else "master", int(arg("--seed", "7")), "--new" in sys.argv)
