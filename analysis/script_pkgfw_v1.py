"""GitHub package firewall reel (38.361 s, 9:16, 60 fps, 122 BPM), Hinglish-lite narration (user, 2026-10-21).

The grid: 122 BPM, a 2-beat pickup, so the first downbeat (the hook's slam) is at 0.984 s and every chapter cut sits on a
bar line: 2.951, 8.852, 16.721, 26.557, 32.459; the reel ends on bar 19 (38.361 s).
Each line has a placement window (start, latest end); the voice starts at the window's start. SPOKEN is what the voice
reads (Hindi in Devanagari so it is said natively, English words in English, acronyms spelled N.P.M. / C.I.); DISPLAY is the
same words in Roman Hinglish for the captions and the SRT, word for word. Voice: ElevenLabs "Liam". The three hook lines
are one eleven_turbo_v2_5 take at speed 1.2 (no [tags]: Turbo reads them aloud); the body is one eleven_turbo_v2_5 take with language_code hi (the
Indian-accent setting the user chose for the GitHub series). Claims: projects/github-package-firewall/FACTS.md.
"""

BPM = 122.0
BEAT = 60 / BPM                       # 0.4918 s
BAR = 4 * BEAT                        # 1.9672 s
PICKUP = 2 * BEAT                     # the first downbeat: 0.9836 s
bar = lambda n: PICKUP + n * BAR      # the time of bar n's downbeat
DURATION = bar(19)                    # 38.361 s

# (name, start, end): every cut on a bar line
CHAPTERS = [("hook", 0.0, bar(1)), ("terminal", bar(1), bar(4)), ("firewall", bar(4), bar(8)),
            ("policy", bar(8), bar(13)), ("limits", bar(13), bar(16)), ("cta", bar(16), bar(19))]

# (group, window start, window end, spoken, display)
LINES = [
    ("hook", 0.0, 1.12, "बस एक N.P.M. install,",   # (no "…" in the voice: v3 stretches it to ~1 s)
                         "Bas ek npm install…"),
    ("hook", 1.14, bar(0) + 3 * BEAT, "पूरा build ख़तरे में!",
                                        "Poora build khatre mein!"),
    ("hook", bar(0) + 3 * BEAT, bar(1) + 0.30, "रुको, rewind!",
                                                 "Ruko… rewind!"),
    ("body", bar(1) + 0.35, bar(4) - 0.15, "एक risky dependency, तुम्हारा app चलने से पहले ही, build तक पहुँच सकती है।",
                                           "Ek risky dependency, tumhara app chalne se pehle hi, build tak pahunch sakti hai."),
    ("body", bar(4) + 0.30, bar(8) - 0.40, "इसीलिए GitHub ने अभी enterprise workflows के लिए package firewall launch किया है।",
                                           "Isiliye GitHub ne abhi enterprise workflows ke liye package firewall launch kiya hai."),
    ("body", bar(8) + 0.25, bar(13) - 0.30, "Admins rules set करते हैं: cooldown period, advisory checks, और supply-chain checks. Policy fail? Package वहीं रुक जाता है।",
                                            "Admins rules set karte hain: cooldown period, advisory checks, aur supply-chain checks. Policy fail? Package wahin ruk jaata hai."),
    ("body", bar(13) + 0.30, bar(16) - 0.15, "पर ये automatic नहीं है, और अभी preview सिर्फ़ N.P.M. support करता है।",
                                             "Par ye automatic nahi hai, aur abhi preview sirf npm support karta hai."),
    ("body", bar(16) + 0.25, bar(19) - 0.6, "तुम इसे अपने C.I. में enable करोगे? Comment करो Firewall!",
                                            "Tum ise apne CI mein enable karoge? Comment karo FIREWALL!"),
]

# how each group is voiced
VOICE_GROUPS = {
    # (v3 read the hook ~40% too slow for the 2-beat pickup, even at x1.15: Turbo at its top speed, same voice as the body)
    "hook": {"model": "eleven_turbo_v2_5", "language": "hi", "stability": 0.3, "speed": 1.2},
    "body": {"model": "eleven_turbo_v2_5", "language": "hi", "stability": 0.5, "speed": 1.1},
}
# the hook's rewind starts on beat 4 of the first bar (2.459 s); the slam is the first downbeat (0.984 s)
SLAM, REWIND = bar(0), bar(0) + 3 * BEAT
MAX_TEMPO = {"hook": 1.15, "body": 1.12}
# caption words shown in the accent colour
EMPH = {"npm", "install…", "Poora", "khatre", "rewind!", "risky", "dependency,", "build", "GitHub", "package", "firewall", "cooldown", "period,",
        "advisory", "checks,", "supply-chain", "checks.", "fail?", "ruk", "automatic", "sirf", "CI", "FIREWALL!"}
