"""Motion Flex (Claude cut): music edit, measured grid, resolved choreography and SFX mix.

Reads the exact supplied Short (out/motion_references/wm8wIdmbVRo.webm) and data/flex/score.json.
Writes, for `flex` (12 bars, the 29.1 s reel) and `flex_full` (6-bar process intro + the reel):
  audio/<v>/edit.wav, audio/<v>/mix.wav, audio/<v>/mix.mp3      music + SFX, -14 LUFS, TP -1 dB
  data/<v>/audio.json, lyrics.json, cues.json, manifest.json      engine features and the resolved score

Nothing is time-stretched or pitch-shifted. The grid is measured from the Short's kick attacks (a robust
least-squares fit on the eighth-note pulse); the 6-bar phrase the Short contains is repeated on bar lines,
so 12 bars loop seamlessly when Instagram replays the reel. Run from the project root:
  python analysis/build_flex_audio.py
"""
from pathlib import Path
import hashlib
import json
import math
import subprocess
import wave

import numpy as np
from scipy.signal import butter, sosfiltfilt

from prepare_motion_music import ffmpeg_binary, run_ffmpeg, spectral_analysis, peak_events, SR, FPS

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "out/motion_references/wm8wIdmbVRo.webm"
SOURCE_SHA = "95ffcf8057a3d9203e5fb29b74813456fb1f62daafa3c2bd40998dc21ff70869"
RATE = 48000
SFX_DIR = ROOT / "audio/sfx"


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=1) + "\n", encoding="utf-8")


def write_wav(path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(RATE)
        out.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())


def read_mono(path):
    with wave.open(str(path), "rb") as w:
        n, ch, sw, sr = w.getnframes(), w.getnchannels(), w.getsampwidth(), w.getframerate()
        raw = np.frombuffer(w.readframes(n), dtype="<i2" if sw == 2 else "<i4").astype(np.float64)
    raw = raw.reshape(-1, ch).mean(axis=1) / (32768.0 if sw == 2 else 2147483648.0)
    if sr != RATE:
        raw = np.interp(np.arange(round(len(raw) * RATE / sr)) * sr / RATE, np.arange(len(raw)), raw)
    return raw


def measure_grid(stereo):
    """Kick attacks (steepest rise of the 35-160 Hz envelope), then an outlier-robust fit of the eighth pulse."""
    mono = stereo.mean(axis=1)
    sos = butter(4, [35, 160], btype="band", fs=RATE, output="sos")
    low = sosfiltfilt(sos, mono)
    hop = 48
    env = np.sqrt(np.convolve(low * low, np.ones(480) / 480, "same"))[::hop]
    times = np.arange(len(env)) * hop / RATE
    rise = np.diff(env, prepend=env[0])
    # candidate kicks: strong rises at least 0.25 s apart
    order = np.argsort(-rise)
    picked = []
    for i in order:
        if rise[i] < .35 * rise[order[0]]:
            break
        if all(abs(times[i] - times[j]) > .25 for j in picked):
            picked.append(i)
    attacks = np.sort(times[picked])
    attacks = attacks[attacks > .3]  # the clip-start transient is not a kick
    period, phase = .3032, .15
    keep = np.ones(len(attacks), bool)
    for _ in range(4):
        k = np.round((attacks - phase) / period)
        A = np.vstack([np.ones(keep.sum()), k[keep]]).T
        (phase, period), *_ = np.linalg.lstsq(A, attacks[keep], rcond=None)
        resid = attacks - (phase + period * k)
        keep = np.abs(resid) < .015
    k = np.round((attacks - phase) / period)
    resid = attacks - (phase + period * k)
    # the bass drop-out (breakdown) and where the bass comes back
    med = np.median(env)
    quiet = env < .12 * med
    runs, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None: start = i
        if not q and start is not None:
            if (i - start) * hop / RATE > .15: runs.append((float(times[start]), float(times[i])))
            start = None
    return {"eighth": float(period), "phase": float(phase), "attacks": attacks.tolist(),
            "eighth_index": k.astype(int).tolist(), "residual_ms": np.round(resid * 1000, 1).tolist(),
            "used": keep.tolist(), "bass_dropouts": runs}


def build_edit(source, first, phrase, bars, bar_len):
    """Repeat source[first, first + phrase) on bar lines; 4 ms crossfade at each splice."""
    duration = bars * bar_len
    n = round(duration * RATE)
    t = np.arange(n) / RATE
    pos = (first + np.mod(t, phrase)) * RATE
    idx = np.arange(len(source))
    song = np.column_stack([np.interp(pos, idx, source[:, c]) for c in range(2)])
    half = round(.004 * RATE)
    for boundary in np.arange(phrase, duration - 1e-6, phrase):
        b = round(boundary * RATE)
        sl = np.arange(max(0, b - half), min(n, b + half))
        rel = sl / RATE - boundary
        w = np.clip((rel + half / RATE) / (2 * half / RATE), 0, 1)
        out_pos = (first + phrase + rel) * RATE
        in_pos = (first + rel) * RATE
        for c in range(2):
            song[sl, c] = np.interp(out_pos, idx, source[:, c]) * np.cos(w * np.pi / 2) + \
                          np.interp(in_pos, idx, source[:, c]) * np.sin(w * np.pi / 2)
    return song


