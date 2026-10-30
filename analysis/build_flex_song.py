"""Motion Flex on a different song: measured beats -> the same score -> cues, SFX mix and engine data.

  python analysis/build_flex_song.py opp        (Oppenheimer: "Can You Hear The Music", Ludwig Goransson)
  python analysis/build_flex_song.py dp         (Daft Punk: "Harder, Better, Faster, Stronger")

Writes variants `flex_opp` (12 sections, the reel) and `flex_opp_full` (6-section process intro + the reel).
The song has no kick drum and its string pulse drifts, so the grid is the measured beat sequence itself
(librosa dynamic-programming tracker, tightness 400), not a fitted constant. One beat is the score's "eighth":
8 beats make a section (~2.36 s). The window is cut so the reel's last section (the title) starts exactly where
the music stops dead (~101.45 s in the track): MOTION FLEX solidifies in the silence. Nothing is stretched.
"""
from pathlib import Path
import hashlib
import json
import math

import numpy as np
import librosa

from prepare_motion_music import ffmpeg_binary, run_ffmpeg, spectral_analysis, peak_events, SR, FPS
from build_flex_audio import RATE, dump, write_wav, mix_sfx, loudnorm, waveform

ROOT = Path(__file__).resolve().parent.parent
SONGS = {
    "opp": {"source": "out/motion_references/oppenheimer/4JZ-o3iAJv4.webm", "variant": "flex_opp",
            "url": "https://www.youtube.com/watch?v=4JZ-o3iAJv4 (Ludwig Goransson channel, 'Can You Hear The Music')",
            "song": {"line1": "CAN YOU HEAR", "line2": "THE MUSIC", "tempo": "~203 bpm pulse", "short": "Oppenheimer theme",
                     "credit": "Can You Hear The Music · Ludwig Göransson (Oppenheimer)"}},
    "dp": {"source": "out/motion_references/daftpunk/yydNF8tuVmU.webm", "variant": "flex_dp",
           "url": "https://www.youtube.com/watch?v=yydNF8tuVmU (Daft Punk channel, official audio)",
           "song": {"line1": "HARDER, BETTER", "line2": "FASTER, STRONGER", "tempo": "123.45 bpm", "short": "Daft Punk",
                    "credit": "Harder, Better, Faster, Stronger · Daft Punk"},
           # constant four-on-the-floor grid; one section = one bar; the title lands on song bar 51 (the bar after the
           # drop that follows the 2-bar breakdown at bars 48-49) and holds 2 bars
           "title_bar": 51, "lockup_bars": 2},
    "bd": {"source": "out/motion_references/bigdawgs/hOHKltAiKXQ.webm", "variant": "flex_bd",
           "url": "https://www.youtube.com/watch?v=hOHKltAiKXQ (Hanumankind channel, official music video)",
           "song": {"line1": "BIG DAWGS", "line2": "HANUMANKIND", "tempo": "90 bpm", "short": "Big Dawgs",
                    "credit": "Big Dawgs · Hanumankind ft. Kalmi (prod. Kalmi)"},
           # the music video edits the track; the grid is fitted only where it is one continuous take (40-104 s);
           # one unit = the 180-level pulse (an eighth of 90 bpm); the bass drops out at units 163-165 and slams
           # back on unit 166 (95.61 s): ENDLESS POSSIBILITIES explodes there, the title lands a bar later (unit 174)
           "fit_window": [40, 104], "start_bpm": 180, "units_per_beat": 1, "title_unit": 174},
    "tr": {"source": "out/motion_references/trndsttr/r7Ve8ExE8YY.webm", "variant": "flex_tr",
           "url": "https://www.youtube.com/watch?v=r7Ve8ExE8YY (CloudKid channel, 'Black Coast - TRNDSTTR (Lucian Remix)')",
           "song": {"line1": "TRNDSTTR", "line2": "BLACK COAST", "tempo": "130 bpm", "short": "TRNDSTTR",
                    "credit": "TRNDSTTR (Lucian Remix) · Black Coast ft. M. Maggie"},
           # the song of the user's own reference edit (which starts at 55.58 s of this upload: the drop).
           # 130.04 bpm; one unit = a half-beat, a section = one bar (1.846 s). The bass is silent 45-55 s (the
           # build); it slams back on unit 240 (55.63 s, a bar line): the reel starts there, the full version's
           # 6-bar intro sits exactly on the build. Title on unit 328 (bar 11 of the reel), held 2 bars.
           "start_bpm": 100, "units_per_beat": 2, "title_unit": 328, "lockup_bars": 2, "fade_in": .005},
    "mim": {"source": "out/motion_references/murder/w-sQRS-Lc9k.webm", "variant": "flex_mim",
            "url": "https://www.youtube.com/watch?v=w-sQRS-Lc9k (KORDHELL channel, 'MURDER IN MY MIND')",
            "song": {"line1": "KORDHELL", "line2": "MURDER IN MY MIND", "tempo": "120 bpm", "short": "Murder In My Mind",
                     "credit": "Murder In My Mind · Kordhell"},
            # 120.01 bpm, 98% of beats within 7.8 ms. The tracker sits on the off-beats, so bar lines are units = 3
            # (mod 8). Every 8 bars a 2 s bass gap ends in a slam: 17.02, 33.02, 49.05 s. The full version starts on
            # the first slam (no slow start); the reel's apps scene lands on the second; ONE IDEA sits in the next gap
            # and ENDLESS POSSIBILITIES detonates on the third (unit 195); the title is unit 203, held 2 bars.
            "start_bpm": 120, "units_per_beat": 2, "title_unit": 203, "lockup_bars": 2, "fade_in": .005},
    "gl": {"source": "out/motion_references/dubplate/e2kIhlfmOJw.wav", "variant": "flex_gl",
           "url": "https://youtu.be/e2kIhlfmOJw (Little Lion Sound channel, 'General Levy - Dubplate - Hip-Hop Freestyle')",
           "song": {"line1": "DUBPLATE", "line2": "GENERAL LEVY", "tempo": "95 bpm", "short": "Dubplate",
                    "credit": "Dubplate · General Levy (Little Lion Sound)"},
           # 94.99 bpm, 95% of beats within 15 ms; one unit = an eighth (0.3158 s), a section = one bar (2.53 s). The
           # bass slams back on units = 1 (mod 8) after each gap, so those are the bar lines. The viral part (the
           # "Nuclear Bomb" chopper, found with speech-to-text: "...like a nuclear bomb" at 161.6 s, then the fast run
           # to ~172 s) is put up front: the title lands on the slam after the 187.2-187.8 s bass gap (unit 593,
           # 188.11 s), so the reel starts 11 bars earlier at 160.32 s and "like a nuclear bomb" hits 1.3 s in, on
           # the hook's unroll. (v1 of this cut used unit 305, 97.15 s.)
           "start_bpm": 170, "units_per_beat": 1, "title_unit": 593, "lockup_bars": 2, "fade_in": .005},
}


