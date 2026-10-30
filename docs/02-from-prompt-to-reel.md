# 2. From prompt to reel: the building flow

This is the whole path a reel takes, with the commands Claude runs at each step. You can run every step yourself too.

```
prompt ─▶ hook ─▶ reel-pipeline ─▶ scaffold ─▶ facts + brief ─▶ references ─▶ hook shot ─▶ voice ─▶ timeline
       ─▶ score ─▶ scenes ─▶ 540x960 check ─▶ review (score, fix 3) ─▶ ask ─▶ full render ─▶ QA ─▶ post kit
```

## 0. The prompt
Plain words are enough:

```
Make a 50-second reel about <topic>. Hinglish voice, captions, original score. Use only facts from <url>.
```

The `UserPromptSubmit` hook (`.claude/hooks/reel_pipeline_hint.py`) sees words like *reel*, *video* or *render*. It adds
a note telling Claude to run the `reel-pipeline` skill, plus `motion-studio` and `motionmaxxing`. Prompts that aren't about
video are left alone.

## 1. Scaffold the reel folder
```sh
python .claude/skills/motion-studio/scripts/new_reel.py my-reel --title "My Reel"
cd projects/my-reel && npm install
```
This gives a complete Remotion project:
- `docs/`: brief, fact check, asset manifest, style guide, character bible, shot list, review log, voice-over, edit
  decisions, credits;
- `src/`, `scripts/` (voice, timing, score, beats, contact sheets, render), `audio/`, `public/`, `post/` and `out/`.

Placeholder scenes render immediately, so the pipe works before any creative work starts.

Check the toolchain once per machine:
```sh
python .claude/skills/motion-studio/scripts/check_tools.py      # 16 tools: Blender, NumPy, Puppeteer, GSAP, Three.js, …
```

## 2. Facts and brief (gates 1-2)
- `docs/factcheck.md`: one row per claim, with its source, the evidence, a status and the exact on-screen wording.
  Anything unverified stays off screen. This comes **before** any voice-over.
- `docs/brief.md`: the YAML brief (mode, runtime, voice, hook, CTA, constraints) and the **block brief**:
  FILM / BRAND / FACTS / FORMAT / TIMELINE / BEATS / LOOP / CAMERA / LOOK / SOUND / CHECKS.
  The BEATS table gives each beat one belief it must "buy" from the viewer.
- Pick one film grammar: NEWS_LAUNCH, SOURCE_COMPILATION, MASCOT_FILM, EDITOR_AURA, PRODUCT_DEMO or EXPLAINER.

## 3. Reference study (gate 3)
Download the references, make timestamped contact sheets, and write down **one idea** per reference:
```sh
yt-dlp -o "ref.%(ext)s" "<reel url>"
ffmpeg -i ref.mp4 -vf "fps=18/<dur>,scale=220:-2,tile=6x3" -frames:v 1 sheet.jpg
```
Take the motion idea, never the footage, logo, music or copy. See `projects/editorbro/docs/references.md` for a worked
example.

## 4. Build the hook first
The first 2-4 seconds decide everything, so they are built and reviewed before the rest. Render look-dev stills and look
at them:
```sh
node projects/editorbro/web/scripts/capture.mjs --page reel.html --t 0.2,1.6,3.0,3.9 --w 540 --h 960 --out out/wip
```
Then log the round in `docs/review_log.md`: a 1-10 score per category, the three worst problems with timestamps, and the fix
for each with numbers.

## 5. Script and voice (gate 5)
- Write for the ear: value by line two, numbers as spoken. Hinglish goes to the voice in Devanagari with English words in
  English; captions are Roman.
- Generate **one take** (ElevenLabs, or edge-tts for free) and keep its word timestamps.
- Check every word with speech-to-text: ElevenLabs Scribe, plus `captions.py` (faster-whisper) as a second opinion:
  ```sh
  python .claude/skills/motion-studio/scripts/captions.py audio/takes/vo.mp3 --out audio/captions --lang hi
  ```

## 6. One timeline
`SCENE_TIMINGS.json` is built from the word timings. Scenes start on words, and cuts snap to silences. Picture and sound
read the same file, so the score's hits land exactly on the cuts.

## 7. Score and mix (gate 5)
An original score in numpy/scipy: a note per list item, a ducked "stop" before the big hit, risers into reveals. Master it:
```sh
python .claude/skills/motion-studio/scripts/master.py audio/out/mix_raw.wav public/audio/mix.wav --lufs -14 --tp -2
```

## 8. Scenes (gates 6-10)
Pick the renderer per shot ([engines](05-engines.md)):
- **Remotion:** type, captions, layout and assembly.
- **Three.js:** 3D worlds, captured through `window.seek(t)`.
- **The pdoom engine:** canvas plates.
- **Puppeteer:** HTML UI cards.
- **Blender:** a photoreal hero object.

Every scene is a pure function of time.

## 9. The 540x960 check (gate 9)
Render a low-res version **with sound** and watch it. Then score it in `review_log.md` and fix the three worst problems.
Repeat until every category is 8/10 or better.

## 10. Ask, then render (gate 12)
The full 1080x1920 render is slow, so Claude asks first. Earlier renders are never overwritten (`_v1`, `_v2`, …).

## 11. QA (gate 11)
```sh
python analysis/reel_qa.py out/my-reel_v1.mp4 --max-dur 60
python .claude/skills/motion-studio/scripts/measure.py quarters out/my-reel_v1.mp4
python .claude/skills/motion-studio/scripts/measure.py strobe out/my-reel_v1.mp4
```
These check: format, size, frame rate, colour tags, loudness, silences, loudness per quarter second, strobing, and a
final speech-to-text pass. See [measure, don't guess](07-qa-measure-dont-guess.md).

## 12. Post kit
The caption and hashtags (claims only from the fact check), a cover frame, and the delivery report: paths, specs, QA
numbers, facts and any conflicts, rights, and what is still a placeholder.

Next: [the skills map](03-skills-map.md).
