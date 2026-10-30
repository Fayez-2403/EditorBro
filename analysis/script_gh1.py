"""Techpe Trek "GitHub Trending" series, Part 1/3: creator tools (9:16, night-trek template, gh theme).
One line per shot: 0 hook, 1-3 the repos, 4 outro. Hinglish voice, English text on screen.

Source: a post listing 10 repos blowing up this month; every claim checked against each repo's GitHub description
and README on 2026-10-12, stars live from the GitHub API that day:
- debpalash/VoiceStudio (60K): "open-source, fully-local ElevenLabs alternative — voice cloning, voice design,
  video dubbing, dictation, transcription & audiobook creation in 646 languages".
- hugohe3/ppt-master (61K): "AI turns documents or topics into real, native PowerPoint decks — with native shapes,
  transitions and animations"; the post: "you pass it a PDF or a Word doc".
- cathrynlavery/diagram-design (52K): "44 diagram types" for Claude Code, Codex, Copilot, Cursor; README "Match your brand".

Voiced by ElevenLabs "Liam" (TX3LPaxmHKxFdv7VOQHJ, eleven_v3), natural speed, one take. Pronunciation rules: Hindi in
Devanagari, English words in English, numbers spelled out in English, names as spoken words, "Techpe" as "Tech-peh".
Words the timeline and sfx_mix.py look up: VoiceStudio (1), ppt-master (2), diagram-design (3).
"""

SCRIPT = [
    "[excited] GitHub पे ये repos इस महीने धमाल मचा रहे हैं, और बिल्कुल free हैं! Part one: creators के लिए तीन कमाल के tools।",
    "[excited] Number one: VoiceStudio. Voice cloning, video dubbing, transcription — 646 languages में, और सब कुछ आपके अपने computer पर। [confident] यानी ElevenLabs का free, local alternative।",
    "[interest] Number two: ppt-master. बस एक PDF या Word file दो, और ये बना देगा real, editable PowerPoint — native animations और transitions के साथ।",
    "[enthusiasm] Number three: diagram-design. Words में diagram माँगो, और ये आपकी branding में बना देता है — 44 types के diagrams, सीधे Claude Code या Cursor के अंदर।",
    "[excited] Save करो, share करो, और Part two के लिए Techpe Trek follow करो!",
]

PLATE_FIRST = set()
GAP = 0.3

SPOKEN = {
    "646": "six hundred forty six",
    "44": "forty four",
    "VoiceStudio": "Voice Studio",
    "ppt-master": "P P T master",
    "diagram-design": "diagram design",
    "PDF": "P D F",
    "ElevenLabs": "Eleven Labs",
    "Techpe": "Tech-peh",
}
