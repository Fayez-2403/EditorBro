"""Mix the Carbon-X reel (the duet_mix.py pattern): voice (audio/carbonx/voiceover.wav) + the score stems (carbonx_music.py) +
synthesized foley (the cue sheet's `sfx`). The voice clear at -14 LUFS integrated, the bed about -27 LUFS under speech (carved:
the whole bed -9 dB and its 250 Hz - 2.5 kHz band a further -7 dB on the voice's envelope), foley under a -12 dBFS ceiling and
ducked 6 dB under the voice, a look-ahead limiter, true peak under -1 dBTP. Writes audio/carbonx/mix.{wav,mp3},
data/carbonx/audio.json, projects/carbon-x/output/{voiceover.wav, beat-grid.json} and data/carbonx/mix_report.json
(the measured levels and every word's speech-band SNR).

    python analysis/carbonx_mix.py
"""
import json, pathlib, re, shutil, subprocess, sys, wave

import numpy as np
from scipy.signal import lfilter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import grokbot_mix as gx   # tone / noise / sweeps, the loader, ffmpeg on PATH
from pkgfw_mix import limit, lufs_tp
from script_carbonx import DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gx.SR
tone, noise, sweep, layer, lp, hp = gx.tone, gx.noise, gx.sweep_noise, gx.layer, gx.lp, gx.hp
rng = np.random.default_rng(2310)
BED_UNDER_SPEECH = -27.0   # LUFS of the music while the voice speaks (the brief: -25 to -30)
DUCK_DB, CARVE_DB = 9.0, 7.0
FOLEY_CEIL_DB = -12.0      # foley peaks in the final mix (the brief: SFX about -20 dB peak "or as appropriate"; -12 keeps UI clicks audible under the voice)