def const_grid(mono, window=None, start_bpm=120.0):
    """Steady songs: DP beats, then a robust straight-line fit (inside `window` if given); returns (period, first, p95)."""
    y = librosa.resample(mono, orig_sr=RATE, target_sr=22050)
    env = librosa.onset.onset_strength(y=y, sr=22050, hop_length=256)
    _, b = librosa.beat.beat_track(onset_envelope=env, sr=22050, hop_length=256, units="time", tightness=400, start_bpm=start_bpm)
    if window: b = b[(b >= window[0]) & (b < window[1])]
    # number the beats with the current period estimate, fit, renumber with the fitted period (no drift)
    # seed with the mean gap: tracker times are frame-quantised (11.6 ms), which biases the median
    per, c0, c1 = float((b[-1] - b[0]) / (len(b) - 1)), float(b[0]), 0.0
    for _ in range(4):
        k = np.round((b - b[0]) / per); A = np.vstack([np.ones_like(k), k]).T
        keep = np.ones(len(b), bool)
        for _ in range(3):
            (c0, c1), *_ = np.linalg.lstsq(A[keep], b[keep], rcond=None)
            keep = np.abs(b - (c0 + c1 * k)) < .03
        per = float(c1)
    return float(c1), float(c0), float(np.percentile(np.abs(b[keep] - (c0 + c1 * k[keep])), 95))


