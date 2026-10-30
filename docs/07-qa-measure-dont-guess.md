# 7. Measure, don't guess

An AI will happily tell you a render is "looking great". These scripts tell you what's actually in the file.

## `analysis/reel_qa.py`: the gate before posting
```sh
python analysis/reel_qa.py out/my-reel_v1.mp4 --max-dur 60 [--allow-silence 7.83-8.0]
```
Each check prints PASS or FAIL with the measured value:
- the container and H.264 codec, yuv420p and the bt709 colour tags;
- 1080x1920 and 60 fps, plus the exact frame count;
- an audio stream present, and integrated loudness near -14 LUFS (check the true peak with `master.py`'s report);
- silences longer than allowed, with an allow-list for planned stops;
- the duration under the platform limit;
- the variant's cue grid and caption timing, when that data exists.

## `measure.py`: the motion-studio checks
| Command | What it tells you |
|---|---|
| `quarters <film>` | Loudness of every 0.25 s and the loudest moment. Is the hit really the peak? |
| `dip <film> --at a-b --ref c-d` | How far a planned stop drops below the build, in dB |
| `seam <film>` | For loops: is the last-to-first frame jump bigger than a normal frame step? |
| `colour <film\|png> --t 0.2 --box x,y,w,h --want D97757` | Brand colour on a lit surface: median RGB, clipping, distance to the wanted hex |
| `strobe <film>` | OpenCV: frames whose brightness jumps and jumps back (flicker that hurts on phones) |

## motionmaxxing `look.py`: the editor's eye, scripted
```sh
python .claude/skills/motionmaxxing/scripts/look.py out/my-reel_v1.mp4 --out out/qa/look --expect 55 --expect-audio --events cuts.json
```
- **G0:** no black or frozen first frame, and the duration as expected.
- **G2:** no frozen stretch, a measured amount of motion, the audio audible throughout.
- **G3:** the shot-length rhythm, the share of the final shot, and cut sync.

Give it an events file of the real cuts. A whip pan or a scan-line wipe has no hard edge, so the detector can miss it.
G1 (one hero per frame) and G4 (finish quality) are judged by eye on its `sheet.jpg`.

## Speech-to-text, every time
Run `captions.py` on the final mix, not only on the dry voice. Music can mask a syllable, and the viewer hears the mix.

## By eye, with rules
- **Contact sheets:** one frame per scene midpoint, plus a strip ±6 frames around each cut.
- **The 360 px phone test:** shrink the frame to phone width and read every line.
- **A silent watch-through:** does the story survive with the sound off?
- **Audio only:** does the story survive with the picture off?

## Write it down
Every round goes into `docs/review_log.md`: scores, the three worst problems, and the fixes with numbers. After the reel,
each fix becomes a rule for the next one.

Next: [websites and apps](08-websites-and-apps.md).
