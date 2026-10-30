# Review log: EditorBro: Welcome to the Studio

After every check (stills, motion check, final), log (master studio §17, motion-studio follow-up format):
1. a score from 1 to 10 per category;
2. the three biggest problems, with timestamps;
3. the fix for each, with numbers.

Then re-render only those sections. Facts and rights pass or fail on their own, regardless of the scores.

## Round 1: hook look-dev stills, highway billboard shot (30 Oct 2026)
**Checked:** `out/wip_hook1/sheet.jpg` (540x960, t = 0.2 / 1.6 / 2.6 / 3.9 s).

| Category | Score |
|---|---|
| Opening hook clarity and strength | 6 |
| Composition, camera continuity, depth | 6 |
| Motion quality, easing | n/a (stills) |
| Media rights and attribution | PASS (own sign art, OFL font, no game assets) |
| Overall polish | 4 |

**Three biggest problems:**
1. **0.2 s:** the clapperboard fills the frame (the slate is 3.8 m from the lens). **Fix:** truck start z -9 → -17.
2. **All shots:** a flat grey-white sky that reads overcast, not golden hour. **Fix:**
   - zenith (0.13, 0.29, 0.58), horizon (1.0, 0.70, 0.45);
   - sun 3.4 → 4.4, warmer;
   - hemisphere light 1.1 → 0.75;
   - exposure 1.05 → 0.95.
3. **3.9 s:** a power pole cuts through the sign, and the bushes read as smooth green rocks. **Fix:**
   - pole line +20 m;
   - leaf texture with bump on the bushes, plus about 7,500 alpha leaf-card clumps;
   - sign base 6.0 → 7.2 m;
   - end FOV 31 → 33°.

## Round 2: look-dev stills + the 4.2 s motion check (30 Oct 2026)
**Checked:**
- `out/wip_hook2/sheet.jpg`
- `out/editorbro_hook_v1_lookdev_540x960.mp4` (252 frames, 60 fps)
- `out/wip_hook2/motion_strip.jpg`

| Category | Score |
|---|---|
| Opening hook clarity and strength | 7 |
| Composition, camera continuity, depth | 8 |
| Motion quality, easing | 7 |
| Media rights and attribution | PASS |
| Overall polish | 6 |

**Three biggest problems (next round):**
1. **0-1 s:** the truck reads as boxes. **Fix:** a cab with a rounded profile, bed rails, chrome bumper, wheel arches and a tow hitch.
2. **All shots:** the golden hour is still mild, and there is no low sun glare or haze shafts. **Fix:**
   - sun elevation 0.24 → 0.14;
   - a lens-flare sprite and an atmospheric height fog band;
   - bloom 0.32 → 0.45.
3. **3.9 s:** the end frame holds; it needs the hand-off. **Fix:** at 4.0 s a top-down scan line flips the world to wireframe and the "100% code" card lands.

## Round 3: hook retimed to the VO + the flip crane (30 Oct 2026)
**Checked:** `out/wip_hook4/` (540x960).

**Fixed:**
- The push-in ends at 4.35 s (FLIP_AT), keyed to "ye poora scene code hai" (4.65 s).
- The crane after the flip: y +14, z +16 m. The road and ground are subdivided, so the wireframe shows a lane grid.
- The sign stays a hologram.

**Hook score:** 8/10.

## Reel round 1: 24 checkpoint stills of the full Remotion cut (30 Oct 2026, `out/wip_reel1/sheet.jpg`)
| Category | Score |
|---|---|
| Opening hook clarity and strength | 8 |
| Mobile readability (360 px phone test) | 6 |
| Composition, camera continuity, depth | 7 |
| Scene variety, retention | 8 |
| Media rights and attribution | PASS (own renders; demo brands fictional) |
| Overall polish | 6 (demo phones are placeholders) |

**Three biggest problems:**
1. **5.9 s:** "100% CODE" and "rendered, not filmed." sit on the billboard, and `cameraFrames` crosses it. **Fix:**
   - the type moves to y 215-600 at sizes 190 / 160 / 46;
   - the code line moves to y 1300.
