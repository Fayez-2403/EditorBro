"""Mix the ASTRA.EXE reel: the voice (audio/astra/voiceover.wav), the original score (astra_music.py stems) and synthesized foley
driven by the simulation itself (projects/astra-exe/output/cues.json: every launch, impact, broken piece, collision, ring pass and
UI cue of the reel in reel time, from the real physics). The voice clear at -14 LUFS integrated; the bed about -24 LUFS under
speech (ducked 8 dB, its 250 Hz - 4 kHz band carved 6 dB more on the voice's envelope); foley ducked under the voice, its speech
band carved; a look-ahead limiter, true peak under -1 dBTP.

Writes audio/astra/mix.{wav,mp3} (voice + score + foley), audio/astra/mix_nomusic.wav (voice + foley: add licensed music in
Instagram's editor, e.g. the Aarambh Hai Prachand clip the brief suggests), audio/astra/music_only.wav, data/astra/mix_report.json
and projects/astra-exe/output/beat-grid.json.

    python analysis/astra_mix.py
"""
import json, pathlib, shutil, subprocess, sys, wave

import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import grokbot_mix as gx
from pkgfw_mix import limit, lufs_tp
from carbonx_mix import band, follow, compress, lufs
from script_astra import DURATION

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = gx.SR
tone, noise, sweep, layer, lp, hp = gx.tone, gx.noise, gx.sweep_noise, gx.layer, gx.lp, gx.hp
rng = np.random.default_rng(6502)
BED_UNDER_SPEECH = -24.0
DUCK_DB, CARVE_DB = 8.0, 10.0
FX_CARVE_DB, FX_DUCK_DB = 15.0, 5.0   # foley and hits: their speech band dips deep under the voice (the sub and the crackle stay)
N = int(round(DURATION * SR))


def ks(f, d, level=1.0, bright=0.6):
    """Karplus-Strong string (the bow's release twang)."""
    n = int(d * SR); L = max(2, int(SR / f)); buf = rng.standard_normal(L)
    for _ in range(2): buf = 0.5 * (buf + np.roll(buf, 1)) if bright < 0.5 else buf
    out = np.empty(n); k = 0
    for i in range(n):
        a = buf[k]; b = buf[(k + 1) % L]; out[i] = a; buf[k] = 0.5 * (a + b) * 0.9965; k = (k + 1) % L
    return level * out * np.minimum(1, np.arange(n) / (0.001 * SR))


def crumble(d, level=1.0, lo=150, hi=2500, dens=40):
    """Rock crumbling: many short filtered knocks."""
    n = int(d * SR); x = np.zeros(n)
    for _ in range(int(dens * d)):
        i = int(rng.uniform(0, n - 0.05 * SR)); m = int(rng.uniform(0.01, 0.05) * SR); f0 = rng.uniform(lo, hi)
        g = noise(m / SR, m / SR / 3, max(60, f0 * 0.5), f0 * 1.6) * rng.uniform(0.3, 1.0) * np.exp(-i / n * 1.5)
        x[i:i + len(g)] += g[:n - i]
    return level * x


def thunder(level=1.0):
    n = int(3.2 * SR); t = np.arange(n) / SR
    rum = lp(rng.standard_normal(n), 160) * (np.exp(-t / 1.1) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.7 * t) ** 2))
    crack = noise(0.25, 0.05, 600, 5000) * 0.5
    return level * layer(4 * rum, crack)


def glass(level=1.0):
    n = int(1.6 * SR); x = np.zeros(n)
    for _ in range(26):
        i = int(rng.uniform(0, 0.5) * SR); f = rng.uniform(2200, 7000); m = int(rng.uniform(0.2, 0.7) * SR)
        g = tone(f, f * rng.uniform(0.96, 1.02), m / SR, m / SR / 4) * rng.uniform(0.2, 0.6); x[i:i + len(g)] += g[:n - i]
    return level * layer(x, noise(0.35, 0.08, 2500, 11000) * 0.6)


def impact(mode, target, E, level=1.0):
    k = min(1.0, 0.45 + E / 6e9)
    base = layer(0.9 * np.tanh(1.6 * tone(78, 28, 1.6, 0.45)), 0.55 * noise(0.22, 0.03, 1500, 9000), crumble(2.8, 0.55, 120, 2200, 55))
    if mode == "vajra": extra = layer(*[np.pad(noise(0.03, 0.008, 3000, 9000) * 0.5, (int(rng.uniform(0, 0.5) * SR), 0)) for _ in range(16)], 0.8 * thunder(0.6))
    elif mode == "agni": extra = layer(0.6 * lp(rng.standard_normal(int(3.0 * SR)), 520) * np.minimum(1, np.arange(int(3.0 * SR)) / (0.2 * SR)) * np.exp(-np.arange(int(3.0 * SR)) / SR / 1.2),
                                       *[np.pad(noise(0.02, 0.006, 2000, 6000) * 0.35, (int(rng.uniform(0.1, 2.5) * SR), 0)) for _ in range(22)])
    elif mode == "vayu": extra = 0.7 * sweep(3.6, 350, 1800) * np.sin(np.pi * np.arange(int(3.6 * SR)) / int(3.6 * SR))
    else: extra = layer(*[np.pad(tone(f * 2, f, 3.0, 1.0) * 0.12, (0, 0)) for f in (220, 277, 330, 440)], 0.3 * sweep(2.4, 6000, 9000))
    if target in ("crystal",) or mode == "crystal": extra = layer(extra, glass(0.9))
    return level * k * layer(base, extra)


