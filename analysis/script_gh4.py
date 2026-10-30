"""Techpe Trek "GitHub Trending" series, Part 4/4: Claude Code rules + memory (9:16, night-trek template, gh theme).
One line per shot: 0 hook, 1-2 the repos, 3 outro. Hinglish voice, English text on screen.

Claims checked against each repo's GitHub description and README on 2026-10-12; stars live that day:
- multica-ai/andrej-karpathy-skills (219K): "A single CLAUDE.md file to improve Claude Code behavior, derived from
  Andrej Karpathy's observations on LLM coding pitfalls"; four principles: Think Before Coding, Simplicity First,
  Surgical Changes, Goal-Driven Execution. README "The Problems", from Andrej's post: "The models make wrong assumptions on
  your behalf and just run along with them without checking", "implement a bloated construction over 1000 lines when 100
  would do", "change/remove comments and code they don't sufficiently understand"; "Four principles in one file":
  Think Before Coding "If uncertain, ask rather than guess"; Simplicity First "Minimum code that solves the problem";
  Surgical Changes "Touch only what you must"; Goal-Driven Execution "tests-first, verifiable success criteria".
- thedotmack/claude-mem (100K): "Captures everything your agent does during sessions, compresses it with AI, and
  injects relevant context back into future sessions".

Voiced by ElevenLabs "Liam" (TX3LPaxmHKxFdv7VOQHJ) with eleven_turbo_v2_5 locked to Hindi (--model eleven_turbo_v2_5
--language hi), which keeps the Indian accent after English words (eleven_v3 drifted into an American accent). Three pieces,
spliced at pauses: lines 0-1 (opening + the Karpathy explanation) seed 12 and line 3 (outro) seed 5, both stability 0.3,
speed 1.0, recorded with the neighbouring lines as context; line 2 from the --seed 5 --speed 1.1 take. A full make_reel_vo.py
run gives a different take. Earlier versions: out/backup_gh3_gh4_voice_v2/ (v3), out/backup_gh4_opening_v1/,
out/backup_gh4_hindi_start_v1/ .. _v3/.
Words the timeline and sfx_mix.py look up: Karpathy (1), claude-mem (2).
"""

SCRIPT = [
    "[excited] आपका AI agent गलतियाँ करता है, और अगले session में सब भूल जाता है? [excited] ये दो repos दोनों fix कर देंगी — एक rules, एक memory! [excited] Save कर लो — चलो देखते हैं!",
    "[interest] Number one: Karpathy skills. Andrej Karpathy ने बताया था कि AI models बिना पूछे assume कर लेते हैं, सौ lines की जगह हज़ार lines लिख देते हैं, और बिना समझे code बदल देते हैं। इसका हल — एक CLAUDE.md file, चार नियम: code से पहले सोचो, शक हो तो पूछो; उतना ही code जितना ज़रूरी है; सिर्फ़ वही बदलो जो ज़रूरी है; और पहले success तय करो, जिसे tests से verify किया जा सके।",
    "[enthusiasm] Number two: claude-mem, यानी Claude memory। आपका agent जो भी करता है, ये उसे याद रखता है, summarize करता है, और अगले session में वापस दे देता है।",
    "[excited] चारों parts save करो, share करो, और Techpe Trek को follow करो!",
]

PLATE_FIRST = set()
GAP = 0.3

# Lines 0-1: a few everyday English words go to the voice in Devanagari for an Indian pronunciation. Names (Claude Code,
# Karpathy skills, Andrej Karpathy, CLAUDE.md) and the other English words stay in English ("जेम्स" was heard as "James").
INDIAN = {"Part": "पार्ट", "four": "फ़ोर", "code": "कोड", "rules": "रूल्स", "memory": "मेमोरी", "Number": "नंबर", "one": "वन",
          "file": "फ़ाइल"}

SPOKEN = {
    "VS": "V S",
    **INDIAN,
    "CLAUDE.md": "Claude dot M D",
    "claude-mem": "Claude Mem",   # two words (the hyphen was read as "dash"/"dot"); with "यानी Claude memory" after it, heard as "Claude Mem"
    "Techpe": "Tech पे",   # "Tech" and "Trek" in English, "पे" in Hindi; said before "को follow करो" (at the end of the line Turbo paused 0.8 s inside it)
}
