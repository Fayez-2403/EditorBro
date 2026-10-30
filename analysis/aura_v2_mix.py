"""The Editor's Aura V2 sound: audio/aura_v2/song.wav (aura_v2_audio.py) + the V2 foley (data/aura_v2/cues.json `sfx`, the same
synthesized sounds and level trims as V1, analysis/aura_mix.py). Writes audio/aura_v2/{mix.wav, mix.mp3, sfx.wav} at -14 LUFS.
    python analysis/aura_v2_mix.py            (V2)
    python analysis/aura_v2_mix.py aura_v3    (V3)
"""
import json, pathlib, subprocess, sys
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import aura_mix as am
import grokbot_mix as gx

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = am.SR


def main():
    var = sys.argv[1] if len(sys.argv) > 1 else "aura_v2"   # aura_v2 | aura_v3 (same pipeline)
    D, Au = ROOT / f"data/{var}", ROOT / f"audio/{var}"
    cues = json.loads((D / "cues.json").read_text()); sm = json.loads((D / "song_map.json").read_text())
    N = int(round(cues["duration"] * SR)); song = am.load_stereo(Au / "song.wav"); song = np.pad(song, ((0, max(0, N - len(song))), (0, 0)))[:N]
    fx = np.zeros(N); run = sm["anchors"]["chopper_run"]
    TRIM = {"sub": 0.35, "rumble": 0.4, "ping": 0.45, "flash": 0.6, "launch": 0.25}
    for i, (t, kind, g) in enumerate(cues["sfx"]): gx.place(fx, t, am.sfx(kind, i), g * TRIM.get(kind, 1.0) * (0.7 if run[0] <= t < run[1] else 1.0))
    FX = 6.0
    mix = song + FX * fx[:, None]
    gain, ceil = 1.0, 0.85
    for _ in range(8):
        out = am.limit(mix * gain, ceil); L, TP = am.lufs_tp(out)
        if TP > -1.2: ceil *= 10 ** ((-1.4 - TP) / 20)
        gain *= 10 ** ((-14.0 - L) / 20)
        if abs(L + 14) < 0.15 and TP <= -1.1: break
    out = am.limit(mix * gain, ceil); L, TP = am.lufs_tp(out)
    am.write(Au / "mix.wav", out)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(Au / "mix.wav"), "-c:a", "libmp3lame", "-b:a", "256k", str(Au / "mix.mp3")], check=True)
    stem = am.limit(np.stack([FX * fx * gain] * 2, 1), ceil); am.write(Au / "sfx.wav", stem)
    print(f"{var} mix: {cues['duration']:.1f} s, {L:.1f} LUFS, true peak {TP:.1f} dBTP; {len(cues['sfx'])} foley cues")


if __name__ == "__main__":
    main()
