"""Prepare a local music clip for the engine's deterministic `motion` variant.

Examples (run from the project root):
  python analysis/prepare_motion_music.py --input song.wav --start 12 --duration 15
  python analysis/prepare_motion_music.py --input song.wav --bpm 130 --first-beat .12 --beats 64
  python analysis/prepare_motion_music.py --placeholder --bpm 130 --beats 64

Requires numpy and ffmpeg. `--detector librosa` additionally requires librosa.
The automatic grid is an estimate, not a verified musical transcription. Listen
and inspect its beat times; manual BPM and phase overrides are recorded honestly.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 22000  # integral hop at 100 fps; no timing drift from a rounded hop
FPS = 100
FEATURE_NAMES = ("rms", "low", "mid", "high", "vocal", "drums", "bass", "other")
SOURCE_URL = "https://www.youtube.com/shorts/wm8wIdmbVRo"


def ffmpeg_binary() -> str:
    binary = shutil.which("ffmpeg")
    if binary:
        return binary
    candidates = sorted((Path.home() / "AppData/Local/Microsoft/WinGet/Packages").glob(
        "Gyan.FFmpeg*/*/bin/ffmpeg.exe"))
    if candidates:
        return str(candidates[-1])
    raise ValueError("ffmpeg was not found. Install it or add its bin folder to PATH.")


def run_ffmpeg(binary: str, args: list[str]) -> bytes:
    result = subprocess.run([binary, "-hide_banner", "-loglevel", "error", "-nostdin", *args],
                            capture_output=True)
    if result.returncode:
        raise ValueError("ffmpeg failed: " + result.stderr.decode("utf-8", errors="replace").strip())
    return result.stdout


def decode_audio(binary: str, source: Path) -> np.ndarray:
    raw = run_ffmpeg(binary, ["-i", str(source), "-vn", "-f", "f32le", "-ac", "1",
                             "-ar", str(SR), "pipe:1"])
    audio = np.frombuffer(raw, dtype="<f4").copy()
    if not len(audio) or not np.all(np.isfinite(audio)):
        raise ValueError("The input contains no usable, finite audio samples.")
    return audio


def normalized(values: np.ndarray) -> np.ndarray:
    peak = float(np.percentile(values, 98)) if len(values) else 0.0
    return np.clip(values / peak, 0, 1) if peak > 1e-10 else np.zeros_like(values)


def spectral_analysis(audio: np.ndarray) -> tuple[dict[str, np.ndarray], dict[str, np.ndarray]]:
    """Centered windows: feature sample i describes time i/FPS, not its window end."""
    count = max(1, math.ceil(len(audio) / SR * FPS))
    window, hop = 1024, SR // FPS
    padded = np.pad(audio, (window // 2, window))
    frames = np.lib.stride_tricks.sliding_window_view(padded, window)[::hop][:count]
    spectra = np.abs(np.fft.rfft(frames * np.hanning(window), axis=1))
    frequencies = np.fft.rfftfreq(window, 1 / SR)
    features = {name: np.zeros(count) for name in FEATURE_NAMES}
    features["rms"] = normalized(np.sqrt(np.mean(frames * frames, axis=1)))
    flux = {}
    for name, lower, upper in [("low", 35, 240), ("mid", 240, 2500), ("high", 2500, 10000),
                               ("full", 35, 10000)]:
        band = spectra[:, (frequencies >= lower) & (frequencies < upper)]
        if name != "full":
            features[name] = normalized(np.sqrt(np.mean(band * band, axis=1)))
        rises = np.maximum(0, np.diff(band, axis=0, prepend=band[:1]))
        flux[name] = normalized(np.mean(rises, axis=1))
    # These are not source-separated stems. Keep unsupported features at zero.
    return features, flux


def peak_events(envelope: np.ndarray, min_gap: float, threshold: float = .20) -> list[list[float]]:
    """Band-energy onset candidates; names in the engine are visual routing only."""
    if len(envelope) < 3:
        return []
    candidates = np.flatnonzero((envelope[1:-1] >= envelope[:-2]) &
                               (envelope[1:-1] > envelope[2:]) &
                               (envelope[1:-1] >= threshold)) + 1
    selected: list[int] = []
    distance = max(1, round(min_gap * FPS))
    for candidate in sorted(candidates, key=lambda i: (-float(envelope[i]), int(i))):
        if all(abs(int(candidate) - previous) >= distance for previous in selected):
            selected.append(int(candidate))
    return [[round(i / FPS, 6), round(float(envelope[i]), 4)] for i in sorted(selected)]


def numpy_grid(flux: dict[str, np.ndarray], supplied_bpm: float | None) -> tuple[float, float, dict]:
    """Autocorrelation tempo and comb-filter phase; no claim of downbeat detection."""
    envelope = .7 * flux["full"] + .3 * flux["low"]
    if float(np.max(envelope)) < 1e-6:
        if supplied_bpm is None:
            raise ValueError("No rhythmic transients detected. Supply --bpm and --first-beat, or use --placeholder.")
        return supplied_bpm, 0.0, {"method": "manual_tempo_no_detectable_phase", "tempo_candidates": []}
    candidates = []
    if supplied_bpm is None:
        centered = envelope - np.mean(envelope)
        for lag in range(math.ceil(60 * FPS / 200), math.floor(60 * FPS / 65) + 1):
            if lag >= len(centered):
                continue
            score = float(np.dot(centered[:-lag], centered[lag:]) / (len(centered) - lag))
            candidates.append((score, 60 * FPS / lag))
        if not candidates:
            raise ValueError("The audio is too short to estimate tempo. Supply --bpm and --first-beat.")
        candidates.sort(reverse=True)
        bpm = candidates[0][1]
    else:
        bpm = supplied_bpm
    period = 60 / bpm
    times = np.arange(len(envelope)) / FPS
    phases = np.arange(0, period, 1 / FPS)
    # Allow a 20 ms attack neighborhood around each beat; phase stays deterministic.
    scores = []
    for phase in phases:
        hits = np.arange(phase, times[-1] + .00001, period)
        score = sum(float(np.interp(hits + shift, times, envelope, left=0, right=0).mean())
                    for shift in [-.01, 0, .01]) if len(hits) else 0
        scores.append(score)
    first = float(phases[int(np.argmax(scores))])
    return float(bpm), first, {
        "method": "numpy_spectral_flux_autocorrelation_uniform_grid",
        "tempo_candidates": [{"bpm": round(tempo, 6), "score": round(score, 6)}
                             for score, tempo in candidates[:8]],
        "limitations": "Uniform estimated pulse; half/double-tempo ambiguity and phase errors are possible. No musical downbeat detection.",
    }


def estimate_grid(audio: np.ndarray, flux: dict[str, np.ndarray], detector: str,
                  supplied_bpm: float | None) -> tuple[float, float, dict]:
    if detector == "numpy":
        return numpy_grid(flux, supplied_bpm)
    try:
        import librosa
    except ImportError as error:
        raise ValueError("--detector librosa needs librosa: python -m pip install librosa") from error
    options = {"bpm": supplied_bpm} if supplied_bpm is not None else {}
    tempo, times = librosa.beat.beat_track(y=audio, sr=SR, hop_length=SR // FPS,
                                         units="time", trim=False, **options)
    bpm = float(np.asarray(tempo).reshape(-1)[0])
    if bpm <= 0 or len(times) < 2:
        raise ValueError("librosa found no stable pulse. Use a manual --bpm and --first-beat.")
    period = 60 / bpm
    # Reduce to a steady grid for reproducible phase interpolation. Preserve raw evidence.
    phases = np.asarray(times) % period
    angles = phases / period * 2 * np.pi
    first = float((np.angle(np.mean(np.exp(1j * angles))) % (2 * np.pi)) / (2 * np.pi) * period)
    return bpm, first, {
        "method": "librosa_beat_track_fitted_uniform_grid",
        "detected_beat_candidates_seconds": [round(float(t), 6) for t in times],
        "limitations": "Automatic beats fitted to a uniform grid; inspect half/double-tempo, phase and drift. No verified downbeat detection.",
    }


def beat_grid(bpm: float, first: float, duration: float) -> list[float]:
    """Include one contextual boundary before/after playback for engine interpolation."""
    period = 60 / bpm
    start_index = math.floor(-first / period)
    end_index = math.ceil((duration - first) / period)
    return [round(first + i * period, 8) for i in range(start_index, end_index + 1)]


def prepare(args: argparse.Namespace) -> dict:
    binary = ffmpeg_binary()
    root = args.output_root.resolve()
    files = [root / "audio/motion/mix.mp3", root / "data/motion/audio.json",
             root / "data/motion/lyrics.json", root / "data/motion/manifest.json"]
    source = args.input.expanduser().resolve() if args.input else None
    if source is not None and source in [file.resolve() for file in files]:
        raise ValueError("Input is one of the managed output files. Keep the original music in a separate location.")
    if source is not None and not source.is_file():
        raise ValueError(f"Audio input does not exist: {source}")
    if not args.force and any(file.exists() for file in files):
        raise ValueError("Motion outputs already exist. Use --force to replace generated outputs; the input is never modified.")
    if args.placeholder and args.start != 0:
        raise ValueError("--start applies only to a real source file.")
    source_duration = None
    if source is not None:
        decoded = decode_audio(binary, source)
        source_duration = len(decoded) / SR
        start_sample = round(args.start * SR)
        if start_sample >= len(decoded):
            raise ValueError(f"--start {args.start:g}s is outside the {source_duration:.6f}s source.")
        remaining = decoded[start_sample:]
        analysis_audio = remaining[:round(args.duration * SR)] if args.duration else remaining
        if len(analysis_audio) < SR:
            raise ValueError("At least one second of audio is needed for music preparation.")
        _, analysis_flux = spectral_analysis(analysis_audio)
        if args.bpm is not None and args.first_beat is not None:
            bpm, first, evidence = args.bpm, args.first_beat, {
                "method": "manual_uniform_grid",
                "limitations": "User/analyst supplied uniform grid; tempo grouping, phase and drift still require listening review.",
            }
        else:
            bpm, first, evidence = estimate_grid(analysis_audio, analysis_flux, args.detector, args.bpm)
            if args.first_beat is not None:
                first = args.first_beat
            if args.bpm is not None:
                evidence["manual_bpm"] = args.bpm
    else:
        bpm = args.bpm if args.bpm is not None else 130.0
        first = args.first_beat if args.first_beat is not None else 0.0
        evidence = {"method": "silent_provisional_design_grid", "limitations": "Not analyzed from the requested song."}
    period = 60 / bpm
    duration = args.duration if args.duration is not None else first + (args.beats or 64) * period
    if first >= period + 1e-8:
        raise ValueError(f"--first-beat must be in the first beat period [0, {period:.6f}) of the clip.")
    if duration < period:
        raise ValueError("The clip must include at least one full beat interval.")
    sample_count = round(duration * SR)
    if source is not None:
        if sample_count > len(remaining):
            raise ValueError(f"Not enough source audio: need {duration:.6f}s after --start {args.start:g}, "
                             f"but only {len(remaining) / SR:.6f}s remain. Use --duration or a longer source.")
        audio = remaining[:sample_count]
    else:
        audio = np.zeros(sample_count, dtype=np.float32)
    features, flux = spectral_analysis(audio)
    grid = beat_grid(bpm, first, duration)
    downbeats = [round(first + i * period, 8) for i in range(
        math.floor(-first / period / 4) * 4, math.ceil((duration - first) / period / 4) * 4 + 1, 4)]
    onsets = {"kick": peak_events(flux["low"], .18), "snare": peak_events(flux["mid"], .13),
              "hat": peak_events(flux["high"], .065), "vocal": []}
    status = "placeholder_silent_provisional" if args.placeholder else "music_prepared_timing_review_required"
    data = {
        "duration": round(duration, 8), "bpm": round(bpm, 8), "fps": FPS,
        "beats": grid, "downbeats": downbeats,
        "sections": [{"name": "motion_showreel", "start": 0, "end": round(duration, 8)}],
        "features": {name: [round(float(value), 4) for value in features[name]] for name in FEATURE_NAMES},
        "onsets": onsets,
        "notes": "Estimated/manual beat grid, grouped into provisional bars; onset labels are frequency-band proxies, not isolated instruments. See manifest.json.",
        "status": status,
    }
    # Engine indices start at grid[0], which can precede t=0.
    beat_at_start = -grid[0] / period
    manifest = {
        "schema_version": 1, "variant": "motion", "status": status,
        "song_title": args.title, "source_url": args.source_url,
        "source_file": str(source) if source else None,
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest() if source else None,
        "source_duration_seconds": source_duration,
        "source_clip_start_seconds": args.start,
        "analysis_start_sample": round(args.start * SR), "analysis_sample_rate": SR,
        "clip_duration_seconds": round(duration, 8),
        "source_clip_end_seconds": round(args.start + duration, 8) if source else None,
        "bpm": round(bpm, 8), "first_beat_seconds": round(first, 8),
        "beat_times_seconds": grid, "beat_span": duration / period,
        "beat_at_start": beat_at_start, "beat_at_end": beat_at_start + duration / period,
        "grid_boundaries_outside_playback_are_context_only": True,
        "timing": {**evidence, "manual_bpm": args.bpm, "manual_first_beat_seconds": args.first_beat,
                   "analyst_notes": args.timing_note,
                   "review_required": True, "downbeat_phase_verified": False},
        "audio_features": {"fps": FPS, "vocal_drums_bass_other": "zero: no source separation performed",
                           "kick_snare_hat": "low/mid/high spectral-flux onset candidates; not instrument transcription"},
        "outputs": [str(file.relative_to(root)).replace(os.sep, "/") for file in files],
    }
    root.mkdir(parents=True, exist_ok=True)
    # Finish decoding/analysis/encoding before replacing any generated assets.
    with tempfile.TemporaryDirectory(prefix="motion-music-", dir=root) as temp:
        staging = Path(temp)
        encoded = staging / "mix.mp3"
        if source is not None:
            encode_args = ["-i", str(source), "-ss", f"{args.start:.9f}", "-t", f"{duration:.9f}", "-vn"]
        else:
            encode_args = ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", f"{duration:.9f}"]
        run_ffmpeg(binary, [*encode_args, "-map_metadata", "-1", "-ac", "2", "-ar", "48000",
                            "-c:a", "libmp3lame", "-b:a", "192k", str(encoded)])
        payloads = [data, {"lines": []}, manifest]
        staged = [encoded]
        for target, payload in zip(files[1:], payloads):
            path = staging / target.name
            path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
            staged.append(path)
        for target, prepared in zip(files, staged):
            target.parent.mkdir(parents=True, exist_ok=True)
            prepared.replace(target)
    return manifest


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    source = result.add_mutually_exclusive_group(required=True)
    source.add_argument("--input", type=Path, help="Local source music; it is never modified.")
    source.add_argument("--placeholder", action="store_true", help="Make a SILENT, explicitly provisional preview guide.")
    length = result.add_mutually_exclusive_group()
    length.add_argument("--beats", type=int, help="Beat intervals after first beat (default 64); requires enough source audio.")
    length.add_argument("--duration", type=float, help="Exact clip duration in seconds, instead of a beat count.")
    result.add_argument("--start", type=float, default=0, help="Exact source clip offset in seconds (default 0).")
    result.add_argument("--bpm", type=float, help="Manual pulse tempo; placeholder defaults to provisional 130 BPM.")
    result.add_argument("--first-beat", type=float, help="Manual first beat in seconds relative to clip start, within the first period.")
    result.add_argument("--detector", choices=["numpy", "librosa"], default="numpy", help="Automatic tempo/phase estimator (default numpy).")
    result.add_argument("--title", default="Matushka Ultrafunk", help="Manifest title; verify version against source audio.")
    result.add_argument("--source-url", default=SOURCE_URL, help="Provenance link; does not download anything.")
    result.add_argument("--timing-note", action="append", default=[], help="Repeatable timing evidence or uncertainty note for the manifest.")
    result.add_argument("--output-root", type=Path, default=ROOT, help="Project root for generated audio/motion and data/motion assets.")
    result.add_argument("--force", action="store_true", help="Replace generated outputs; source is always protected.")
    return result


def main() -> None:
    cli = parser()
    args = cli.parse_args()
    for name in ("start", "bpm", "first_beat", "duration"):
        value = getattr(args, name)
        if value is not None and (not math.isfinite(value) or value < 0):
            cli.error(f"--{name.replace('_', '-')} must be finite and nonnegative")
    if args.bpm is not None and not 20 <= args.bpm <= 400:
        cli.error("--bpm must be between 20 and 400")
    if args.duration is not None and args.duration <= 0:
        cli.error("--duration must be positive")
    if args.beats is not None and args.beats < 1:
        cli.error("--beats must be positive")
    try:
        manifest = prepare(args)
    except ValueError as error:
        cli.error(str(error))
    print(f"Prepared motion: {manifest['clip_duration_seconds']:.3f}s, "
          f"{manifest['bpm']:.4f} BPM, {manifest['beat_span']:.3f} beat intervals")
    print(f"Status: {manifest['status']}; first beat {manifest['first_beat_seconds']:.4f}s")
    print("Review the grid against the exact audio before claiming beat-perfect sync.")


if __name__ == "__main__":
    main()
