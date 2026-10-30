"""Techpe Trek "GitHub Trending" series, Part 3/4: Claude Code skill packs (9:16, night-trek template, gh theme).
One line per shot: 0 hook, 1-2 the repos, 3 outro. Hinglish voice, English text on screen.

Claims checked against each repo's GitHub description and README on 2026-10-12; stars live that day:
- mattpocock/skills (287K): "Skills for Real Engineers. Straight from my .agents directory"; README: "My agent skills
  that I use every day to do real engineering - not vibe coding", "small, easy to adapt, and composable".
- affaan-m/ECC (278K): "Skills, instincts, memory, security, and research-first development for Claude Code, Codex,
  Opencode, Cursor and beyond".

Voiced by ElevenLabs "Liam" (TX3LPaxmHKxFdv7VOQHJ) with eleven_turbo_v2_5 locked to Hindi, which keeps the Indian accent after
English words (eleven_v3 drifted into an American accent): --model eleven_turbo_v2_5 --language hi --seed 12, one take.
The v3 take (seed 67) is in out/backup_gh3_gh4_voice_v2/.
The outro (line 3, brand said "Tech पे Trek" before "को follow करो") was re-recorded on its own (stability 0.3,
speed 0.95, line 2 as context) and spliced in — seed 21 since 2026-10-18 (seed 9 smeared its last word, backup in
out/backup_gh3_outro_v2/); the earlier outro is in out/backup_gh3_brand_v1/.
Words the timeline and sfx_mix.py look up: Pocock (1), ECC (2).
"""

SCRIPT = [
    "[excited] रुको, scroll मत करो! [excited] ये दो repos आपके Claude Code को सीधा god level बना देंगी! [enthusiastic] Real engineers वाले skills, सीधे आपके agent में। [excited] Save कर लो — चलो देखते हैं!",
    "[confident] Number one: Matt Pocock के skills. वो skills जो वो रोज़ real engineering में use करते हैं — छोटे, आसान, और adapt करने में simple।",
    "[excited] Number two: ECC. Skills, memory और security का पूरा pack — Claude Code, Codex और Cursor, सब के लिए।",
    "[excited] Save करो, share करो, और Part four के लिए Techpe Trek को follow करो!",
]

PLATE_FIRST = set()
GAP = 0.3

SPOKEN = {
    "VS": "V S",
    "ECC": "E C C",
    "Techpe": "Tech पे",   # "Tech" and "Trek" in English, "पे" in Hindi; said before "को follow करो" (at the end of the line Turbo paused 0.8 s inside it)
}