def sfx(kind):
    n = lambda d: int(d * SR)
    if kind == "cut": return layer(0.6 * np.tanh(1.5 * tone(110, 45, 0.5, 0.16)), 0.35 * sweep(0.35, 3000, 300))
    if kind == "cut-digital": return layer(*[np.pad(0.3 * tone(f, f, 0.05, 0.02, "square"), (n(i * 0.04), 0)) for i, f in enumerate([1800, 900, 2400, 600])])
    if kind == "panel-in": return 0.35 * sweep(0.3, 600, 5000) * np.sin(np.pi * np.arange(n(0.3)) / n(0.3))
    if kind == "panel-out": return 0.3 * sweep(0.3, 5000, 600) * np.sin(np.pi * np.arange(n(0.3)) / n(0.3))
    if kind == "click": return 0.55 * layer(noise(0.012, 0.003, 2500, 9000), tone(1500, 1100, 0.04, 0.012))
    if kind == "tick": return 0.22 * tone(2200, 2200, 0.025, 0.008)
    if kind == "key": return 0.4 * layer(noise(0.018, 0.004, 2500, 9000), 0.3 * tone(1800, 1500, 0.02, 0.006))
    if kind == "slam": return layer(0.7 * np.tanh(1.8 * tone(120, 42, 0.45, 0.14)), 0.3 * noise(0.08, 0.02, 400, 4000))
    if kind == "slam-soft": return layer(0.4 * tone(160, 60, 0.3, 0.1), 0.15 * noise(0.05, 0.015, 600, 5000))
    if kind == "freeze": return layer(gx.sfx("shimmer"), 0.4 * sweep(0.8, 9000, 2000))
    if kind == "whoosh-back": return 0.6 * sweep(0.85, 300, 3800) * np.sin(np.pi * np.arange(n(0.85)) / n(0.85))
    if kind == "whoosh-out": return 0.5 * sweep(0.6, 500, 6000) * np.sin(np.pi * np.arange(n(0.6)) / n(0.6))
    if kind == "tape-stop": return 0.4 * tone(400, 60, 0.5, 0.3, "sawtooth") * 0.4
    if kind == "tape-start": return 0.4 * tone(60, 400, 0.35, 0.3, "sawtooth") * 0.4
    if kind == "cta": return layer(0.5 * tone(500, 1100, 0.09, 0.03), np.pad(gx.sfx("shimmer"), (n(0.05), 0)))
    if kind == "chime": return layer(*[np.pad(0.3 * tone(f, f, 1.6, 0.6), (n(i * 0.08), 0)) for i, f in enumerate([1175, 1760, 2349, 2794])])
    raise ValueError(kind)


