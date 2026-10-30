"""Build the 30s possibilities edit from the exact supplied 15s Short.

Preserves the original motion variant. Repeats a 24-pulse phrase without changing
pitch or tempo; a 6ms equal-gain splice handles waveform discontinuities. Major
visual landings select measured low-band transients near the requested story times.
"""
from pathlib import Path
import hashlib
import json
import math
import wave
import numpy as np
from prepare_motion_music import ffmpeg_binary, run_ffmpeg, spectral_analysis, peak_events, SR, FPS

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "out/motion_references/wm8wIdmbVRo.webm"
RATE = 48000
BPM = 98.9609
PERIOD = 60 / BPM
FIRST = .147
LOOP = 24 * PERIOD
JOIN = FIRST + LOOP
NAMES = ["hook", "websites", "apps", "dashboards", "product", "motion", "stories", "worlds", "music", "reveal"]
TARGETS = [0, 2, 5, 8, 11, 14, 17, 20, 23, 26]
COPY = ["WHAT CAN YOU BUILD?", "WEBSITES THAT COME ALIVE.", "APPS THAT FEEL MAGICAL.",
        "DATA TURNED INTO EXPERIENCES.", "PRODUCT STORIES THAT SELL.", "MOTION WITHOUT LIMITS.",
        "STORIES BROUGHT TO LIFE.", "WORLDS BUILT FROM CODE.", "SOUND YOU CAN SEE.",
        "ONE IDEA. ENDLESS POSSIBILITIES."]


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")


def wav(path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(RATE)
        out.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())


def analyse(samples, duration, first=0):
    # Resample for the existing engine's exact 100Hz feature contract.
    mono = samples.mean(axis=1)
    audio = np.interp(np.arange(math.ceil(duration * SR)) / SR,
                      np.arange(len(mono)) / RATE, mono)
    features, flux = spectral_analysis(audio)
    onsets = {"kick": peak_events(flux["low"], .18), "snare": peak_events(flux["mid"], .13),
              "hat": peak_events(flux["high"], .065), "vocal": []}
    grid = [round(first + i * PERIOD, 8) for i in range(-1, math.ceil(duration / PERIOD) + 2)]
    return {"duration": duration, "bpm": BPM, "fps": FPS, "beats": grid,
            "downbeats": [b for i, b in enumerate(grid) if (i-1) % 4 == 0], "sections": [],
            "features": {k: [round(float(v), 4) for v in a] for k, a in features.items()}, "onsets": onsets,
            "notes": "Measured band-transient routing; pulse grouping is editorial, not a verified downbeat transcription."}


