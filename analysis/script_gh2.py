"""Techpe Trek "GitHub Trending" series, Part 2/3: wild AI apps (9:16, night-trek template, gh theme).
One line per shot: 0 hook, 1-3 the repos, 4 outro. Hinglish voice, English text on screen.

Claims checked against each repo's GitHub description and README on 2026-10-12; stars live that day:
- bilawalsidhu/gods-eye-view (53K): "A spy satellite simulator in your browser, except the data is real ... on a
  photorealistic 3D globe"; README: "Live aircraft, ships, satellites", "Reached #1 on GitHub Trending",
  "Start without API keys".
- morluto/rea (137K; the post said 65K): "Reverse engineer anything with agents, from app behavior down to native
  binaries"; README: "One MCP for reverse engineering", "See a feature you like. Understand how it works".
- paperclipai/paperclip (101K): "The open-source app everyone uses to manage agents at work"; README: "the app people
  use to manage AI agents for work".

Voiced by ElevenLabs "Liam" (TX3LPaxmHKxFdv7VOQHJ, eleven_v3), natural speed, one take.
Words the timeline and sfx_mix.py look up: gods-eye-view (1), REA (2), paperclip (3).
"""

SCRIPT = [
    "[excited] Part two आ गया — और ये वाले repos सच में wild हैं! तीन AI apps जो आपका दिमाग हिला देंगे।",
    "[curiosity] Number one: gods-eye-view. Browser में spy satellite simulator — 3D globe पर live planes, ships और satellites, [excited] और सारा data बिल्कुल real है!",
    "[interest] Number two: REA. किसी app का कोई feature पसंद आया? [confident] REA आपके AI agent से उसे reverse engineer करवाता है — app behavior से लेकर binary level तक।",
    "[enthusiasm] Number three: paperclip. अपने AI agents को एक team की तरह manage करो — एक open-source app में, जैसे वो आपका अपना staff हों।",
    "[excited] Save करो, share करो, और Part three के लिए Techpe Trek follow करो!",
]

PLATE_FIRST = set()
GAP = 0.3

SPOKEN = {
    "gods-eye-view": "God's eye view",
    "REA": "R E A",
    "3D": "three D",
    "Techpe": "Tech-peh",
}
