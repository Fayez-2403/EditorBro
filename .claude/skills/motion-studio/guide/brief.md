# The studio brief for a Tech पे Trek reel (fill before any code)

The pack's block brief, merged with the "Motion Engineering" director's brief and this channel's rules. Save it as `projects/<name>/BRIEF.md`. STORYBOARD.md and the timings/cues JSON are built from it.

```
FILM
One sentence the viewer remembers: ...
Audience: Indian tech viewers, Hinglish, phone, sound on 50 % of the time
Duration: <= 60 s   Format: 9:16 1080x1920, 60 fps (motion check at 540x960)
Hook (first 2 s, frame 0 already full): ...   Value by line 2: ...

BRAND (the block you swap)
HERO: the one thing on screen the film is about (product UI, a mascot, a number, a real clip) ...
APP: the real UI / cards / receipts we show, rendered by us from real data (Puppeteer pages), no fake logos ...
RESULT: what changes on screen as the story moves (a wall fills, a meter rises, a world builds) ...
SET: the built world (ground, light, depth, texture) — one per reel, never the last reel's look ...

FACTS (from FACTS.md only; numbers marked fixed)
G1 ... G2 ...   Illustrative visuals labelled "illustrative". Source credit small and quiet.

REFERENCE ANALYSIS (if a reference is given)
Palette (hex) / type (family, width, weight) / composition / pacing (s between changes) / motion (snap, glide,
overshoot, cut, hold) / texture.   DO NOT COPY: their logos, copy, subjects.

FORMAT / RENDERER
Remotion | pdoom (app/) | Puppeteer cards | Blender hero | mix: ... and why

TIMELINE (one file all layers read)
VO line timings -> SCENE_TIMINGS.json; cues.json for SFX/energy; or data/<v>/*.json; or timeline.py

BEATS (seconds; each: entry state -> exit state, reason)
0.0-2.0 HOOK     ...
2.0-6.0 PROBLEM  ...
...     REVEAL / PROOF / LIMITS / CLOSE (CTA end card <= 1.4 s)

LOOP (optional): last frame = first frame? what wraps in t mod T?

CAMERA: lens feel, drift, push-ins, cut or never cut ...

LOOK: palette tokens, type, quintic eases, springs per object class (micro UI 3 Hz/0.7, panels 2 Hz/0.8,
mascot 2 Hz/0.5, camera almost invisible), texture (grain, paper, glass) ...

SOUND: voice Liam (ElevenLabs, Hinglish, Devanagari TTS / Roman captions), score synthesized in numpy/scipy (or a
measured song grid), a note per list item, a ducked stop before the big hit, master -14 LUFS TP -2.

CHECKS: 4-6 look-dev stills -> 540x960 motion check with sound -> follow-ups with timecode + numbers ->
reel_qa.py, look.py G0-G4, measure.py quarters/dip/colour/strobe, STT on the final mix -> ask before full render.

DELIVERABLES: preview, final 1080x1920 (after OK), cover.png, post kit (caption, pinned comment, srt), NOTE.md
with numbers, retro rules appended to motionmaxxing taste/verdicts.md.
```

## The follow-up format (write one after every check)
```
<n> / <what was checked>
<timecode>: <what is wrong, measured> -> <the fix, with numbers>
```
For example:
- `6.02 s: clear glass lets the shelves read through the names -> dark glass backing, f/2.8`
- `0.0 s: frame 0 empty (mean luma 251, one element) -> titles land in the first 4 frames, dashed slots behind`