def main():
    D = ROOT / "data" / "astra"; A = ROOT / "audio" / "astra"; O = ROOT / "projects" / "astra-exe" / "output"
    music = json.loads((D / "music.json").read_text()); cues = json.loads((O / "cues.json").read_text())["cues"]
    L = json.loads((D / "lyrics.json").read_text(encoding="utf-8"))["lines"]
    fit = lambda x: np.pad(x, (0, max(0, N - len(x))))[:N]
    vo = fit(gx.load(A / "voiceover.wav")); vo, vo_gr = compress(vo)
    st = {k: fit(gx.load(A / "stems" / f"{k}.wav")) for k in ("drums", "bass", "strings", "lead", "drone", "fx")}
    music_fx = st["fx"]
    bed = 0.75 * st["drums"] + 0.7 * st["bass"] + 0.55 * st["strings"] + 0.5 * st["lead"] + 0.36 * st["drone"]
    # ---- foley from the simulation
    fx = np.zeros(N); count = {}
    def put(t, x, g=1.0, k="?"): gx.place(fx, t, x, g); count[k] = count.get(k, 0) + 1
    ev = lambda typ: [c for c in cues if c["type"] == typ]
    launches = ev("launch"); impacts = ev("impact")
    for c in launches:
        p = c.get("power", 1.0)
        put(c["t"], ks(98 + 40 * p, 0.9, 0.55), 1.0, "twang")
        put(c["t"], 0.5 * sweep(0.35, 2400, 500), 0.8, "air")
        put(c["t"], 0.6 * tone(70, 38, 0.25, 0.08), p, "thump")
    for c in impacts:
        # an arrow arriving without its launch on screen (the hook, the four modes): its rush in, ending on the impact
        # (the hook's arrow is in frame at 0.00 s, so its rush starts on the first sample: no silent first frame)
        if not any(l["shot"] == c["shot"] and l["t"] < c["t"] for l in launches):
            t0 = 0.0 if c["t"] < 0.6 else c["t"] - 0.45; d = c["t"] - t0
            put(t0, 0.7 * sweep(d, 700, 5500) * np.linspace(0.3, 1, int(d * SR)) ** 2, 1.0, "incoming")
        else:
            l = max((l for l in launches if l["shot"] == c["shot"] and l["t"] < c["t"]), key=lambda l: l["t"]); d = c["t"] - l["t"]
            put(l["t"] + 0.05, 0.35 * sweep(d, 900, 2600) * np.linspace(0.6, 1, int(d * SR)), 1.0, "flight")
        put(c["t"], impact(c["mode"] if c["shot"] != "impossible" else "crystal", c.get("target", ""), c.get("E", 1e9)), 0.6, "impact")
    # pieces breaking off: crumble, at most one burst per 60 ms window, scaled by how many broke in it
    br = sorted(c["t"] for c in ev("break")); i = 0
    while i < len(br):
        j = i
        while j < len(br) and br[j] - br[i] < 0.06: j += 1
        put(br[i], crumble(0.35, min(1.0, 0.25 + 0.05 * (j - i)), 200, 3000, 30), 0.5, "crumble"); i = j
    # collisions between loose pieces: knocks, at most 18 a second
    last = -1.0
    for c in ev("contact"):
        if c["t"] - last < 1 / 18: continue
        last = c["t"]; f0 = rng.uniform(140, 600)
        put(c["t"], noise(0.06, 0.02, f0, f0 * 3) * min(1.0, 0.15 + c.get("force", 10) / 400), 0.6, "knock")
    for c in ev("ring"):
        f = [1318.5, 1567.98, 1975.53][c["idx"]]; put(c["t"], layer(tone(f, f, 1.2, 0.45), 0.3 * tone(f * 2.76, f * 2.76, 0.5, 0.15)), 0.7, "ring")
    for c in ev("won"):
        for k_, f in enumerate([587.33, 739.99, 880, 1174.66]): put(c["t"] + 0.3 + k_ * 0.1, tone(f, f, 0.8, 0.3), 0.35, "won")
    for c in ev("lightning"): put(c["t"] + 0.9 + (c["slot"] % 3) * 0.5, thunder(0.5), 0.6, "thunder")
    # the bow: creak grains and a rising tension hum from each grab until its release (or for 2.5 s)
    for g in ev("grab"):
        rel = min([l["t"] for l in launches if l["t"] > g["t"]] + [g["t"] + 2.5]); d = max(0.2, rel - g["t"])
        nH = int(d * SR); tt = np.arange(nH) / SR
        hum = (0.25 * np.sin(2 * np.pi * np.cumsum(55 + 30 * tt / d) / SR) + 0.12 * np.sin(2 * np.pi * np.cumsum(220 + 260 * tt / d) / SR)) * (tt / d) ** 1.4
        put(g["t"], hum, 0.6, "tension")
        for k_ in range(int(d / 0.12)): put(g["t"] + k_ * 0.12 + rng.uniform(0, 0.03), noise(0.035, 0.01, 350 + 700 * k_ * 0.12 / d, 1200 + 700 * k_ * 0.12 / d) * 0.22, 0.6, "creak")
    for c in ev("sfx"): put(c["t"], sfx(c["kind"]), 0.8, c["kind"])
    # ---- duck and carve on the voice
    env = gx.envelope(vo); env = np.clip(env / (np.percentile(env[env > 1e-4], 80) + 1e-9), 0, 1)
    env = follow(np.interp(np.arange(N), np.arange(len(env)) * (N / len(env)), env) if len(env) != N else env)
    duck = 10 ** (-DUCK_DB * env / 20); carve = 10 ** (-CARVE_DB * env / 20)
    mid = band(bed, 250, 4000); bed_p = (bed - mid + mid * carve) * duck
    fx = fx + 0.45 * music_fx   # the score's hits ride with the foley (same treatment under the voice)
    fxm = band(fx, 300, 4000); fx_p = (fx - fxm + fxm * 10 ** (-FX_CARVE_DB * env / 20)) * 10 ** (-FX_DUCK_DB * env / 20)
    speech = np.zeros(N, bool)
    for l in L:
        for w in l["words"]: speech[int(w["start"] * SR):int(w["end"] * SR)] = True
    mg, fg, gain, ceil = 0.5, 0.55, 1.0, 0.85
    for _ in range(4):
        for _ in range(6):
            mix = vo + mg * bed_p + fg * fx_p
            out = limit(mix * gain, ceil); Lm, TP = lufs_tp(out)
            if TP > -1.3: ceil *= 10 ** ((-1.45 - TP) / 20)
            gain *= 10 ** ((-14.0 - Lm) / 20)
            if abs(Lm + 14) < 0.12 and TP <= -1.2: break
        under = lufs((mg * bed_p * gain)[speech])
        if abs(under - BED_UNDER_SPEECH) < 0.3: break
        mg *= 10 ** ((BED_UNDER_SPEECH - under) / 20)
    pre = (vo + mg * bed_p + fg * fx_p) * gain; lim_gr = 20 * np.log10(max(1.0, np.abs(pre).max() / ceil))
    out = limit(pre, ceil); Lm, TP = lufs_tp(out)

    def write(path, y):
        pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16)
        with wave.open(str(path), "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.stack([pcm, pcm], 1).tobytes())
    write(A / "mix.wav", out)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(A / "mix.wav"), "-c:a", "libmp3lame", "-b:a", "256k", str(A / "mix.mp3")], check=True)
    # the no-music version (voice + foley at the same levels), loudness-matched; and the score alone
    nm = vo + fg * fx_p; g2 = 1.0
    for _ in range(6):
        o2 = limit(nm * g2, ceil); L2, T2 = lufs_tp(o2); g2 *= 10 ** ((-14.0 - L2) / 20)
        if abs(L2 + 14) < 0.15: break
    write(A / "mix_nomusic.wav", limit(nm * g2, ceil))
    write(A / "music_only.wav", limit((mg * bed + fg * 0.45 * music_fx) * gain, ceil))
    O.mkdir(parents=True, exist_ok=True); shutil.copyfile(A / "voiceover.wav", O / "voiceover.wav")
    under = lufs((mg * bed_p * gain)[speech]); gaps = lufs((mg * bed_p * gain)[~speech]); vo_l = lufs((vo * gain)[speech])
    bg = (mg * bed_p + fg * fx_p) * gain; vv = vo * gain
    vs, bs = band(vv, 300, 4000), band(bg, 300, 4000); snr = []
    rms = lambda x, a_, b_: np.sqrt(np.mean(x[a_:b_] ** 2)) + 1e-9
    for l in L:
        for w in l["words"]:
            a_, b_ = int(w["start"] * SR), max(int(w["start"] * SR) + 1, int(w["end"] * SR))
            snr.append((round(20 * np.log10(rms(vs, a_, b_) / rms(bs, a_, b_)), 1), w["w"], w["start"]))
    snr.sort()
    rep = {"integrated_lufs": round(Lm, 2), "true_peak_dbtp": round(TP, 2), "voice_lufs_while_speaking": round(vo_l, 2),
           "bed_lufs_under_speech": round(under, 2), "bed_lufs_between_words": round(gaps, 2), "duck_db": DUCK_DB, "carve_db_250_4000hz": CARVE_DB,
           "voice_compressor_max_gr_db": round(vo_gr, 2), "master_limiter_max_gr_db": round(lim_gr, 2), "music_gain": round(mg, 4), "foley_gain": fg,
           "foley_counts": count, "word_snr_speechband_db_min": snr[0][0], "word_snr_speechband_db_median": snr[len(snr) // 2][0],
           "words_under_8db_speechband": [list(x) for x in snr if x[0] < 8], "worst_words": [list(x) for x in snr[:6]]}
    (D / "mix_report.json").write_text(json.dumps(rep, indent=1, ensure_ascii=False), encoding="utf-8")
    (O / "beat-grid.json").write_text(json.dumps({
        "bpm": music["bpm"], "beat_s": music["beat"], "bar_s": music["bar"], "first_downbeat_s": music["pickup"], "duration_s": DURATION,
        "source": "original score synthesized by analysis/astra_music.py (no samples, no third-party audio)",
        "downbeats": music["downbeats"], "beats": music["beats"], "hits": music["hits"], "sections": music["sections"], "slowmo": music["slowmo"],
        "impacts": [{"t": round(c["t"], 3), "shot": c["shot"], "mode": c["mode"]} for c in impacts],
        "ring_passes": [round(c["t"], 3) for c in ev("ring")],
        "for_instagram_music": "mix_nomusic: voice + foley only. If you add a licensed track in Instagram's editor, line its big accents up with the impacts above (0.50, 16.13, 26.75, 51.12 s are the main ones).",
        "voice_lines": [{"chapter": l["chapter"], "start": l["start"], "end": l["end"], "text": l["text"]} for l in L], "levels": rep},
        indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(rep, indent=1, ensure_ascii=False))


if __name__ == "__main__":
    main()
