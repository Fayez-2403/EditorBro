"""The Hindi reel script (9:16). One entry per spoken line, in Devanagari; numbers and English
terms stay in Latin, as they are said in English.

SCRIPT is what appears on screen. SPOKEN says how a Latin token is pronounced (numbers and
acronyms spelled out in English); every key maps to the words the voice actually says.
PLATE_FIRST are the indices of the first line of each plate (a longer pause before them).
"""

SCRIPT = [
    # hook
    "ChatGPT लिखता है।",
    "लेकिन Jev सिर्फ़ decide करता है।",
    "TypeSafe AI का नया model।",
    "Messy text दो, typed answer लो।",
    # answers
    "सिर्फ़ तीन answers।",
    "Choice, options में से एक।",
    "Score, एक scale पर।",
    "Noul, हाँ या ना की probability।",
    # code
    "एक support ticket दिया।",
    "Stripe तीन दिन से fail हो रहा है।",
    "तीन सवाल, एक ही call।",
    "Team, technical, 0.85।",
    "Urgent, 1.0।",
    "सब typed, कोई parsing नहीं।",
    # policy
    "Jev सिर्फ़ judgment देता है।",
    "Threshold 0.90, तो ticket review में।",
    "0.80 करो, सीधा technical को route।",
    "Action आपका code लेता है।",
    # tradeoffs
    "Classify और route के लिए perfect।",
    "लेकिन maths, counting, या text लिखना?",
    "Jev नहीं।",
    "और zero schema error का मतलब सही answer नहीं।",
    # verdict
    "LLM लिखता है।",
    "Jev decide करता है।",
    "Code action लेता है।",
    "आप कहाँ use करोगे? Comment करो।",
]

# What is shown on screen (captions): the same lines in Roman Hinglish, one word per word of SCRIPT,
# so each caption word takes the timing of the word the voice says.
DISPLAY = [
    "ChatGPT likhta hai.",
    "Lekin Jev sirf decide karta hai.",
    "TypeSafe AI ka naya model.",
    "Messy text do, typed answer lo.",
    "Sirf teen answers.",
    "Choice, options mein se ek.",
    "Score, ek scale par.",
    "Noul, haan ya na ki probability.",
    "Ek support ticket diya.",
    "Stripe teen din se fail ho raha hai.",
    "Teen sawaal, ek hi call.",
    "Team, technical, 0.85.",
    "Urgent, 1.0.",
    "Sab typed, koi parsing nahi.",
    "Jev sirf judgment deta hai.",
    "Threshold 0.90, to ticket review mein.",
    "0.80 karo, seedha technical ko route.",
    "Action aapka code leta hai.",
    "Classify aur route ke liye perfect.",
    "Lekin maths, counting, ya text likhna?",
    "Jev nahi.",
    "Aur zero schema error ka matlab sahi answer nahi.",
    "LLM likhta hai.",
    "Jev decide karta hai.",
    "Code action leta hai.",
    "Aap kahan use karoge? Comment karo.",
]

PLATE_FIRST = {4, 8, 14, 18, 22}

SPOKEN = {
    "ChatGPT": "Chat G P T",
    "AI": "A I",
    "LLM": "L L M",
    "0.85": "zero point eight five",
    "1.0": "one point zero",
    "0.90": "zero point nine zero",
    "0.80": "zero point eight zero",
    "TypeSafe": "Type Safe",
}