def main():
    ff = ffmpeg_binary()
    raw = run_ffmpeg(ff, ["-i", str(SOURCE), "-f", "f32le", "-ac", "2", "-ar", str(RATE), "pipe:1"])
    original = np.frombuffer(raw, dtype="<f4").reshape(-1, 2).copy()
    if len(original) / RATE < JOIN:
        raise ValueError("The exact provided Short is too short for the selected phrase")
    duration = 30.
    times = np.arange(round(duration * RATE)) / RATE
    positions = (FIRST + np.mod(times, LOOP)) * RATE
    indices = np.arange(len(original))
    song = np.column_stack([np.interp(positions, indices, original[:, i]) for i in range(2)])
    # Symmetric tiny crossfade centred on the splice; no accumulated tempo shift.
    splice_samples = round(.006 * RATE)
    for boundary in np.arange(LOOP, duration, LOOP):
        n = round(boundary * RATE)
        idx = np.arange(n-splice_samples, n+splice_samples)
        rel = (idx / RATE-boundary)
        outgoing = (FIRST + LOOP + rel) * RATE
        incoming = (FIRST + rel) * RATE
        blend = np.linspace(0, 1, len(idx))
        for channel in range(2):
            song[idx, channel] = np.interp(outgoing, indices, original[:, channel])*(1-blend) + np.interp(incoming, indices, original[:, channel])*blend

    data = analyse(song, duration)
    hits = data["onsets"]["kick"]
    shots = []
    for name, requested, text in zip(NAMES, TARGETS, COPY):
        if not requested:
            at, strength = 0., 1.
        else:
            candidates = [(t,s) for t,s in hits if abs(t-requested) <= .24]
            if not candidates:
                candidates = [(t,s) for t,s in data["onsets"]["snare"] if abs(t-requested) <= .3]
            if not candidates:
                raise ValueError(f"No measured transient near {name}; inspect audio before continuing")
            at, strength = max(candidates, key=lambda hit: hit[1]-.6*abs(hit[0]-requested))
        shots.append({"id": name, "at": round(at, 4), "nominal": requested, "copy": text,
                      "onset_strength": strength, "anchor": "clip_start" if not requested else "measured_band_onset"})
    for i, shot in enumerate(shots):
        shot["end"] = shots[i+1]["at"] if i+1 < len(shots) else duration
    def event_near(target):
        candidates = [(t,s) for t,s in data['onsets']['snare'] + data['onsets']['hat'] if abs(t-target)<.18]
        if not candidates: raise ValueError(f'No interaction onset near {target}')
        return round(max(candidates,key=lambda hit:hit[1]-.9*abs(hit[0]-target))[0],4)
    interactions = {'website_click': event_near(shots[1]['at']+1.6),
                    'app_click': event_near(shots[2]['at']+.9),
                    'app_complete': event_near(shots[2]['at']+1.5),
                    'command_palette': event_near(shots[3]['at']+.9),
                    'catch_seed': event_near(shots[6]['at']+1.9)}
    # Six-frame lead-in morphs LAND on their actual measured transient.
    cue = {"duration": duration, "fps": 60, "bpm_editorial": BPM, "morph_lead_seconds": .32,
           "integrated_insert_seconds": JOIN, "shots": shots, "interactions": interactions,
           "final_lockup_at": min((x[0] for x in hits if 27.65 < x[0] < 28.6), default=28.2)}
    dump(ROOT / "data/possibilities/cues.json", cue)
    dump(ROOT / 'data/possibilities/sync-report.json', {
        'analysis_resolution_ms': 1000/FPS,
        'major_landings': [{'shot':s['id'],'audio_onset':s['at'],'first_frame_at_or_after':math.ceil(s['at']*60)/60,
                            'visual_latency_ms':round((math.ceil(s['at']*60)/60-s['at'])*1000,4)} for s in shots],
        'interaction_onsets':interactions, 'source_duration':len(original)/RATE,
        'phrase_repeat_seconds':[LOOP,2*LOOP],
        'verification':'Numerical alignment to measured band onsets. Musical meter is not asserted.'})

    # Sound embellishments are subtle and use the identical cue times as the visuals.
    rng = np.random.default_rng(8255)
    mixed = song * .79
    for shot in shots[1:]+[{'at':cue['final_lockup_at']}]+[{'at':v} for v in interactions.values()]:
        at = shot["at"]
        d = .17; n = round(d * RATE); tt = np.arange(n) / RATE
        click = .035 * np.sin(2*np.pi*(95*tt-90*tt*tt))*np.exp(-tt*33)
        start = round(at * RATE); mixed[start:start+n] += click[:,None]
        n = round(.14 * RATE); tt = np.linspace(0, 1, n)
        noise = rng.standard_normal(n)
        noise = np.convolve(noise, np.ones(9)/9, "same")
        whoosh = noise*.018*np.sin(np.pi*tt)**2
        start = round((at-.14)*RATE); mixed[start:start+n] += whoosh[:,None]
    # A short end taper prevents a truncated waveform, without slowing the music.
    fade = round(.09*RATE); mixed[-fade:] *= np.linspace(1,0,fade)[:,None]
    prefix = original[:round(JOIN*RATE)]*.79
    integrated = np.concatenate([prefix,mixed])
    variants = [("possibilities", mixed, data),
                ("motion_full", integrated, analyse(integrated, len(integrated)/RATE, FIRST))]
    for variant, samples, analysis in variants:
        analysis["sections"] = [{"name": s["id"], "start": s["at"]+(JOIN if variant=="motion_full" else 0),
                                  "end": s["end"]+(JOIN if variant=="motion_full" else 0)} for s in shots]
        if variant == "motion_full": analysis["sections"].insert(0,{"name":"original_motion", "start":0,"end":JOIN})
        output = ROOT / "audio" / variant
        master = output / "edit.wav"; wav(master,samples)
        run_ffmpeg(ff, ["-y", "-i", str(master), "-af", "loudnorm=I=-14:TP=-1:LRA=9",
                        "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "256k", str(output / "mix.mp3")])
        dump(ROOT / "data" / variant / "audio.json", analysis)
        dump(ROOT / "data" / variant / "lyrics.json", {"lines":[]})
        dump(ROOT / "data" / variant / "manifest.json", {
            "source_url":"https://www.youtube.com/shorts/wm8wIdmbVRo", "source_sha256":hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
            "source_version":"provided ultra-slowed 15s Short", "duration":analysis["duration"],
            "edit":"24-pulse phrase repeated at original tempo, 6ms splice, sparse synthesized accents",
            "phrase_source_start":FIRST,"phrase_seconds":LOOP,"tempo_editorial_bpm":BPM,
            "shot_anchors":"measured low/mid band onset times in cues.json; not rounded musical beats",
            "musicological_downbeat_verified":False, "voiceover":False})
    print(json.dumps(cue, indent=2))


if __name__ == "__main__":
    main()
