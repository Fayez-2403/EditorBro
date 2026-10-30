# 6. Sound and voice

Sound is the timeline. The voice decides where the cuts go, and the score is written against the same timings, so the
hits land on the cuts.

## Voice
- **One take, then cut by words.** Generate the whole script as one take. ElevenLabs returns character-level timestamps,
  which become word timings. Scenes and captions are placed on those words. One take keeps the energy and the room tone
  consistent; per-line takes sound stitched.
- **Hinglish:** the voice gets Devanagari Hindi with English words in English, so the model pronounces both naturally.
  Captions on screen are Roman Hinglish.
- **Check every word** with speech-to-text: ElevenLabs Scribe, plus a local second opinion with faster-whisper:
  ```sh
  python .claude/skills/motion-studio/scripts/captions.py audio/takes/vo.mp3 --out audio/captions --lang hi --prompt "EditorBro, Claude Code"
  ```
  Scribe is good at hiding small slips. Whisper is the stricter judge for names and acronym plurals ("PDFs" must be
  heard as "pee-dee-effs").
- **Free fallback:** `edge-tts` (Microsoft neural voices) works without a key for drafts.
- **The channel default** is ElevenLabs "Liam" on `eleven_turbo_v2_5`, at about 1.12x speed. Change it in
  `.claude/skills/reel-pipeline/SKILL.md`.

## Score
Original music is synthesized in numpy/scipy, so it is owned and can follow the picture exactly:
- **Kick, snare and hats** on a measured grid. The tempo is picked to fit the voice, never retimed to a guess.
- **Bass and pads** follow a chord list. A **bell or pluck per list item** makes on-screen lists audible.
- **A ducked "stop"** (the music drops by 30-40 dB) right before the biggest reveal, then a sub-hit on the reveal.
- **Whooshes, ticks and risers** placed from the cue list, which comes from the same timeline.
- **Sidechain ducking** under the voice, so words always win.

## Mastering
```sh
python .claude/skills/motion-studio/scripts/master.py audio/out/mix_raw.wav public/audio/mix.wav --lufs -14 --tp -2
```
The chain:
- peak-normalise;
- a gentle 2:1 compressor;
- gain;
- a limiter;
- a loudness match to -14 LUFS integrated;
- a final true-peak trim (4x oversampled) so the peak stays under -2 dBTP.

The trim loops until the target holds, because a limiter's make-up gain can push the peak back over.

## Songs you don't own
Never bake a commercial song into a render. Ship an "IG-music master" (voice + effects, no music bed) and add the song
inside Instagram, where the licence is covered.

## Measure it
```sh
python .claude/skills/motion-studio/scripts/measure.py quarters out/reel.mp4              # loudness per 0.25 s, loudest moment
python .claude/skills/motion-studio/scripts/measure.py dip out/reel.mp4 --at 3.8-4.0 --ref 3.4-3.8   # how deep the stop is
```
The big hit should be among the loudest quarters, and the stop should measure 25 dB or more below the build.

Next: [measure, don't guess](07-qa-measure-dont-guess.md).
