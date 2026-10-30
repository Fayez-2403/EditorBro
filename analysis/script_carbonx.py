"""Carbon-X reel (projects/carbon-x, TechpeTrek brief "CARBON-X", 2026-10-23): the user's voiceover, word for word.

SPOKEN is what the voice reads: Hindi in Devanagari, English words in English, numbers as they are said ("fourteen point
eight", "sixty six point seven"), acronyms spelled (A.I., D.N.A.), the four bases as letter names (ए, सी, जी, टी). DISPLAY is
the user's Roman Hinglish, word for word, for the captions and the SRT. Words are matched one to one by splitting on plain
spaces only, so a spoken group joined with no-break spaces (U+00A0) stands for one displayed word ("Carbon X" = "Carbon-X").

Layout (analysis/carbonx_vo.py, the duet_vo.py pattern): exactly 50 s (3000 frames at 60 fps). A line on a 'beat' join opens
a chapter LEAD after a cut on the 112 BPM grid, at least GAP after the previous line; a 'natural' join keeps the take's own
pause. GAP is solved so the CTA ends END_HOLD before 50 s. Nothing is stretched. Claims: projects/carbon-x/FACTS.md.
"""

BPM = 112.0
BEAT = 60 / BPM                       # 0.535714 s
BAR = 4 * BEAT                        # 2.142857 s
E8 = BEAT / 2
DURATION = 50.0

FIRST_LINE = 0.22  # the voice starts right after the frame-0 impact
LEAD = 0.10
GAP_RANGE = (0.10, 0.90)
GAP_FLOOR = 0.14   # a beat cut gets at least this pause before it (else the take is sped up first)
NAT_MAX = 0.18     # a follow-on line's pause: the take's own, at most this
MAX_TEMPO = 1.03   # the most the take is sped up after the fact (pitch-preserving): x1.09 smeared "का" (STT, 2026-10-23), so ElevenLabs' own speed does the work
END_HOLD = 2.1     # after "comment DNA!": the stinger, then the TECHPE TREK end card, to 50.0 s
NB = " "

# (chapter, join, spoken, display)
LINES = [
    ("hook", "start", "A.I. अब D.N.A. से बात करेगा?!",
                      "AI ab DNA se baat karega?!"),
    ("twist", "natural", "हाँ, लेकिन एक important twist है।",
                      "Haan, lekin ek important twist hai."),
    ("model", "beat", f"Hugging Face ने Carbon{NB}X release किया है, fourteen{NB}point{NB}eight billion parameter का open A.I. model,",
                      "Hugging Face ne Carbon-X release kiya hai, 14.8 billion parameter ka open AI model,"),
    ("both", "natural", "जो D.N.A. के ए, सी, जी, टी letters और normal English questions को साथ process करता है।",
                        "jo DNA ke A, C, G, T letters aur normal English questions ko saath process karta hai."),
    ("mutation", "beat", "सोचो researcher sequence paste करके पूछे: इस mutation का possible effect क्या हो सकता है?",
                         "Socho researcher sequence paste karke pooche: is mutation ka possible effect kya ho sakta hai?"),
    ("answer", "natural", "Model research prediction और explanation दे सकता है।",
                       "Model research prediction aur explanation de sakta hai."),
    ("bench", "beat", f"Team के अपने five{NB}benchmark tests में average sixty{NB}six{NB}point{NB}seven percent score report हुआ।",
                      "Team ke apne five-benchmark tests mein average 66.7 percent score report hua."),
    ("warn", "beat", "लेकिन ये clinical proof या medical diagnosis नहीं है।",
                     "Lekin ye clinical proof ya medical diagnosis nahi hai."),
    ("open", "beat", "Open weights का फ़ायदा? Researchers अपने infrastructure पर sensitive data analyze कर सकते हैं, hardware permitting।",
                     "Open weights ka fayda? Researchers apne infrastructure par sensitive data analyze kar sakte hain, hardware permitting."),
    ("hw", "beat", "और एक detail: normal laptop पर smoothly चलेगा, ऐसा guarantee नहीं।",
                   "Aur ek detail: normal laptop par smoothly chalega, aisa guarantee nahi."),
    ("payoff", "beat", "Science और A.I. का ये crossover crazy है।",
                       "Science aur AI ka ye crossover crazy hai."),
    ("cta", "natural", "Model card save करो और comment D.N.A.!",
                       "Model card save karo aur comment DNA!"),
]

VOICE = {"model": "eleven_turbo_v2_5", "language": "hi", "stability": 0.42, "speed": 1.2}
# caption words in teal (key terms) and amber (caveats)
EMPH = {"AI", "DNA", "Carbon-X", "14.8", "billion", "open", "A,", "C,", "G,", "T", "English", "saath", "mutation", "possible", "effect",
        "research", "prediction", "explanation", "five-benchmark", "66.7", "percent", "Open", "weights", "infrastructure", "sensitive",
        "Science", "crossover", "crazy", "Model", "card", "save", "DNA!", "Hugging", "Face"}
RISK = {"twist", "clinical", "proof", "medical", "diagnosis", "nahi", "nahi.", "permitting.", "laptop", "guarantee", "hardware", "report"}