def analyse(song, duration, eighth, sections):
    mono = song.mean(axis=1)
    audio = np.interp(np.arange(math.ceil(duration * SR)) / SR, np.arange(len(mono)) / RATE, mono)
    features, flux = spectral_analysis(audio)
    onsets = {"kick": peak_events(flux["low"], .18), "snare": peak_events(flux["mid"], .13),
              "hat": peak_events(flux["high"], .065), "vocal": []}
    beat = 2 * eighth
    beats = [round(i * beat, 6) for i in range(0, math.floor(duration / beat) + 1)]
    return {"duration": round(duration, 6), "bpm": round(60 / beat, 4), "fps": FPS, "beats": beats,
            "downbeats": beats[::4], "sections": sections,
            "features": {k: [round(float(v), 4) for v in a] for k, a in features.items()}, "onsets": onsets,
            "notes": "Grid measured from the Short's kick attacks; onsets are band-flux peaks (routing labels, not stems)."}


def resolve(events, onsets, bar_len, eighth, offset=0.0):
    out = {}
    for name, spec in events.items():
        bar, e = spec[0], spec[1]
        t = offset + bar * bar_len + e * eighth
        snapped = None
        if len(spec) > 2:
            near = [(abs(ot - t), ot) for ot, s in onsets[spec[2]] if abs(ot - t) < .07 and s > .25]
            if near:
                # band-flux peaks run ~10-20 ms late; keep the grid time unless the hit is clearly off it
                d, ot = min(near)
                snapped = round(ot, 4)
                if d < .025: snapped = None
        out[name] = round(snapped if snapped is not None else t, 4)
    return out


def typing_times(spec, start, eighth):
    per = spec.get("per", .25) * eighth * 2  # 'per' is in beats
    delay = spec.get("delay", 0) * eighth * 2
    return [round(start + delay + i * per, 4) for i in range(len(spec["text"]))]


def mix_sfx(song, cues, sfx_list, extra_types):
    mixed = song.copy()
    cache = {}
    def place(name, at, db, align="onset"):
        if name not in cache:
            cache[name] = read_mono(SFX_DIR / f"{name}.wav")
        s = cache[name]
        env = np.sqrt(np.convolve(s * s, np.ones(240) / 240, "same"))
        lead = int(np.argmax(env)) if align == "peak" else 0
        start = round(at * RATE) - lead
        g = 10 ** (db / 20)
        a, b = max(0, start), min(len(mixed), start + len(s))
        if b > a:
            mixed[a:b] += (s[a - start:b - start] * g)[:, None]
    for item in sfx_list:
        place(item["sound"], cues[item["at"]], item["db"], item.get("align", "onset"))
    for at in extra_types:
        place("type", at, -21)
    return mixed


