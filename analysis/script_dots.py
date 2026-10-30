"""DOTS: The Great To-Do List Heist (96.000 s, 9:16, 60 fps, 120 BPM = 48 bars), all in Hinglish (user, 2026-10-19).

Each line: (start s, window end s, speaker, spoken, display). SPOKEN is what the voice reads (Hindi in Devanagari so it is
pronounced natively, English words in English); DISPLAY is the same words in Roman Hinglish for captions and speech
bubbles (no Hindi script on screen), word for word. [tags] steer eleven_v3's delivery and are never spoken or shown.
The narrator (N) is Liam; the five mascots are the faces of ONE dot's skills, each with its own voice. Claims:
projects/dots-heist/FACTS.md.
"""

# speaker -> (ElevenLabs premade voice id, name, pitch shift in semitones for the cartoon register)
# The narrator is on eleven_turbo_v2_5 + hi (the user's pick for an Indian accent, 2026-10-16; it ignores [tags], so they
# are stripped for it); the mascots are on eleven_v3, which follows the [tags].
NARRATOR_MODEL, NARRATOR_SPEED = "eleven_turbo_v2_5", 1.1
VOICES = {
    "N": ("TX3LPaxmHKxFdv7VOQHJ", "Liam", 0),       # narrator: young, excited, charismatic
    "H": ("TX3LPaxmHKxFdv7VOQHJ", "Liam (hook)", 0),  # the cold-open hook, recorded as its own take (same voice + model as N)
    "P": ("EXAVITQu4vr4xnSDxMaL", "Sarah", 2),      # PINK, headphones: energetic, dramatic (Jessica misread Hindi)
    "B": ("IKne3meq5aSn9XLyUdCD", "Charlie", 3),    # BLUE cloud, beret: curious, mischievous
    "Y": ("onwK4e9ZLuTAKqWW03F9", "Daniel", 1),     # YELLOW triangle, glasses + bow tie: deadpan intellectual
    "G": ("FGY2WhTYpPnrIDTdsKH5", "Laura", 3),      # GREEN frog: wide-eyed explorer
    "U": ("cjVigY5qzO86Huf0OWal", "Eric", 0),       # PURPLE heart, sunglasses: cool, confident
}

