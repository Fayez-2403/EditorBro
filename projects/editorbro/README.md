# EditorBro: Welcome to the Studio

A Tech पे Trek reel, made from the motion-studio reel template on 2026-10-30. The rules come from
`docs/TECHPETREK_MASTER_REEL_STUDIO.md` (repo root) and the `reel-pipeline`, `motion-studio` and `motionmaxxing` skills.

## Folder (master studio §15)
| Path | What |
|---|---|
| `assets/inbox, originals, licensed, generated, screenshots` | source media (git-ignored; tracked in docs/asset_manifest.csv) |
| `docs/` | brief, factcheck, asset manifest, style guide, character bible, shot list, animation guide, review log, voiceover, edit decisions, credits |
| `src/` | Remotion: compositions (Reel, Cover), scenes, components (Captions, Transition), animation, ui, audio (cues, word cues), themes, config (voScript, version, audioManifest, scene_labels) |
| `audio/` | beats.json (scripts/analyze_audio.py), takes/ (cached ElevenLabs takes), out/ (lines), clips/, sfx/ |
| `scripts/` | audio/ (vo, timing, score, align), analyze_audio, verify_assets, generate_contact_sheet.sh, render.sh, render.mjs, stills.mjs, export_kit |
| `public/` | fonts, brand logo, audio/ (vo + mix), clips/ (re-encoded -g 24 -bf 0) |
| `out/` | previews, final, cover, QA sheets (git-ignored) |
| `post/` | caption, pinned comment, srt, scene map (scripts/export_kit.py) |

## Commands
```sh
npm run studio                      # preview (Remotion Studio)
python scripts/audio/vo.py reel --stt && python scripts/audio/timing.py     # voice -> SCENE_TIMINGS.json
python scripts/audio/score.py       # score + SFX + -14 LUFS mix
python scripts/analyze_audio.py audio/music.wav --click    # a song: measured beat grid -> audio/beats.json
python scripts/verify_assets.py     # rights + files
node scripts/render.mjs --scale 0.5 # 540x960 motion check  (bash scripts/render.sh --preview runs it + all QA)
node scripts/render.mjs             # 1080x1920 final: ASK FIRST
```
