"""v2 (user, 2026-10-21): two WHATs only, the music lower under the voice, every reveal slides straight into the next as its
narration ends (no ember / chessboard / rip / field-line / heartbeat intros, no numbered insert frames), "ye playable" cut,
the thread scrolled one post at a time with no motion ghosts; 76 s. v1 (the 94 s cut) is script_reveals_v1.py.

WHATTT?! 5 Claude project reveals (projects/claude-reveals): a 94 s 9:16 reel on the six projects in @claudeai's
2026-10-16 thread. The script is final (user, 2026-10-21). Hinglish narration (Liam, Turbo v2.5 + Hindi); the actor's
reactions are separate short Liam takes on eleven_v3. The actor is real stock footage (Mixkit, Stock Video Free License,
the 516xx series: one actor), chosen 2026-10-21 because the user asked for free tools only. Every project clip is the
creator's original video, played at 1.0x. Claims: projects/claude-reveals/FACTS.md.

The chapters follow the brief's times exactly (all on the 120 BPM grid). Each line starts at its `at` time; the voice
script checks it ends before the next one. SPOKEN is what the voice reads (Devanagari Hindi, English words in English,
model numbers spelled "five-point-five" so they are read as English, 120 as एक सौ बीस joined by
no-break spaces so it stays one word); DISPLAY is the same words in Roman Hinglish for the
captions and the SRT, word for word.
"""

BPM = 120.0
BEAT = 60 / BPM          # 0.5 s
BAR = 4 * BEAT           # 2.0 s
DURATION = 76.0

# (name, start, end): the brief's sections
CHAPTERS = [
    ("hook", 0.0, 4.0), ("posted", 4.0, 14.5), ("r1", 14.5, 26.0), ("r2", 26.0, 33.5), ("r3", 33.5, 47.0),
    ("r4", 47.0, 57.0), ("r5", 57.0, 69.0), ("final", 69.0, 76.0),
]
# The slides between panels (start, end): the post -> 01 -> 02 -> 03 font -> 03 haiku -> 04 -> 05. Each starts as a line ends.
PANS = [(14.0, 14.5), (25.5, 26.0), (33.0, 33.5), (41.0, 41.5), (46.5, 47.0), (56.5, 57.0)]

# Narrator lines: (key, chapter, at, spoken, display)
LINES = [
    ("posted", "posted", 4.25,
     "Claude ने अभी share किए six projects, जो लोगों ने Claude से बनाए। कुछ wild experiments, कुछ सच में काम के tools. और trust me, last दो तो next level हैं।",
     "Claude ne abhi share kiye six projects, jo logon ne Claude se banaye. Kuch wild experiments, kuch sach mein kaam ke tools. Aur trust me, last do toh next level hain."),
    ("r1", "r1", 14.5,
     "Number one. एक wildfire analysis prototype: आग time के साथ कैसे फैलती है, वो map करता है, और hot spots track करता है। बना है Opus five-point-five से।",
     "Number one. Ek wildfire analysis prototype: aag time ke saath kaise failti hai, wo map karta hai, aur hot spots track karta hai. Bana hai Opus 5.5 se."),
    ("r2", "r2", 26.0,
     "Number two. Chess, जो लगता है जैसे किसी ने school notebook में doodle किया हो। Sonnet five-point-five से बना।",
     "Number two. Chess, jo lagta hai jaise kisi ne school notebook mein doodle kiya ho. Sonnet 5.5 se bana."),
    ("r3a", "r3", 33.5,
     "Number three. एक creator ने अपने एक सौ बीस handwritten pages को एक working font बना दिया, Opus five-point-five के साथ।",
     "Number three. Ek creator ne apne 120 handwritten pages ko ek working font bana diya, Opus 5.5 ke saath."),
    ("r3b", "r3", 41.5,
     "और Haiku five-point-five ने बीस haiku लिखे, फिर हर frame JavaScript में draw किया।",
     "Aur Haiku 5.5 ne bees haiku likhe, phir har frame JavaScript mein draw kiya."),
    ("r4", "r4", 47.0,
     "Number four. एक electromagnetic field, जिसे आप देख भी सकते हो, और push भी कर सकते हो। Claude Opus five-point-five से बना।",
     "Number four. Ek electromagnetic field, jise aap dekh bhi sakte ho, aur push bhi kar sakte ho. Claude Opus 5.5 se bana."),
    ("r5a", "r5", 57.0,
     "और number five... एक cardiology fellow ने three-D tool बनाया, जो trainees को coronary angiograms पढ़ना सिखाता है।",
     "Aur number five... ek cardiology fellow ne 3D tool banaya, jo trainees ko coronary angiograms padhna sikhata hai."),
    ("r5b", "r5", 63.5,
     "Notebook games से... medical education तक। ये है range.",
     "Notebook games se... medical education tak. Ye hai range."),
    ("cta", "final", 69.5,
     "Six real builds. Five reveals. एक सवाल: आप Claude से क्या बनाओगे?",
     "Six real builds. Five reveals. Ek sawaal: aap Claude se kya banaoge?"),
]

