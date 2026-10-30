# Voiceover: {{TITLE}}

1. **The Hinglish-first VO.** src/config/voScript.json is the source: `cap` is the Roman caption, `tts` is Devanagari plus English words.
2. **The timecoded script,** filled from SCENE_TIMINGS.json after the take: shot | words | emotion | visual proof.
3. **TTS-clean text,** with no markup the voice would read out.
4. **An ElevenLabs v3 performance version** (optional, text only). The channel voice is Liam on eleven_turbo_v2_5, the user's pick.
5. **Subtitles** come from the REAL audio timings (scripts/export_kit.py -> post/captions.srt), never guessed.

**House voice:**
- an energetic Indian tech creator;
- short, purposeful sentences;
- technical names pronounced right;
- a mini-pause before the payoff number;
- a punchy final question.

"Tech पे Trek" must be spoken correctly. Check every take with STT.
