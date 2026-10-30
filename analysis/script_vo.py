"""The voiceover script. One entry per spoken line; plates find their cues by these words.

SCRIPT is what appears on screen. SPOKEN says how a token is pronounced, for the aligner
(and the scratch voice): numbers and acronyms. Edit both when you change the voiceover.
"""

SCRIPT = [
    # hook
    "ChatGPT likhta hai.",
    "Lekin Jev sirf decide karta hai.",
    "TypeSafe AI ka naya model.",
    "Messy text do, typed answer lo.",
    # answers
    "Sirf teen answers.",
    "Choice, options mein se ek.",
    "Score, ek scale pe.",
    "Noul, haan ya na ki probability.",
    # code
    "Ek support ticket diya.",
    "Stripe teen din se fail ho raha hai.",
    "Teen sawaal, ek hi call.",
    "Team, technical, 0.85.",
    "Urgent, 1.0.",
    "Sab typed, koi parsing nahi.",
    # policy
    "Jev sirf judgment deta hai.",
    "Threshold 0.90, to ticket review mein.",
    "0.80 karo, seedha technical ko route.",
    "Action aapka code leta hai.",
    # tradeoffs
    "Classify aur route ke liye perfect.",
    "Lekin maths, counting, ya text likhna?",
    "Jev nahi.",
    "Aur zero schema error ka matlab sahi answer nahi.",
    # verdict
    "LLM likhta hai.",
    "Jev decide karta hai.",
    "Code action leta hai.",
    "Aap kahan use karoge? Comment karo.",
]

SPOKEN = {
    "ChatGPT": "chat g p t",
    "AI": "a i",
    "LLM": "l l m",
    "0.85": "zero point eight five",
    "1.0": "one point zero",
    "0.90": "zero point nine zero",
    "0.80": "zero point eight zero",
    "TypeSafe": "type safe",
}
