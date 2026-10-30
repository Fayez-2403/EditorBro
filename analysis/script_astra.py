"""ASTRA.EXE reel (projects/astra-exe, TechpeTrek brief "PROJECT ASTRA.EXE", 2026-10-23): the brief's voiceover, word for word.

SPOKEN is what the voice reads: Hindi in Devanagari, English words in English ("three D" for 3D). DISPLAY is the brief's Roman
Hinglish, word for word, for the captions and the SRT. Words are matched one to one by splitting on plain spaces; a spoken group
joined with no-break spaces (U+00A0) stands for one displayed word ("three D" = "3D").

Layout (analysis/astra_vo.py): one ElevenLabs take, cut by its own timestamps into groups. A group with an anchor time starts
its first word exactly there (the anchors are the story beats of the 65 s storyboard: a mode's name lands on that mode's
impact, "Gravity," on the gravity click); a group without one follows the previous group after the take's own pause, at most
NAT_MAX. Nothing is stretched. The picture (projects/astra-exe/web/src/reel) reads the final word times from vo.json.
"""

DURATION = 65.0
NAT_MAX = 0.32
NB = " "

# (chapter, [(anchor s or None, spoken, display), ...])
LINES = [
    ("hook", [
        (0.78, "अगर महाभारत के legendary weapons को physics engine मिल जाए…", "Agar Mahabharat ke legendary weapons ko PHYSICS ENGINE mil jaaye…"),
        (None, "तो क्या होगा?!", "toh kya hoga?!"),
    ]),
    ("bow", [
        (5.0, "मैंने एक celestial bow बनाया…", "Maine ek celestial bow banaya…"),
        (7.35, "जिसका string तुम खुद खींच सकते हो!", "jiska string tum khud kheench sakte ho!"),
    ]),
    ("shot", [
        (12.3, "Power बढ़ाओ,", "Power badhao,"),
        (None, "aim set करो…", "aim set karo…"),
        (15.15, "और देखो impact से पहाड़ कैसे टूट रहा है!", "aur dekho impact se pahaad kaise toot raha hai!"),
    ]),
    ("modes", [
        (21.09, "Lightning,", "Lightning,"),
        (23.0, "fire,", "fire,"),
        (24.8, "storm…", "storm…"),
        (26.41, "और एक cosmic arrow जो पूरी gravity ही बदल दे!", "aur ek cosmic arrow jo poori gravity hi badal de!"),
    ]),
    ("lab", [
        (31.25, "सबसे crazy part?", "Sabse crazy part?"),
        (33.1, "Gravity,", "Gravity,"),
        (None, "arrow power,", "arrow power,"),
        (None, "और target का material—", "aur target ka material—"),
        (37.5, "सब live change कर सकते हो!", "sab LIVE change kar sakte ho!"),
    ]),
    ("impossible", [
        (42.3, "और ये impossible challenge…", "Aur ye impossible challenge…"),
        (44.55, "एक arrow, तीन rings, और एक final target।", "ek arrow, teen rings, aur ek final target."),
        (47.3, "देखते हैं perfect shot लगता है या नहीं!", "Dekhte hain perfect shot lagta hai ya nahi!"),
    ]),
    ("code", [
        (53.15, "और ये कोई pre-rendered animation नहीं!", "Aur ye koi pre-rendered animation nahi!"),
        (55.55, f"मैंने Claude Code से एक actual interactive three{NB}D physics experience बनाया!", "Maine Claude Code se ek actual interactive 3D physics experience banaya!"),
    ]),
    ("cta", [
        (61.15, "अब बताओ…", "Ab batao…"),
        (None, "next कौनसा legendary object simulate करूँ?", "next kaunsa legendary object simulate karun?"),
    ]),
]

VOICE = {"model": "eleven_turbo_v2_5", "language": "hi", "stability": 0.4, "speed": 1.1}
# caption words in gold (key terms) and violet (the twist / the claim)
EMPH = {"Mahabharat", "legendary", "weapons", "PHYSICS", "ENGINE", "celestial", "bow", "string", "kheench", "Power", "aim", "impact", "pahaad",
        "Lightning,", "fire,", "storm…", "cosmic", "gravity", "Gravity,", "power,", "material…", "LIVE", "impossible", "teen", "rings,", "final",
        "target.", "perfect", "shot", "3D", "material—", "physics", "experience", "legendary", "object", "simulate"}
RISK = {"pre-rendered", "nahi!", "Claude", "Code", "actual", "interactive"}
