"""Claude Duet reel (projects/claude-duet, brief TPT-20261022-0900-R01): the user's voiceover, word for word.

SPOKEN is what the voice reads: Hindi in Devanagari, English words in English, numbers as they are said ("Opus five point
five", "इक्कीस October"), acronyms spelled (A.I., U.S.). DISPLAY is the user's Roman Hinglish, word for word, for the
captions and the SRT. Words are matched one to one by splitting on plain spaces only, so a spoken group joined with
no-break spaces (U+00A0) stands for one displayed word ("five point five powered" = "5.5-powered").

Layout (analysis/duet_vo.py): the reel is exactly 50 s (3000 frames at 60 fps). The first line starts at FIRST_LINE (after the
ping on frame 0). A line that opens a new chapter on a 'beat' join starts LEAD after a chapter cut placed on the 124 BPM
grid, at least GAP after the previous line; a 'natural' join keeps the take's own pause (mid-sentence or inside a chapter).
GAP is solved so the CTA ends END_HOLD before 50 s (the end card holds after the payoff). Nothing is stretched.
One ElevenLabs "Liam" take (eleven_turbo_v2_5, language hi: the Indian-accent setting the user chose). Claims: FACTS.md.
"""

BPM = 124.0
BEAT = 60 / BPM                       # 0.48387 s
BAR = 4 * BEAT                        # 1.93548 s
E8 = BEAT / 2
DURATION = 50.0                       # the brief: 3000 frames at 60 fps

FIRST_LINE = 0.25  # the voice starts right after the ping on frame 0 (the brief: spoken line within 0-0.8 s)
LEAD = 0.14        # a chapter's line enters this long after its cut (the cut is on the beat)
GAP_RANGE = (0.22, 0.95)   # the pause solved per reel so the end card gets END_HOLD
END_HOLD = 3.4     # after the CTA's last word: the payoff, then the TECHPE TREK end card, to 50.0 s
NB = " "

# (chapter, join, spoken, display)
LINES = [
    ("hook", "start", "कल तक तुम A.I. को message करते थे।",
                      "Kal tak tum AI ko message karte the."),
    ("hook", "natural", "अब A.I. ख़ुद बोलेगा: भाई, ये urgent है!",
                        "Ab AI khud bolega: bhai, ye urgent hai!"),
    ("duet", "beat", "Anthropic ने इक्कीस October को Claude Duet announce किया।",
                     "Anthropic ne 21 October ko Claude Duet announce kiya."),
    ("brief", "beat", f"ये Opus five{NB}point{NB}five{NB}powered proactive agent, connected apps से morning brief बना सकता है,",
                      "Ye Opus 5.5-powered proactive agent connected apps se morning brief bana sakta hai,"),
    ("tasks", "natural", "tasks पर काम कर सकता है, और ज़रूरी updates दे सकता है।",
                         "tasks par kaam kar sakta hai aur zaroori updates de sakta hai."),
    ("twist", "beat", "लेकिन important twist: email भेजना, payment करना, या कुछ delete करना हो, तो पहले तुम्हारी approval माँगता है।",
                      "Lekin important twist: email bhejna, payment karna ya kuch delete karna ho, toh pehle tumhari approval maangta hai."),
    ("hours", "beat", "और हाँ, ये continuously नहीं, कुछ घंटों के interval पर check करता है।",
                      "Aur haan, ye continuously nahi, kuch ghanton ke interval par check karta hai."),
    ("avail", "beat", "अभी research preview, U.S. के Pro और Max users के लिए waitlist पर है।",
                      "Abhi research preview US ke Pro aur Max users ke liye waitlist par hai."),
    ("india", "beat", "India में general launch announce नहीं हुआ।",
                      "India mein general launch announce nahi hua."),
    ("cta", "beat", "तुम्हारे लिए useful, या बस एक और A.I. notification? Comment Duet, और save कर लो!",
                    "Tumhare liye useful ya bas ek aur AI notification? Comment DUET, aur save kar lo!"),
]

VOICE = {"model": "eleven_turbo_v2_5", "language": "hi", "stability": 0.42, "speed": 1.08}
# caption words shown in the accent colour (teal); risk words in amber
EMPH = {"AI", "khud", "urgent", "Claude", "Duet", "21", "October", "Opus", "5.5-powered", "proactive", "agent", "morning", "brief",
        "tasks", "updates", "approval", "continuously", "ghanton", "interval", "research", "preview", "US", "Pro", "Max", "waitlist",
        "India", "useful", "notification?", "DUET,", "save"}
RISK = {"twist:", "email", "payment", "delete", "nahi,", "nahi"}