def main():
    import sys
    key = sys.argv[1] if len(sys.argv) > 1 else "opp"
    cfg = SONGS[key]
    SOURCE, SONG = ROOT / cfg["source"], cfg["song"]
    sha = hashlib.sha256(SOURCE.read_bytes()).hexdigest()
    ff = ffmpeg_binary()
    raw = run_ffmpeg(ff, ["-i", str(SOURCE), "-f", "f32le", "-ac", "2", "-ar", str(RATE), "pipe:1"])
    source = np.frombuffer(raw, dtype="<f4").reshape(-1, 2).astype(np.float64)
    mono = source.mean(axis=1)
    score = json.loads((ROOT / "data/flex/score.json").read_text(encoding="utf-8"))

    lockup = cfg.get("lockup_bars", 1)
    steady = "title_bar" in cfg or "title_unit" in cfg
    if steady:
        beat, first, p95 = const_grid(mono, cfg.get("fit_window"), cfg.get("start_bpm", 120.0))
        period = beat
        unit = beat / cfg.get("units_per_beat", 2)
        grid_src = first + unit * np.arange(0, int((len(mono) / RATE - first) / unit))
        i_cut = cfg["title_unit"] if "title_unit" in cfg else cfg["title_bar"] * 8
        cut = float(grid_src[i_cut])
        print(f"beat {beat:.5f}s ({60 / beat:.3f} bpm), first beat {first:.4f}s, p95 residual {p95 * 1000:.1f} ms; title at {cut:.3f}s")
    else:
        # where the music stops: the last 10 ms window within 9 dB of the climax, before the reverb tail
        w = int(.01 * RATE)
        r = np.sqrt(np.convolve(mono * mono, np.ones(w) / w, "same"))
        peak = np.percentile(r[int(90 * RATE):int(100 * RATE)], 95)
        loud = np.flatnonzero(r[:int(103 * RATE)] > peak * .35)
        cut = float(loud[-1]) / RATE
        # the pulse: dynamic-programming beat tracker on the onset envelope, held tight to its tempo
        y = librosa.resample(mono, orig_sr=RATE, target_sr=22050)
        hop = 128
        env = librosa.onset.onset_strength(y=y, sr=22050, hop_length=hop)
        _, beats = librosa.beat.beat_track(onset_envelope=env, sr=22050, hop_length=hop, units="time", tightness=400, start_bpm=190)
        beats = beats[beats < cut - .02]
        period = float(np.median(np.diff(beats[-40:])))
        # the title section starts on the beat the music cuts on: the first grid point at or after the cut
        i_cut = len(beats)
        grid_src = np.concatenate([beats, beats[-1] + period * np.arange(1, 40)])
        while grid_src[i_cut] < cut - period * .5: i_cut += 1
        print(f"cut {cut:.3f}s  beat at cut {grid_src[i_cut]:.3f}s  pulse {period:.4f}s ({60 / period:.1f} bpm)  beats {len(beats)}")

    base = cfg["variant"]
    for variant, intro in ((base, 0), (base + "_full", score["intro_bars"])):
        reel_bars = score["reel_bars"] - 1 + lockup
        sections = intro + reel_bars
        i0 = i_cut - (intro + score["reel_bars"] - 1) * 8
        if i0 < 0: raise ValueError("song too short for this many sections before the cut")
        start = float(grid_src[i0])
        units = grid_src[i0:i0 + sections * 8 + 1] - start  # every beat of the edit, plus the end point
        duration = float(units[-1])
        n = round(duration * RATE)
        song = np.zeros((n, 2))
        seg = source[int(round(start * RATE)):int(round(start * RATE)) + n]
        song[:len(seg)] = seg
        fade = max(1, int(cfg.get("fade_in", .03) * RATE)); song[:fade] *= np.linspace(0, 1, fade)[:, None]

        def at(bar, e):
            k = bar * 8 + e
            j = min(int(math.floor(k)), len(units) - 2)
            return float(units[j] + (units[j + 1] - units[j]) * (k - j))

        off = intro * 8
        events = {name: round(at(spec[0] + intro, spec[1]), 4) for name, spec in score["events"].items()}
        events["end"] = round(at(intro + reel_bars, 0), 4)
        if intro:
            events.update({name: round(at(spec[0], spec[1]), 4) for name, spec in score["intro_events"].items()})
        mean_unit = duration / (sections * 8)
        def typing(spec, t0):
            per = spec.get("per", .25) * mean_unit * 2
            return [round(t0 + spec.get("delay", 0) * mean_unit * 2 + i * per, 4) for i in range(len(spec["text"]))]
        typing_map = {k: typing(v, events[k]) for k, v in {**score["typing"], **(score["intro_typing"] if intro else {})}.items()}
        types = [t for v in typing_map.values() for t in v]
        sfx = list(score["sfx"]) + (score["intro_sfx"] if intro else [])
        if not steady:
            # the cut is the impact: a low boom where the music stops
            sfx.append({"sound": "boom", "at": "flex.solid", "db": -9})
        mixed = mix_sfx(song * .89, events, sfx, types)
        edge = round(.004 * RATE)
        mixed[-edge:] *= np.cos(np.linspace(0, np.pi / 2, edge))[:, None]

        mono_e = mixed.mean(axis=1)
        aud = np.interp(np.arange(math.ceil(duration * SR)) / SR, np.arange(len(mono_e)) / RATE, mono_e)
        feats, flux = spectral_analysis(aud)
        names = [("intro", 0, intro)] if intro else []
        for i, s in enumerate(score["sections"]):
            nxt = score["sections"][i + 1]["bar"] if i + 1 < len(score["sections"]) else reel_bars
            names.append((s["id"], s["bar"] + intro, nxt + intro))
        secs = [{"name": nm, "start": round(at(a, 0), 4), "end": round(at(b, 0), 4)} for nm, a, b in names]
        analysis = {"duration": round(duration, 6), "bpm": round(60 / period, 3), "fps": FPS,
                    "beats": [round(float(u), 5) for u in units], "downbeats": [round(float(u), 5) for u in units[::8]],
                    "sections": secs, "features": {k: [round(float(v), 4) for v in a] for k, a in feats.items()},
                    "onsets": {"kick": peak_events(flux["low"], .18), "snare": peak_events(flux["mid"], .13),
                               "hat": peak_events(flux["high"], .065), "vocal": []},
                    "notes": "Beats measured from the track (DP tracker); one beat = one score eighth; 8 beats = a section."}
        out = ROOT / "audio" / variant
        out.mkdir(parents=True, exist_ok=True)
        write_wav(out / "edit.wav", mixed)
        loud_in = loudnorm(ff, out / "edit.wav", out / "mix.wav", out / "mix.mp3")
        cue = {"variant": variant, "duration": round(duration, 6), "eighth": round(mean_unit, 7), "bar": round(mean_unit * 8, 7),
               "bars": sections, "intro_bars": intro, "reel_offset": round(at(intro, 0), 6) if intro else 0.0,
               "sections": secs, "events": events, "typing": typing_map, "breakdowns": [],
               "copy": {s["id"]: s["copy"] for s in score["sections"]}, "song": SONG,
               "grid": [round(float(u), 5) for u in units], "wave_rate": 200, "wave": waveform(song, duration)}
        dump(ROOT / "data" / variant / "cues.json", cue)
        dump(ROOT / "data" / variant / "audio.json", analysis)
        dump(ROOT / "data" / variant / "lyrics.json", {"lines": []})
        dump(ROOT / "data" / variant / "manifest.json", {
            "source": cfg["url"],
            "source_sha256": sha, "window_source_seconds": [round(start, 4), round(start + duration, 4)],
            "music_cut_source_seconds": round(cut, 4), "pulse_seconds": round(period, 5),
            "grid": ("constant grid fitted to DP beats; one score eighth per unit; a section = one bar" if steady
                     else "librosa beat_track (tightness 400, start 190 bpm) beats; one beat = one score eighth"),
            "edit": f"one continuous excerpt; {cfg.get('fade_in', .03) * 1000:.0f} ms fade-in, 4 ms fade-out; no stretch or pitch change",
            "loudness_in": loud_in, "loudness_target": "-14 LUFS integrated, -1 dBTP", "voiceover": False})
        print(f"{variant}: {sections} sections, {duration:.3f}s, source {start:.3f}-{start + duration:.3f}s, title at {events['flex.solid']:.3f}s")


if __name__ == "__main__":
    main()
