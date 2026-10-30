"""GitHub package firewall reel, v2 (user, 2026-10-21): conversational and explanatory Hinglish, a light Fluent 2 / GitHub
look with real screenshots and logos, quiet music. v1 (the 38 s dark neon cut) is script_pkgfw_v1.py.

The chapters are laid out from the voice itself (analysis/pkgfw_vo.py writes data/pkgfw/layout.json): each chapter starts
on the beat after the previous line ends (122 BPM grid), its line enters LEAD seconds later, and the reel ends on the bar
line after the CTA's hold. SPOKEN is what the voice reads (Hindi in Devanagari, English words in English, acronyms
spelled N.P.M. / C.I.); DISPLAY is the same words in Roman Hinglish for the captions and the SRT, word for word.
One ElevenLabs "Liam" take (eleven_turbo_v2_5, language hi: the Indian-accent setting the user chose; Turbo has no [tags]).
Claims: projects/github-package-firewall/FACTS.md (line -> fact table).
"""

BPM = 122.0
BEAT = 60 / BPM                       # 0.4918 s
BAR = 4 * BEAT                        # 1.9672 s
PICKUP = 0.0
bar = lambda n: PICKUP + n * BAR

LEAD = 0.18        # a line enters this long after its chapter's cut (the cut is on the beat)
GAP = 0.32         # at least this much air after a line before the next chapter's cut
CTA_HOLD = 1.6     # the CTA holds this long after its line before the reel ends (on a bar line)

# (chapter, spoken, display)
LINES = [
    ("hook", "एक N.P.M. install, और साथ में आ जाते हैं ढेर सारे packages. एक भी ख़राब निकला, तो?",
             "Ek npm install, aur saath mein aa jaate hain dher saare packages. Ek bhi kharab nikla, toh?"),
    ("problem", "GitHub के मुताबिक़, ऐसे attacks install के वक़्त ही, C.I. या laptop से credentials चुरा लेते हैं, code चलाए बिना ही।",
                "GitHub ke mutabik, aise attacks install ke waqt hi, CI ya laptop se credentials chura lete hain, code chalaaye bina hi."),
    ("news", "इसीलिए GitHub लाया है package firewall, अभी public preview में।",
             "Isiliye GitHub laaya hai package firewall, abhi public preview mein."),
    ("how", "ये runners और coding agents, और N.P.M. registry के बीच, हर request और download check करता है।",
            "Ye runners aur coding agents, aur npm registry ke beech, har request aur download check karta hai."),
    ("policy", "Rules admins set करते हैं: नया version, by default एक दिन रुकता है; Advisory Database में malware हो, तो block; और attestation ग़ायब हो, तो भी block।",
               "Rules admins set karte hain: naya version, by default ek din rukta hai; Advisory Database mein malware ho, toh block; aur attestation gayab ho, toh bhi block."),
    ("blocked", "ग़लती से block हुआ? N.P.M. के output में ही, override का link मिल जाता है।",
                "Galti se block hua? npm ke output mein hi, override ka link mil jaata hai."),
    ("limits", "पर ये अपने आप on नहीं होता, setup करना पड़ता है; और अभी सिर्फ़ N.P.M., सिर्फ़ Enterprise Cloud।",
               "Par ye apne aap on nahi hota, setup karna padta hai; aur abhi sirf npm, sirf Enterprise Cloud."),
    ("cta", "आप इसे अपने C.I. में on करोगे? Comment करो Firewall!",
            "Aap ise apne CI mein on karoge? Comment karo FIREWALL!"),
]

VOICE = {"model": "eleven_turbo_v2_5", "language": "hi", "stability": 0.45, "speed": 1.12}
MAX_LEN = 60.0     # the user's cap for reels
# caption words shown in the accent colour
EMPH = {"npm", "install,", "packages.", "kharab", "attacks", "install", "credentials", "GitHub", "package", "firewall,", "preview",
        "runners", "agents,", "registry", "request", "download", "ek", "din", "malware", "block;", "attestation", "block.", "override",
        "link", "on", "setup", "sirf", "Cloud.", "CI", "FIREWALL!"}