def sfx(kind):
    n = lambda d: int(d * SR); ts = lambda d: np.arange(n(d)) / SR
    if kind == "impact": return 0.9 * np.tanh(1.6 * layer(tone(70, 34, 1.0, 0.35), 0.4 * noise(0.3, 0.06, 200, 5000)))
    if kind == "erupt": return layer(0.5 * sweep(0.7, 200, 7000), 0.3 * tone(300, 1400, 0.7, 0.5))
    if kind == "pop": return 0.55 * tone(480, 1150, 0.09, 0.03)
    if kind == "bubble": return 0.45 * layer(tone(3400, 4800, 0.07, 0.025), np.pad(tone(4200, 5600, 0.07, 0.025), (n(0.06), 0)))   # above the voice band
    if kind == "scatter": return layer(*[np.pad(0.3 * tone(f, f * 1.2, 0.06, 0.02), (n(i * 0.045), 0)) for i, f in enumerate([1200, 1500, 1800, 2200])])
    if kind == "stamp": return gx.sfx("stamp")
    if kind == "bigstamp": return layer(gx.sfx("stamp"), 0.8 * np.tanh(1.8 * tone(110, 40, 0.6, 0.2)))
    if kind == "whoosh": return 0.5 * sweep(0.4, 500, 6500)
    if kind == "blip": return 0.5 * layer(tone(1320, 1320, 0.07, 0.025), np.pad(tone(1980, 1980, 0.09, 0.03), (n(0.06), 0)))
    if kind == "counter": return layer(*[np.pad(0.3 * tone(900 + 60 * i, 900 + 60 * i, 0.025, 0.008), (n(i * 0.045), 0)) for i in range(12)])
    if kind == "tick": return 0.45 * tone(2000, 2000, 0.04, 0.012)
    if kind in ("note", "note2", "note3", "note4"):
        f = {"note": 880, "note2": 988, "note3": 1175, "note4": 1319}[kind]; return 0.45 * layer(tone(f, f, 0.22, 0.08), 0.3 * tone(2 * f, 2 * f, 0.15, 0.04))
    if kind == "link": return 0.45 * layer(tone(900, 1800, 0.12, 0.05), np.pad(tone(1800, 1800, 0.08, 0.03), (n(0.07), 0)))
    if kind == "flow": return 0.4 * sweep(0.5, 800, 5000) * np.sin(np.pi * ts(0.5) / 0.5)
    if kind == "key": return 0.5 * layer(noise(0.018, 0.004, 2500, 9000), 0.3 * tone(1800, 1500, 0.02, 0.006))
    if kind == "paste": return 0.5 * layer(noise(0.03, 0.006, 1500, 8000), tone(500, 300, 0.06, 0.02))
    if kind == "flip": return 0.5 * layer(tone(700, 1400, 0.1, 0.04), np.pad(tone(1400, 700, 0.12, 0.05), (n(0.09), 0)), 0.3 * noise(0.04, 0.01, 2000, 8000))
    if kind == "ping": return 0.45 * layer(tone(1568, 1568, 0.4, 0.12), 0.5 * tone(2349, 2349, 0.35, 0.09))
    if kind == "slide": return 0.4 * sweep(0.22, 1200, 7000)
    if kind == "bar": return 0.4 * tone(600, 900, 0.07, 0.03)
    if kind == "ding": return 0.5 * layer(tone(1760, 1760, 0.6, 0.25), 0.4 * tone(2637, 2637, 0.5, 0.18))
    if kind == "down": return 0.5 * layer(sweep(0.5, 6000, 300), tone(400, 90, 0.5, 0.2))
    if kind == "unlock": return 0.45 * layer(tone(660, 660, 0.45, 0.2), np.pad(tone(990, 990, 0.55, 0.25), (n(0.08), 0)))
    if kind == "rack": return layer(*[np.pad(0.35 * tone(300 + 80 * i, 300 + 80 * i, 0.05, 0.02, "square"), (n(i * 0.06), 0)) for i in range(4)])
    if kind == "lock": return 0.6 * layer(noise(0.012, 0.003, 2000, 9000), tone(900, 600, 0.04, 0.012), 0.4 * tone(2500, 2500, 0.05, 0.015))
    if kind == "spin": return 0.45 * sweep(0.6, 300, 3000) * np.sin(np.pi * ts(0.6) / 0.6)
    if kind == "deny": return 0.4 * np.concatenate([tone(170, 170, 0.12, 0.2, "square"), np.zeros(n(0.04)), tone(150, 150, 0.16, 0.2, "square")])
    if kind == "fuse": return layer(0.45 * sweep(0.6, 300, 6000), 0.3 * tone(500, 1500, 0.6, 0.4), np.pad(0.4 * tone(1319, 1319, 0.5, 0.2), (n(0.45), 0)))
    if kind == "save": return gx.sfx("save")
    if kind == "stinger": return layer(gx.sfx("shimmer"), np.pad(0.4 * tone(1760, 1760, 0.8, 0.35), (n(0.05), 0)))
    raise ValueError(kind)


def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f >= hi)] = 0
    return np.fft.irfft(X, len(x))


def follow(v, att=0.02, rel=0.6):
    """An attack/release follower of a 0..1 envelope (fast up, slow down: the bed does not snap back between words)."""
    a, r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); out = np.empty_like(v); cur = 0.0
    for i in range(len(v)):
        x = v[i]; k = a if x > cur else r; cur = k * cur + (1 - k) * x; out[i] = cur
    return out


def compress(x, ratio=3.0, att=0.004, rel=0.09, knee_pct=70):
    """A feed-forward voice compressor: above the level of the louder syllables (the knee_pct percentile of the voiced
    envelope) the gain falls at 1 - 1/ratio, so the master limiter only has to catch stray peaks."""
    if np.abs(x).max() < 1e-4: return x, 0.0                            # the scratch take (no voice yet)
    e = follow(np.abs(x), att, rel); v = e[e > 0.02 * e.max()]
    thr = np.percentile(v, knee_pct); over = np.maximum(e / thr, 1.0)
    g = over ** (1 / ratio - 1); y = x * g
    return y * (np.abs(x).max() / (np.abs(y).max() + 1e-9)), float(20 * np.log10(g.min()))