# The actor's reactions (one short eleven_v3 take each, audio tags for the delivery): (key, at, spoken, display)
ACTOR = [
    ("what1", 0.0, "[shocked] What?!", "WHAT?!"),
    ("what3", 1.25, "[screaming] WHAAAAAAAAT?!", "WHAAAAAATTTTT?!"),
    ("noway", 54.75, "[whispering] No. Way.", "No. Way."),
]

VOICE = {"model": "eleven_turbo_v2_5", "language": "hi", "stability": 0.45, "speed": 1.12}
ACTOR_VOICE = {"model": "eleven_v3", "language": "en", "stability": 0.0}

# Source excerpts (projects/claude-reveals/references/source, the creators' originals): key -> (file, in, out, fps)
# fps: the rate the frames are stored at (variable-rate sources go to a constant 60 by timestamp: still 1.0x).
CLIPS = {
    "A": ("A_wildfire_dilumsanjaya.mp4", 1.0, 12.5, 60),     # v1
    "A2": ("A_wildfire_dilumsanjaya.mp4", 1.0, 13.0, 60),    # v2: on screen 14.0-26.0 s
    "B": ("B_chess_kevin_t_ngo.mp4", 7.5, 17.6, 60),
    "C1": ("C_font_harshpreet931.mp4", 5.5, 9.0, 30),
    "C2": ("C_font_harshpreet931.mp4", 41.5, 47.0, 30),
    "D": ("D_emfield_thebuggeddev.mp4", 5.0, 16.0, 60),
    "E": ("E_angioview_annasrahmanmd.mp4", 0.0, 12.45, 60),
    "F": ("F_haiku_kevin_t_ngo.mp4", 20.0, 26.6, 30),
}
# Collage loops (small tiles, 0-17 s and the monitor): key -> (file, in, out)
LOOPS = {
    "A": ("A_wildfire_dilumsanjaya.mp4", 3.0, 9.0), "B": ("B_chess_kevin_t_ngo.mp4", 8.0, 14.0),
    "C": ("C_font_harshpreet931.mp4", 41.5, 47.5), "D": ("D_emfield_thebuggeddev.mp4", 62.0, 68.0),
    "E": ("E_angioview_annasrahmanmd.mp4", 2.0, 8.0), "F": ("F_haiku_kevin_t_ngo.mp4", 20.0, 26.0),
}
# The actor (references/stock/free720, Mixkit Free License, 23.976 fps): key -> (file, in, out, keyed)
ACTOR_SHOTS = {
    "monitor": ("mixkit_51602.mp4", 3.0, 8.0, True),     # side view at his green-screen monitor (the collage plays on it)
    "mouth": ("mixkit_51611.mp4", 1.5, 10.0, False),     # grins to camera (2-3.5 s), hand over his mouth (6-9 s)
    "headset": ("mixkit_51610.mp4", 2.5, 9.5, False),    # grabs his headset, then talks to the screen
    "celebrate": ("mixkit_51612.mp4", 4.0, 7.2, False),  # flings his arms out (the jump, frozen at the peak)
    "stare": ("mixkit_51607.mp4", 2.0, 6.0, False),      # frozen stare at the screen
    "smile": ("mixkit_51606.mp4", 9.5, 14.5, False),     # the smile
}

# Fixed choreography marks (s, on the grid), shared by the score, the cue sheet and the scene.
MARKS = {
    "hit1": 0.0, "zoom2": 1.0, "hit3": 1.25, "drop": 2.5, "boing": 2.75, "land": 3.5, "dive": 3.5, "post.in": 4.0,
    "pan.r1": 14.0, "pan.r2": 25.5, "pan.r3": 33.0, "pan.r3b": 41.0, "pan.r4": 46.5, "pan.r5": 56.5, "r3.turn": 36.5,
    "fin.impact": 69.0, "fin.cuts": 70.5, "fin.smile": 71.0, "fin.cta": 72.75, "fin.hit": 75.0,
}
CARDS = [14.5, 26.0, 33.5, 47.0, 57.0]   # a soft sting as each reveal lands (01 -> 05, a little bigger each time)

CREDITS = {
    "A": ("Dilum Sanjaya", "@DilumSanjaya"), "B": ("Kevin Ngo", "@kevin_t_ngo"), "C": ("Harshpreet Singh", "@harshpreet931"),
    "D": ("The Bugged Dev", "@thebuggeddev"), "E": ("Annas Rahman, MD", "@AnnasRahmanMD"), "F": ("Kevin Ngo", "@kevin_t_ngo"),
}
