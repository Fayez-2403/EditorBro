"""Techpe Trek reel: five GitHub repos of ready-made AI agents and skills (9:16, "night trek" template).
One line per shot: line i plays over shot i (0 hook, 1-5 the repos, 6 outro). Hinglish voice, English text on screen.

Source: the X post by @undefinedKi (https://x.com/undefinedKi/status/2108952770237604160) and its poster
"400+ ready-made AI agents and skills" (Assets/HUSBRebWQAACn4j.jpg). Numbers checked against each repo's README and
the GitHub API on 2026-10-11: agency-agents "230+ Specialized Agents" (the post's ~170 / 200+ were older);
wshobson/agents 94 plugins, 202 agents, 184 skills, 105 commands; knowledge-work-plugins 11 plugins;
agent-skills 25 skills. Stars on screen are live counts from 2026-10-11.

Voiced by ElevenLabs "Liam" (TX3LPaxmHKxFdv7VOQHJ, eleven_v3): make_reel_vo.py --engine elevenlabs.
Pronunciation rules (SPOKEN only changes what the voice reads): Hindi in Devanagari, English words in English,
numbers spelled out in English, repo names as spoken words, "Techpe" as "Tech-peh" (Hindi "pe", not "pee").
[tags] are ElevenLabs v3 audio tags (delivery only, never words). Nothing of SCRIPT is shown on screen.
Words the timeline and sfx_mix.py look up: agency-agents (1), agents (2), knowledge-work (3), claude-quickstarts (4),
agent-skills (5).
"""

SCRIPT = [
    "[excited] ये 5 GitHub repos अभी save कर लो — 400 से ज़्यादा ready-made AI agents और skills, बिल्कुल free!",
    "[confident] Number one: agency-agents. 230 से ज़्यादा agents, बिल्कुल एक company की तरह — engineering, design, marketing, sales. [interest] और हर agent का अपना personality और process है।",
    "[excited] Number two: wshobson का agents. 94 plugins में 202 agents, 184 skills और 105 commands. [confident] Claude Code, Codex, Cursor — सब में चलता है, बस जो चाहिए वही install करो।",
    "[interest] Number three: Anthropic के अपने knowledge-work plugins — sales, legal, finance, data… हर job के लिए एक plugin. [thoughtful] हर plugin में skills, connectors और slash commands।",
    "[enthusiasm] Number four: claude-quickstarts. Anthropic के official projects — customer support agent, financial data analyst, computer use demo. [excited] चलाओ, खोलो, और सीखो!",
    "[bold] Number five: Addy Osmani का agent-skills. 25 production-grade skills — spec से plan, build, test और ship तक, पूरा dev cycle।",
    "[excited] शुरुआत करो claude-quickstarts से। Save करो, share करो, और Techpe Trek follow करो!",
]

PLATE_FIRST = set()
GAP = 0.3

SPOKEN = {
    "5": "five",
    "400": "four hundred",
    "230": "two hundred thirty",
    "202": "two hundred two",
    "184": "one hundred eighty four",
    "105": "one hundred five",
    "94": "ninety four",
    "25": "twenty five",
    "wshobson": "W S Hobson",
    "agency-agents": "agency agents",
    "knowledge-work": "knowledge work",
    "claude-quickstarts": "Claude quickstarts",
    "agent-skills": "agent skills",
    "Techpe": "Tech-peh",
}