def lufs(x):
    m = (np.clip(x, -1, 1) * 32767).astype(np.int16); s = np.stack([m, m], 1).tobytes()
    r = subprocess.run(["ffmpeg", "-nostats", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "pipe:0", "-af", "ebur128", "-f", "null", "-"], input=s, capture_output=True)
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr.decode())[-1])


def main():
    D = ROOT / "data" / "carbonx"; A = ROOT / "audio" / "carbonx"; O = ROOT / "projects" / "carbon-x" / "output"
    music = json.loads((D / "music.json").read_text()); cues = json.loads((D / "cues.json").read_text())
    L = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    N = int(round(DURATION * SR)); fit = lambda x: np.pad(x, (0, max(0, N - len(x))))[:N]
    vo = fit(gx.load(A / "voiceover.wav")); vo, vo_gr = compress(vo)
    st = {k: fit(gx.load(A / "stems" / f"{k}.wav")) for k in ("drums", "bass", "chords", "fx")}
    bed = 0.6 * st["drums"] + 0.75 * st["bass"] + 0.5 * st["chords"]
    # the voice's envelope -> duck (whole bed) and carve (its voice band)
    env = gx.envelope(vo); env = np.clip(env / (np.percentile(env[env > 1e-4], 80) + 1e-9), 0, 1) if (env > 1e-4).any() else env * 0
    env = follow(np.interp(np.arange(N), np.arange(len(env)) * (N / len(env)), env) if len(env) != N else env)
    duck = 10 ** (-DUCK_DB * env / 20); carve = 10 ** (-CARVE_DB * env / 20)
    mid = band(bed, 250, 4000)   # the whole speech band (2500 left a snare tail on "hain,")
    bed_p = (bed - mid + mid * carve) * duck + 0.7 * st["fx"] * (10 ** (-10 * env / 20))   # risers and impacts duck deeper (they masked "Comment DUET")
    fx = np.zeros(N)
    for t, kind, g in cues["sfx"]: gx.place(fx, t, sfx(kind), g)
    fxm = band(fx, 300, 4000); fx = (fx - fxm + fxm * 10 ** (-8 * env / 20)) * 10 ** (-6 * env / 20)   # the foley ducks under the voice, and its speech band carves 8 dB more
    speech = np.zeros(N, bool)
    for l in L:
        for w in l["words"]: speech[int(w["start"] * SR):int(w["end"] * SR)] = True
    mg, gain, ceil = 0.5, 1.0, 0.85
    for _ in range(4):   # solve the bed level (under speech) and the master gain together
        for _ in range(6):
            fxl = limit(0.32 * fx * gain, 10 ** (FOLEY_CEIL_DB / 20)) / gain     # the foley held under its ceiling in the final mix
            mix = vo + mg * bed_p + fxl
            out = limit(mix * gain, ceil); Lm, TP = lufs_tp(out)
            if TP > -1.3: ceil *= 10 ** ((-1.45 - TP) / 20)
            gain *= 10 ** ((-14.0 - Lm) / 20)
            if abs(Lm + 14) < 0.12 and TP <= -1.2: break
        under = lufs((mg * bed_p * gain)[speech])
        if abs(under - BED_UNDER_SPEECH) < 0.3: break
        mg *= 10 ** ((BED_UNDER_SPEECH - under) / 20)
    fxl = limit(0.32 * fx * gain, 10 ** (FOLEY_CEIL_DB / 20)) / gain
    pre = (vo + mg * bed_p + fxl) * gain; lim_gr = 20 * np.log10(max(1.0, np.abs(pre).max() / ceil))
    out = limit(pre, ceil); Lm, TP = lufs_tp(out)
    under = lufs((mg * bed_p * gain)[speech]); gaps = lufs((mg * bed_p * gain)[~speech])
    vo_l = lufs((vo * gain)[speech]); fxpk = 20 * np.log10(np.abs(fxl * gain).max() + 1e-9)
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(A / "mix.wav"), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.stack([pcm, pcm], 1).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(A / "mix.wav"), "-c:a", "libmp3lame", "-b:a", "256k", str(A / "mix.mp3")], check=True)
    O.mkdir(parents=True, exist_ok=True); shutil.copyfile(A / "voiceover.wav", O / "voiceover.wav")
    hop = SR // 100; frames = N // hop
    def feat(x):
        e = np.sqrt(np.mean(x[:frames * hop].reshape(frames, hop) ** 2, 1)); return np.round(e / (e.max() + 1e-9), 4).tolist()
    audio = {"duration": DURATION, "bpm": music["bpm"], "fps": 100, "beats": music["beats"], "downbeats": music["downbeats"],
             "sections": music["sections"],
             "features": {"rms": feat(out), "low": feat(lp(out, 200)), "mid": feat(hp(lp(out, 3000), 200)), "high": feat(hp(out, 3000)),
                          "vocal": feat(vo), "drums": feat(st["drums"]), "bass": feat(st["bass"]), "other": feat(st["chords"] + fxl)},
             "onsets": {"kick": music["kicks"], "snare": music["snares"], "hat": [], "vocal": [w["start"] for l in L for w in l["words"]]},
             "notes": "Carbon-X reel: synthesized 112 BPM score (exact grid), Liam voice, synthesized foley; analysis/carbonx_mix.py"}
    (D / "audio.json").write_text(json.dumps(audio))
    # every word's voice-to-background ratio in the shipped mix (a masking check that needs no speech-to-text)
    # measured in the speech band (300 Hz - 4 kHz), where masking costs intelligibility; broadband is kept for reference
    bg = (mg * bed_p + fxl) * gain; vv = vo * gain; snr, snr_bb = [], []
    vs, bs = band(vv, 300, 4000), band(bg, 300, 4000)
    rms = lambda x, a_, b_: np.sqrt(np.mean(x[a_:b_] ** 2)) + 1e-9
    for l in L:
        for w in l["words"]:
            a_, b_ = int(w["start"] * SR), max(int(w["start"] * SR) + 1, int(w["end"] * SR))
            snr.append((round(20 * np.log10(rms(vs, a_, b_) / rms(bs, a_, b_)), 1), w["w"], w["start"]))
            snr_bb.append(20 * np.log10(rms(vv, a_, b_) / rms(bg, a_, b_)))
    snr.sort(); snr_bb.sort()
    rep = {"integrated_lufs": round(Lm, 2), "true_peak_dbtp": round(TP, 2), "voice_lufs_while_speaking": round(vo_l, 2),
           "bed_lufs_under_speech": round(under, 2), "bed_lufs_between_words": round(gaps, 2), "duck_db": DUCK_DB, "carve_db_250_4000hz": CARVE_DB,
           "duck_plus_carve_voice_band_db": DUCK_DB + CARVE_DB, "foley_peak_dbfs": round(fxpk, 2), "voice_compressor_max_gr_db": round(vo_gr, 2), "master_limiter_max_gr_db": round(lim_gr, 2), "foley_cues": len(cues["sfx"]),
           "music_gain": round(mg, 4), "master_gain": round(gain, 4),
           "word_snr_speechband_db_min": snr[0][0], "word_snr_speechband_db_median": snr[len(snr) // 2][0],
           "word_snr_broadband_db_median": round(snr_bb[len(snr_bb) // 2], 1), "words_under_10db_speechband": [list(x) for x in snr if x[0] < 10],
           "worst_words": [list(x) for x in snr[:6]]}
    (D / "mix_report.json").write_text(json.dumps(rep, indent=1))
    (O / "beat-grid.json").write_text(json.dumps({
        "bpm": music["bpm"], "beat_s": music["beat"], "bar_s": music["bar"], "duration_s": DURATION,
        "source": "original score synthesized by analysis/carbonx_music.py (exact grid, no third-party audio)",
        "downbeats": music["downbeats"], "beats": music["beats"], "kicks": music["kicks"], "snares": music["snares"], "drop": music["drop"],
        "lowpass": music["lowpass"], "chapters": cues["chapters"], "events": cues["events"], "foley": cues["sfx"],
        "voice_lines": [{"chapter": l["chapter"], "start": l["start"], "end": l["end"], "text": l["text"]} for l in L], "levels": rep},
        indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(rep, indent=1))


if __name__ == "__main__":
    main()
