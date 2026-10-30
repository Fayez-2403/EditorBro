"""Grok Bot reel (58.000 s, 9:16, 60 fps, 120 BPM), Hinglish narration (user, 2026-10-19). One line per chapter; each line
starts at its chapter's start. SPOKEN is what the voice reads (Hindi in Devanagari so it is pronounced natively, English
words in English); DISPLAY is the same words in Roman Hinglish for the on-screen captions (no Hindi script on screen),
word for word. Voiced by ElevenLabs "Liam" (eleven_v3, language hi); the [tags] steer the delivery and are never spoken
or stored. Claims: projects/grok-bot-reel/FACTS.md.
"""

# (chapter start s, chapter end s, spoken, display)
LINES = [
    (0.0, 2.0, "[excited] Bro — छह AI bots, एक पूरी team!",
               "Bro — chhe AI bots, ek poori team!"),
    (2.0, 6.0, "[excited] और ये सिर्फ़ chat नहीं करते — ये काम करते हैं!",
               "Aur ye sirf chat nahi karte — ye kaam karte hain!"),
    (6.0, 12.0, "[enthusiastic] Meet Grok Bot. हर teammate को एक काम दो, और देखो आपकी digital crew कैसे ज़िंदा हो जाती है।",
                "Meet Grok Bot. Har teammate ko ek kaam do, aur dekho aapki digital crew kaise zinda ho jaati hai."),
    (12.0, 18.0, "[excited] एक research ढूँढता है। एक context लाता है। और एक सब कुछ content में बदल देता है।",
                 "Ek research dhoondhta hai. Ek context laata hai. Aur ek sab kuch content mein badal deta hai."),
    (18.0, 24.0, "[playful] अब देखो मेरा version — bots stations के बीच दौड़ते हैं, tasks pass करते हैं, बिल्कुल real production team की तरह।",
                 "Ab dekho mera version — bots stations ke beech daudte hain, tasks pass karte hain, bilkul real production team ki tarah."),
    (24.0, 30.0, "[excited] ये parallel में काम करते हैं, तो आपका idea बन जाता है drafts, visuals और एक finished brief।",
                 "Ye parallel mein kaam karte hain, toh aapka idea ban jaata hai drafts, visuals aur ek finished brief."),
    (30.0, 36.0, "[curious] एक बार workflow दिखाओ, और Bot उसे routine बनाकर save कर लेता है — अगली बार के लिए।",
                 "Ek baar workflow dikhao, aur Bot use routine banakar save kar leta hai — agli baar ke liye."),
    (36.0, 42.0, "[confident] ये आपके apps और websites use करते हैं, एक shared cloud computer पर — और context आगे साथ चलता है।",
                 "Ye aapke apps aur websites use karte hain, ek shared cloud computer par — aur context aage saath chalta hai."),
    (42.0, 48.0, "[calm] और जब कुछ sensitive हो, जिसमें आपका approval चाहिए? Team रुकती है, और आपसे पूछती है।",
                 "Aur jab kuch sensitive ho, jismein aapka approval chahiye? Team rukti hai, aur aapse poochhti hai."),
    (48.0, 54.0, "[excited] ना endless copy-paste। बस एक crew — research, creation, review, और finished काम आपके हाथ में।",
                 "Na endless copy-paste. Bas ek crew — research, creation, review, aur finished kaam aapke haath mein."),
    (54.0, 58.0, "[cheeky] ये है Grok Bot। Build के लिए comment करो BOT!",
                 "Ye hai Grok Bot. Build ke liye comment karo BOT!"),
]

# A line may run a little past its visual chapter (timing only; the visual cut stays on the grid).
VO_END = {0: 2.55}
# Line 8 waits out the 42.00-42.25 s total silence (the approval pattern interrupt).
VO_LEAD = {8: 0.32}

LANGUAGE = "hi"
DURATION = 58.0
BPM = 120.0