2. **10.0 s:** terminal text at 36 px is too small for a phone. **Fix:** width 960, 44 px, top 400.
3. **45.8 s:** "→ RENDER" bleeds off the right edge ("RENDE"). **Fix:** 210 px at 66 % width.

**Also fixed:**
- gate labels 25 → 30 px;
- the CTA fork cards no longer cover the URL;
- the poster-wall tag reworded.

## Reel round 2: the fixed frames (`out/wip_reel2/sheet.jpg`)
- All five fixes verified on stills.
- Still open: the nine demo phones and laptops are placeholders until the demo builds are captured.

## Reel round 3: 540x960 previews with sound (v1 → v2, 30 Oct 2026)
**v1** (`out/editorbro_v1_preview_540x960_60fps.mp4`):
- reel_qa: loudness -14.2 LUFS, no unplanned silence, 54.912 s / 3294 frames.
- look.py: G0 PASS, G3 PASS (final shot 5 %), G2 FAIL (5 flat runs).
- Cut sync: 1/8 (12 %). Strobe: 4 one-frame spikes.

**Fixes:**
- Dip peak 85 %; the flash is radial at 72 %; the websites cut is a flash.
- The phone wall starts at 50 % opacity, and the last phone overlaps the wall by 0.15 s.
- An impact or click on every scene cut.

**v2:**
- Cut sync 7/8 (88 %).
- G2 dropped to 3 runs. All three were re-checked on stills after the last fix: brightness spread 14.8-106.7 (none flat).
- Strobe spikes at 21.92 s and 30.90 s are inside the source clips (the Maison Milan hit, Threadline's quick view).

**Scores:**

| Category | Score |
|---|---|
| Opening hook | 8 |
| Readability | 8 |
| Composition | 8 |
| Motion | 8 |
| Variety / retention | 9 |
| Sync | 8 |
| Rights | PASS |
| Overall | 8 |

**Open:** the encoder writes yuvj420p. The final gets an ffmpeg pass to yuv420p with bt709 tags.

## Final (30 Oct 2026): `out/editorbro_v2_reel_1080x1920_60fps.mp4`
**Format:** 1080x1920, 60 fps, H.264 yuv420p bt709, 54.912 s (3294 frames), 96.6 MB, AAC audio.

**Checks:**
- **reel_qa:** 7/7 PASS. -14.2 LUFS; 0 unplanned silences (the 4.1-4.36 s stop is planned); 0 flat frames.
- **look.py:** G0 PASS, G2 PASS, G3 PASS (final shot 2.91 s = 5 %). No frozen stretch; the longest static-ish run is 1.23 s (the laptops).
- **Cut sync:** 7/8 (88 %).
- **Strobe:** 3 one-frame spikes, at 21.92, 35.90 and 38.80 s. All three are inside source clips (the Maison Milan hit, the Flowsmith glow sweep, a demo on the phone wall).
- **Loudest quarter:** 4.25-4.50 s (the flip hit).

**v1** (`out/editorbro_v1_reel_1080x1920_60fps.mp4`) is kept. It failed G2 at 46.48 s: the docs page faded to black and then the cut dipped to black on top. **Fix:** the docs page slides out without fading, and the CTA cut is a radial flash.

**STT:**
- ElevenLabs Scribe matched every line of the dry voice word for word, after two wording fixes.
- The faster-whisper second opinion could not run: Windows Application Control blocks PyAV's DLL.

## Retro
1. **Build and lock the hook before anything else.** Every other scene was timed to it.
2. **Capture from a server with HMR and watching off.** A live-reload server reloaded the page mid-capture and corrupted the plate.
3. **Never stack a fade to black with a dip.** Check every chapter cut for more than 3 flat frames before the full render.
4. **Put a transient on every scene cut, not only on the words.** That took cut sync from 12 % to 88 %.
5. **STT every line before cutting picture to it.** It caught "shot"/"short" and "assistants"/"assistance".