LINES = [
    # 1 MONSTER AWAKENS (0-10)
    # cold open (user, 2026-10-20: a stronger hook): the heist crew in a spotlight, then the target
    (0.0, 3.65, "H", "[excited] Bro... आज रात एक heist होने वाला है। और target? आपकी to-do list!",
                     "Bro... aaj raat ek heist hone wala hai. Aur target? Aapki to-do list!"),
    (3.75, 8.5, "N", "[dramatic] सौ emails, सात meetings, और एक deadline... जो कल थी!",
                     "Sau emails, saat meetings, aur ek deadline... jo kal thi!"),
    (8.5, 10.0, "P", "[screaming dramatically] बचाओ!", "Bachao!"),
    # 2 MEET THE LEGENDS (10-20)
    (10.0, 13.0, "N", "[excited] लेकिन रुको! Entry होती है... Dots की!",
                       "Lekin ruko! Entry hoti hai... Dots ki!"),
    (13.0, 15.25, "N", "पाँच चेहरे, पर Dot एक ही!", "Paanch chehre, par Dot ek hi!"),
    (15.25, 16.25, "P", "[shouting excitedly] Content!", "Content!"),
    (16.25, 17.25, "B", "[mischievous] Research!", "Research!"),
    (17.25, 18.0, "Y", "[deadpan] Code.", "Code."),
    (18.0, 19.25, "G", "[amazed] Explore!", "Explore!"),
    (19.25, 20.25, "U", "[cool] Apps!", "Apps!"),
    # 3 SECRET WORKSHOP (20-30)
    (20.25, 25.0, "N", "[conspiratorial] ये है secret workshop — OpenAI का always-on agent, अपने cloud computer पर।",
                      "Ye hai secret workshop — OpenAI ka always-on agent, apne cloud computer par."),
    (25.0, 28.25, "N", "अपना browser, अपनी screen, काम non-stop!", "Apna browser, apni screen, kaam non-stop!"),
    (28.0, 30.0, "B", "[whispering] Shhh... plan ready है!", "Shhh... plan ready hai!"),
    # 4 BUG HUNT (30-40)
    (30.0, 33.0, "N", "[playful] पहला mission: bug hunt!", "Pehla mission: bug hunt!"),
    (33.0, 34.5, "Y", "[deadpan] Bug मिल गया।", "Bug mil gaya."),
    (34.5, 35.75, "B", "[panicked] आआह! भागो!", "Aaah! Bhaago!"),
    (35.75, 39.75, "N", "Bugs पकड़े, fix ready — बस आपका review बाकी।",
                        "Bugs pakde, fix ready — bas aapka review baaki."),
    # 5 CONTENT CREATOR MELTDOWN (40-50)
    (40.0, 43.5, "N", "[dramatic] उधर creator का meltdown! Post कल है, idea zero!",
                       "Udhar creator ka meltdown! Post kal hai, idea zero!"),
    (43.5, 45.5, "P", "[excited] Tension मत लो, draft ready!", "Tension mat lo, draft ready!"),
    (45.5, 49.75, "N", "Hooks, captions, thumbnail ideas — पूरा plan, minutes में।",
                       "Hooks, captions, thumbnail ideas — poora plan, minutes mein."),
    # 6 LAUNCH DISASTER (50-60): 53.00-54.00 total silence, the drop lands on 54.00 with "Relax."
    (50.0, 53.0, "N", "[tense] और फिर... launch day। सब कुछ... crash!", "Aur phir... launch day. Sab kuch... crash!"),
    (54.0, 55.25, "U", "[calm, cool] Relax, yaar.", "Relax, yaar."),
    (55.25, 59.75, "N", "[excited] Dot ने सब संभाल लिया — status check, fix list, और team update का draft!",
                       "Dot ne sab sambhaal liya — status check, fix list, aur team update ka draft!"),
    # 7 CONNECTED WORLD (60-70)
    (60.0, 64.5, "N", "[excited] और ये काम करता है वहीं — ChatGPT, Slack और Teams में!",
                      "Aur ye kaam karta hai wahin — ChatGPT, Slack aur Teams mein!"),
    (64.5, 68.5, "N", "हज़ारों apps से connected। एक message, और काम शुरू!",
                      "Hazaaron apps se connected. Ek message, aur kaam shuru!"),
    (68.5, 70.0, "U", "[smug] हो गया, boss!", "Ho gaya, boss!"),
    # 8 WHILE YOU WERE SLEEPING (70-80)
    (70.0, 72.0, "N", "[softly] और जब आप सो रहे होते हो...", "Aur jab aap so rahe hote ho..."),
    (72.0, 73.5, "G", "[excited whisper] Research time!", "Research time!"),
    (73.5, 79.75, "N", "Dot research करता है — connected apps सिर्फ़ read-only। ना कुछ भेजता, ना बदलता।",
                       "Dot research karta hai — connected apps sirf read-only. Na kuch bhejta, na badalta."),
    # 9 WHO'S THE BOSS (80-90)
    (80.0, 83.0, "N", "[confident] पर असली boss कौन? आप!", "Par asli boss kaun? Aap!"),
    (83.0, 84.5, "B", "[mischievous] Send दबा दूँ?", "Send daba doon?"),
    (84.75, 89.75, "N", "बड़े काम से पहले Dot पूछता है। आपके approval rules, आपका control।",
                        "Bade kaam se pehle Dot poochhta hai. Aapke approval rules, aapka control."),
    # 10 GIFT OF TIME + CTA (90-96)
    (90.0, 92.75, "N", "[warm] To-do list खत्म। Time... वापस आपका।", "To-do list khatam. Time... wapas aapka."),
    (92.75, 96.0, "N", "[excited] Comment करो Dots, और Tech पे Trek को follow करो!",
                       "Comment karo DOTS, aur Tech pe Trek ko follow karo!"),
]

SCENES = [(0, 10, "monster"), (10, 20, "legends"), (20, 30, "workshop"), (30, 40, "bughunt"), (40, 50, "meltdown"),
          (50, 60, "launch"), (60, 70, "connected"), (70, 80, "sleeping"), (80, 90, "boss"), (90, 96, "gift")]
SILENCE = (53.0, 54.0)     # the launch-disaster freeze: true silence, then the drop
VO_END = {len(LINES) - 1: 95.85}
LANGUAGE = "hi"
DURATION = 96.0
BPM = 120.0