def loudnorm(ff, src, dst_wav, dst_mp3):
    probe = subprocess.run([ff, "-hide_banner", "-nostdin", "-i", str(src), "-af",
                            "loudnorm=I=-14:TP=-1:LRA=9:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
    text = probe.stderr[probe.stderr.rfind("{"):probe.stderr.rfind("}") + 1]
    m = json.loads(text)
    flt = (f"loudnorm=I=-14:TP=-1:LRA=9:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
           f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    run_ffmpeg(ff, ["-y", "-i", str(src), "-af", flt, "-ar", str(RATE), "-c:a", "pcm_s16le", str(dst_wav)])
    run_ffmpeg(ff, ["-y", "-i", str(dst_wav), "-c:a", "libmp3lame", "-b:a", "256k", str(dst_mp3)])
    return {k: m[k] for k in ("input_i", "input_tp", "input_lra")}


def waveform(song, duration, rate=200):
    mono = np.abs(song.mean(axis=1))
    n = math.ceil(duration * rate)
    hop = RATE // rate
    w = np.array([mono[i * hop:(i + 1) * hop].max() if i * hop < len(mono) else 0 for i in range(n)])
    w = w / max(1e-9, np.percentile(w, 99.5))
    return [round(float(min(1, v)), 3) for v in w]


def main():
    data = SOURCE.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    if sha != SOURCE_SHA:
        raise ValueError(f"{SOURCE} is not the supplied Short (sha256 {sha})")
    ff = ffmpeg_binary()
    raw = run_ffmpeg(ff, ["-i", str(SOURCE), "-f", "f32le", "-ac", "2", "-ar", str(RATE), "pipe:1"])
    source = np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(np.float64)
    score = json.loads((ROOT / "data/flex/score.json").read_text(encoding="utf-8"))

    grid = measure_grid(source)
    eighth = grid["eighth"]
    bar_len = 8 * eighth
    phrase = 6 * bar_len
    # bar lines sit where the eighth index is 0 mod 8 (the clip starts on one; the bass returns on bar 4)
    first = grid["phase"]
    while first - eighth * 8 > 0.05: first -= eighth * 8
    if first + phrase > len(source) / RATE:
        raise ValueError("The Short is shorter than the measured 6-bar phrase")
    drop_src = [b for a, b in grid["bass_dropouts"]]
    print(f"eighth {eighth:.6f}s  bar {bar_len:.5f}s  phrase {phrase:.5f}s  bpm {60 / (2 * eighth):.4f}  first {first:.4f}s")
    print("kick attacks", np.round(grid["attacks"], 3).tolist(), "residual ms", grid["residual_ms"])
    print("bass drop-outs (source s)", grid["bass_dropouts"])

    for variant, intro_bars in (("flex", 0), ("flex_full", score["intro_bars"])):
        bars = intro_bars + score["reel_bars"]
        song = build_edit(source, first, phrase, bars, bar_len)
        duration = bars * bar_len
        offset = intro_bars * bar_len
        names = [("intro", 0, offset)] if intro_bars else []
        sec = score["sections"]
        for i, s in enumerate(sec):
            end = sec[i + 1]["bar"] if i + 1 < len(sec) else score["reel_bars"]
            names.append((s["id"], offset + s["bar"] * bar_len, offset + end * bar_len))
        sections = [{"name": n, "start": round(a, 4), "end": round(b, 4)} for n, a, b in names]
        analysis = analyse(song, duration, eighth, sections)
        cues = resolve(score["events"], analysis["onsets"], bar_len, eighth, offset)
        types = []
        for key, spec in score["typing"].items():
            types += typing_times(spec, cues[key], eighth)
        sfx = list(score["sfx"])
        if intro_bars:
            cues.update(resolve(score["intro_events"], analysis["onsets"], bar_len, eighth, 0))
            for key, spec in score["intro_typing"].items():
                types += typing_times(spec, cues[key], eighth)
            sfx += score["intro_sfx"]
        mixed = mix_sfx(song * .89, cues, sfx, types)
        # 4 ms edges: when the platform loops the file, its end meets its start without a click
        edge = round(.004 * RATE)
        mixed[:edge] *= np.sin(np.linspace(0, np.pi / 2, edge))[:, None]
        mixed[-edge:] *= np.cos(np.linspace(0, np.pi / 2, edge))[:, None]
        # breakdowns and drops in this edit's time (every phrase repeat)
        breaks = []
        for p in range(bars // 6):
            for a, b in grid["bass_dropouts"]:
                breaks.append([round(a - first + p * phrase, 4), round(b - first + p * phrase, 4)])
        out = ROOT / "audio" / variant
        out.mkdir(parents=True, exist_ok=True)
        write_wav(out / "edit.wav", mixed)
        loud = loudnorm(ff, out / "edit.wav", out / "mix.wav", out / "mix.mp3")
        cue = {"variant": variant, "duration": round(duration, 6), "eighth": round(eighth, 7),
               "bar": round(bar_len, 7), "bars": bars, "intro_bars": intro_bars, "reel_offset": round(offset, 6),
               "sections": sections, "events": cues, "typing": {k: typing_times(v, cues[k], eighth) for k, v in
                                                                 {**score["typing"], **(score["intro_typing"] if intro_bars else {})}.items()},
               "breakdowns": breaks, "copy": {s["id"]: s["copy"] for s in sec},
               "wave_rate": 200, "wave": waveform(song, duration)}
        dump(ROOT / "data" / variant / "cues.json", cue)
        dump(ROOT / "data" / variant / "audio.json", analysis)
        dump(ROOT / "data" / variant / "lyrics.json", {"lines": []})
        dump(ROOT / "data" / variant / "manifest.json", {
            "source_url": "https://www.youtube.com/shorts/wm8wIdmbVRo", "source_sha256": sha,
            "source_version": "supplied ultra-slowed 15 s Short (a further slowdown than the official 'ULTRA SLOWED' release; it is not a clip of it)",
            "grid": {k: grid[k] for k in ("eighth", "phase", "attacks", "eighth_index", "residual_ms", "used", "bass_dropouts")},
            "edit": f"source [{first:.4f}, {first + phrase:.4f}) s (6 bars) repeated on bar lines, {bars} bars, 4 ms equal-power splices; no stretch or pitch change",
            "loop": "the edit is a whole number of phrases, so its end flows into its start",
            "sfx": "audio/sfx/*.wav placed at the resolved cue times (score.json), plus a quiet type tick per typed character",
            "loudness_in": loud, "loudness_target": "-14 LUFS integrated, -1 dBTP", "voiceover": False})
        print(f"{variant}: {bars} bars, {duration:.3f}s, {len(cues)} cues, breakdowns {breaks}")


if __name__ == "__main__":
    main()
